package iuh.se.kltn.backend.modules.interaction.service;

import iuh.se.kltn.backend.modules.contract.entity.Contract;
import iuh.se.kltn.backend.modules.contract.repository.ContractRepository;
import iuh.se.kltn.backend.modules.interaction.dto.request.ReviewRequest;
import iuh.se.kltn.backend.modules.interaction.dto.response.ReviewResponse;
import iuh.se.kltn.backend.modules.interaction.entity.Review;
import iuh.se.kltn.backend.modules.interaction.enums.NotificationType;
import iuh.se.kltn.backend.modules.interaction.repository.ReviewRepository;
import iuh.se.kltn.backend.modules.user.entity.User;
import iuh.se.kltn.backend.modules.user.repository.UserRepository;
import jakarta.transaction.Transactional;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class ReviewService {

    private final ReviewRepository reviewRepo;
    private final ContractRepository contractRepo;
    private final UserRepository userRepo;
    private final NotificationService notificationService;
    private final iuh.se.kltn.backend.modules.user.service.ReputationService reputationService;

    @Transactional
    public ReviewResponse createReview(ReviewRequest request, String username) {
        User reviewer = userRepo.findByUsername(username)
                .orElseThrow(() -> new RuntimeException("Không tìm thấy user"));

        Contract contract = contractRepo.findById(request.getContractId())
                .orElseThrow(() -> new RuntimeException("Không tìm thấy hợp đồng"));

        // 1. CHẶN: Chỉ người thuê trong hợp đồng mới được review
        if (!contract.getTenant().getUsername().equals(username)) {
            throw new RuntimeException("Bạn không có quyền đánh giá hợp đồng này vì bạn không phải người thuê.");
        }

        // 2. CHẶN: Hợp đồng phải đang Active hoặc Expired mới được review
        if (contract.getStatus().name().equals("PENDING_SIGNATURE") || contract.getStatus().name().equals("CANCELLED")) {
            throw new RuntimeException("Chỉ có thể đánh giá khi hợp đồng đã có hiệu lực.");
        }

        // 3. CHẶN: Chỉ cho phép review 1 lần trên 1 hợp đồng
        if (reviewRepo.existsByContractAndReviewer(contract, reviewer)) {
            throw new RuntimeException("Bạn đã đánh giá hợp đồng này rồi.");
        }

        // ✅ Lấy thông tin Chủ nhà thông qua Room -> Property
        User landlord = contract.getRoom().getProperty().getLandlord();

        // 4. Bắt đầu tạo Review
        Review review = new Review();
        review.setContract(contract);
        review.setReviewer(reviewer);
        review.setTarget(landlord); // Người bị đánh giá là Chủ nhà
        review.setRating(request.getRating());
        review.setComment(request.getComment());

        Review savedReview = reviewRepo.save(review);

        // 4.5. Điểm uy tín
        reputationService.processPoints(reviewer, iuh.se.kltn.backend.modules.user.enums.ReputationAction.REVIEW_SUBMITTED, 2, "Gửi đánh giá hợp đồng thành công");
        if (request.getRating() >= 4) {
            reputationService.processPoints(landlord, iuh.se.kltn.backend.modules.user.enums.ReputationAction.GOOD_REVIEW_RECEIVED, 3, "Nhận được đánh giá tích cực từ khách thuê");
        }

        // 5. TỰ ĐỘNG BẮN THÔNG BÁO CHO CHỦ NHÀ
        String title = "Bạn có một đánh giá mới!";
        String message = String.format("Khách hàng %s vừa để lại đánh giá %d sao cho phòng %s.",
                reviewer.getFullName(), request.getRating(), contract.getRoom().getName());

        notificationService.createNotification(
                landlord, // Gửi cho Chủ nhà
                title,
                message,
                NotificationType.NEW_REVIEW,
                contract.getRoom().getProperty().getId() // Link về xem khu trọ của mình
        );

        return mapToResponse(savedReview);
    }

    // Lấy toàn bộ Review của một chủ nhà (để hiển thị trên trang Chi tiết khu trọ)
    @org.springframework.transaction.annotation.Transactional(readOnly = true)
    public List<ReviewResponse> getReviewsByLandlord(Long landlordId) {
        return reviewRepo.findByTargetIdOrderByCreatedAtDesc(landlordId)
                .stream()
                .map(this::mapToResponse)
                .collect(Collectors.toList());
    }

    private ReviewResponse mapToResponse(Review review) {
        return new ReviewResponse(
                review.getId(),
                review.getContract().getId(),
                review.getContract().getRoom().getName(),
                review.getReviewer().getId(),
                review.getReviewer().getFullName(),
                review.getReviewer().getAvatarUrl(), // Sẽ null nếu user chưa có avatar
                review.getRating(),
                review.getComment(),
                review.getCreatedAt()
        );
    }
    @org.springframework.transaction.annotation.Transactional(readOnly = true)
    public List<ReviewResponse> getReviewsByProperty(Long propertyId) {
        return reviewRepo.findByContract_Room_Property_IdOrderByCreatedAtDesc(propertyId)
                .stream()
                .map(this::mapToResponse) // Gọi lại hàm mapToResponse bạn đã có
                .collect(Collectors.toList());
    }
}
package iuh.se.kltn.backend.modules.user.controller;

import iuh.se.kltn.backend.common.enums.Role;
import iuh.se.kltn.backend.common.security.UserPrincipal;
import iuh.se.kltn.backend.common.service.CloudinaryService;
import iuh.se.kltn.backend.common.service.OcrService;
import iuh.se.kltn.backend.modules.user.dto.request.UpdateProfileRequest;
import iuh.se.kltn.backend.modules.user.dto.response.UserHistoryResponse;
import iuh.se.kltn.backend.modules.user.dto.response.UserProfileResponse;
import iuh.se.kltn.backend.modules.user.dto.response.UserRe;
import iuh.se.kltn.backend.modules.user.entity.CustomRevisionEntity;
import iuh.se.kltn.backend.modules.user.entity.User;
import iuh.se.kltn.backend.modules.user.repository.ReputationHistoryRepository;
import iuh.se.kltn.backend.modules.user.dto.response.ReputationHistoryResponse;
import iuh.se.kltn.backend.modules.user.repository.UserRepository;
import iuh.se.kltn.backend.modules.user.service.UserService;
import jakarta.persistence.EntityManager;
import org.springframework.transaction.annotation.Transactional;
import org.hibernate.envers.AuditReader;
import org.hibernate.envers.AuditReaderFactory;
import org.hibernate.envers.query.AuditEntity;
import org.modelmapper.ModelMapper;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.time.Instant;
import java.time.LocalDateTime;
import java.time.ZoneId;
import java.util.Comparator;
import java.util.List;
import java.util.Optional;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/users")
public class UserController {

    @Autowired
    private UserService userService;
    @Autowired
    private UserRepository userRepository;

    @Autowired
    private ReputationHistoryRepository reputationHistoryRepository;

    @Autowired
    private CloudinaryService cloudinaryService;

    @Autowired
    private OcrService ocrService;

    @Autowired
    private EntityManager entityManager;

    @Autowired
    private ModelMapper modelMapper;


    @GetMapping("/me")
    public ResponseEntity<UserProfileResponse> getCurrentUser(@AuthenticationPrincipal UserPrincipal currentUser) {
        UserProfileResponse userProfile = userService.getUserProfile(currentUser.getId());
        return ResponseEntity.ok(userProfile);
    }

    @GetMapping("/me/reputation-history")
    public ResponseEntity<List<ReputationHistoryResponse>> getReputationHistory(@AuthenticationPrincipal UserPrincipal currentUser) {
        List<ReputationHistoryResponse> history = reputationHistoryRepository.findByUserIdOrderByCreatedAtDesc(currentUser.getId())
                .stream()
                .map(item -> new ReputationHistoryResponse(
                        item.getId(),
                        item.getUser().getId(),
                        item.getActionType().name(),
                        item.getPointsChanged(),
                        item.getDescription(),
                        item.getCreatedAt()
                ))
                .collect(Collectors.toList());
        return ResponseEntity.ok(history);
    }
    @GetMapping("/username")
    public UserRe findByUsername(String username) {
        User user = userRepository.findByUsername(username)
                .orElseThrow(() -> new RuntimeException("User not found"));

        if (user.isLocked() && user.getLockUntil() != null) {
            if (user.getLockUntil().isBefore(LocalDateTime.now())) {
                user.setLocked(false);
                user.setLockUntil(null);
                user.setLockReason(null);
                userRepository.save(user);
            }
        }

        return modelMapper.map(user, UserRe.class);
    }

    @PutMapping("/profile")
    public ResponseEntity<UserProfileResponse> updateProfile(
            @AuthenticationPrincipal UserPrincipal currentUser,
            @RequestBody UpdateProfileRequest request) {

        UserProfileResponse response = userService.updateUserProfile(currentUser.getId(), request);
        return ResponseEntity.ok(response);
    }

    @PutMapping("/wallet")
    public ResponseEntity<?> updateWallet(@AuthenticationPrincipal UserPrincipal currentUser,
                                          @RequestParam String address) {
        userService.updateWalletAddress(currentUser.getId(), address);
        return ResponseEntity.ok("Cập nhật ví thành công!");
    }

    @PostMapping(value = "/avatar", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<?> uploadAvatar(
            @AuthenticationPrincipal UserPrincipal currentUser,
            @RequestParam("file") MultipartFile file) {

        try {
            if (file.isEmpty()) {
                return ResponseEntity.badRequest().body("File không được để trống");
            }

            // ✅ SỬA LỖI TẠI ĐÂY: Dùng hàm uploadAvatar đã định nghĩa trong CloudinaryService
            String avatarUrl = cloudinaryService.uploadAvatar(file);

            userService.updateAvatar(currentUser.getId(), avatarUrl);

            return ResponseEntity.ok(avatarUrl);

        } catch (IOException e) {
            return ResponseEntity.internalServerError().body("Lỗi upload ảnh: " + e.getMessage());
        }
    }

    @PostMapping(value = "/qr", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<?> uploadQr(
            @AuthenticationPrincipal UserPrincipal currentUser,
            @RequestParam("file") MultipartFile file) {
        try {
            if (file.isEmpty()) {
                return ResponseEntity.badRequest().body("File không được để trống");
            }
            String qrUrl = cloudinaryService.uploadImage(file, "smart-rental/qr");
            return ResponseEntity.ok(qrUrl);
        } catch (IOException e) {
            return ResponseEntity.internalServerError().body("Lỗi upload ảnh QR: " + e.getMessage());
        }
    }

    @PostMapping(value = "/kyc", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<?> submitKYC(
            @AuthenticationPrincipal UserPrincipal currentUser,
            @RequestParam("cccdNumber") String cccdNumber,
            @RequestParam("frontImage") MultipartFile frontImage,
            @RequestParam("backImage") MultipartFile backImage) {

        try {
            System.out.println("Đang gửi ảnh sang FPT.AI...");
            String extractedId = ocrService.extractIdNumber(frontImage);
            System.out.println("AI đọc được: " + extractedId);
            System.out.println("User nhập: " + cccdNumber);

            boolean isAutoVerified = false;
            if (extractedId != null && extractedId.equals(cccdNumber)) {
                isAutoVerified = true;
            }

            // ✅ SỬA LỖI TẠI ĐÂY: Truyền thêm tham số folderName ("smart-rental/kyc")
            String frontUrl = cloudinaryService.uploadImage(frontImage, "smart-rental/kyc");
            String backUrl = cloudinaryService.uploadImage(backImage, "smart-rental/kyc");

            userService.submitKYC(currentUser.getId(), cccdNumber, frontUrl, backUrl, isAutoVerified);

            if (isAutoVerified) {
                return ResponseEntity.ok("Xác thực danh tính thành công! (Duyệt tự động)");
            } else {
                return ResponseEntity.ok("Hồ sơ đã gửi. Hệ thống đang chờ Admin duyệt thủ công (Do ảnh mờ hoặc không khớp).");
            }

        } catch (Exception e) {
            return ResponseEntity.internalServerError().body("Lỗi xử lý: " + e.getMessage());
        }
    }

    @GetMapping("/by-role")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<List<UserProfileResponse>> getUsersByRole(
            @RequestParam Role role,
            @AuthenticationPrincipal UserPrincipal currentUser) {
        List<UserProfileResponse> users = userService.getAllByRole(role);
        return ResponseEntity.ok(users);
    }
    @Transactional
    @PostMapping("/{userId}/lock")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<?> lockUser(
            @PathVariable Long userId,
            @RequestParam int durationDays,
            @RequestParam List<String> reason,
            @AuthenticationPrincipal UserPrincipal admin) {

        // Có thể thêm validation
        if (durationDays <= 0) {
            return ResponseEntity.badRequest().body("Số ngày khóa phải lớn hơn 0");
        }
        if (reason == null) {
            return ResponseEntity.badRequest().body("Vui lòng cung cấp lý do khóa tài khoản");
        }

        userService.lockUserTemporary(userId, durationDays, reason);

        return ResponseEntity.ok(String.format("Tài khoản ID %d đã bị khóa %d ngày. Lý do: %s",
                userId, durationDays, reason));
    }

    @Transactional
    @PostMapping("/{userId}/unlock")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<?> unlockUser(@PathVariable Long userId) {
        userService.unlockUser(userId);
        return ResponseEntity.ok("Đã mở khóa tài khoản ID " + userId);
    }
    @GetMapping("/{userId}/history")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<List<UserHistoryResponse>> getUserAuditHistory(@PathVariable Long userId) {

        AuditReader auditReader = AuditReaderFactory.get(entityManager);

        @SuppressWarnings("unchecked")
        List<Object[]> revisions = auditReader.createQuery()
                .forRevisionsOfEntity(User.class, false, true)  // true = selectEntitiesOnly, true = selectDeletedEntities
                .add(AuditEntity.id().eq(userId))
                .getResultList();

        List<UserHistoryResponse> history = revisions.stream()
                .map(row -> {
                    User auditedUser = (User) row[0];                // phần tử 0: entity ở revision đó
                    CustomRevisionEntity revInfo = (CustomRevisionEntity) row[1];  // phần tử 1: CustomRevisionEntity

                    UserHistoryResponse dto = modelMapper.map(auditedUser, UserHistoryResponse.class);

                    if (revInfo != null) {
                        dto.setModifiedBy(revInfo.getModifiedBy());
                        dto.setModifiedByFullName(revInfo.getModifiedByFullName());

                        // Chuyển timestamp (millis since epoch) sang LocalDateTime
                        Instant instant = Instant.ofEpochMilli(revInfo.getTimestamp());
                        LocalDateTime modifiedAt = LocalDateTime.ofInstant(instant, ZoneId.systemDefault());
                        // Hoặc dùng múi giờ VN: ZoneId.of("Asia/Ho_Chi_Minh")
                        dto.setModifiedAt(modifiedAt);

                        dto.setAuditRemark(revInfo.getAuditRemark());
                    }

                    return dto;
                })
                .collect(Collectors.toList());

         history.sort(Comparator.comparing(UserHistoryResponse::getModifiedAt).reversed());

        return ResponseEntity.ok(history);
    }
    @GetMapping("/userId")
    public Optional<User> findById(String username){
        return userRepository.findByUsername(username);
    }
}
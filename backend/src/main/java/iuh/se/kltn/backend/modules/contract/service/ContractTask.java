package iuh.se.kltn.backend.modules.contract.service;

import iuh.se.kltn.backend.modules.contract.entity.ContractChangeRequest;
import iuh.se.kltn.backend.modules.contract.enums.RequestStatus;
import iuh.se.kltn.backend.modules.contract.repository.ContractChangeRequestRepository;
import iuh.se.kltn.backend.modules.user.entity.User;
import iuh.se.kltn.backend.modules.user.enums.ReputationAction;
import iuh.se.kltn.backend.modules.user.service.ReputationService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;

@Component
@RequiredArgsConstructor
@Slf4j
public class ContractTask {

    private final ContractChangeRequestRepository requestRepository;
    private final ReputationService reputationService;
    private final iuh.se.kltn.backend.modules.user.service.EmailService emailService;

    /**
     * ✅ Tự động quét và gửi mail nhắc nhở trước khi hết hạn 24h
     * Chạy mỗi giờ một lần
     */
    @Scheduled(cron = "0 30 * * * *") // Chạy vào phút 30 hàng giờ
    @Transactional
    public void sendChangeRequestReminders() {
        log.info("⏰ [Task] Bắt đầu quét gửi mail nhắc nhở yêu cầu thay đổi...");
        
        // Ngưỡng nhắc nhở: còn dưới 24h nữa là hết hạn
        LocalDateTime threshold = LocalDateTime.now().plusHours(24);
        
        List<ContractChangeRequest> pendingReminders = requestRepository.findAllByStatusAndReminderSentFalseAndExpiryDateBefore(
                RequestStatus.PENDING, threshold);

        for (ContractChangeRequest req : pendingReminders) {
            try {
                User initiator = "TENANT".equals(req.getRequestedByRole()) 
                        ? req.getContract().getTenant() 
                        : req.getContract().getRoom().getProperty().getLandlord();
                
                User receiver = "TENANT".equals(req.getRequestedByRole()) 
                        ? req.getContract().getRoom().getProperty().getLandlord() 
                        : req.getContract().getTenant();

                String typeLabel = iuh.se.kltn.backend.modules.contract.enums.RequestType.RENT_INCREASE.equals(req.getType()) ? "Điều chỉnh giá thuê"
                                 : iuh.se.kltn.backend.modules.contract.enums.RequestType.EXTENSION.equals(req.getType()) ? "Gia hạn hợp đồng"
                                 : iuh.se.kltn.backend.modules.contract.enums.RequestType.TERMINATION.equals(req.getType()) ? "Chấm dứt sớm"
                                 : "Thay đổi điều khoản";

                emailService.sendContractChangeRequestAlert(
                    receiver.getEmail(),
                    receiver.getFullName(),
                    initiator.getFullName(),
                    req.getContract().getRoom().getName(),
                    typeLabel,
                    req.getExpiryDate().format(java.time.format.DateTimeFormatter.ofPattern("HH:mm dd/MM/yyyy"))
                );

                req.setReminderSent(true);
                requestRepository.save(req);
                log.info("📧 Đã gửi mail nhắc nhở cho yêu cầu #{}", req.getId());
                
            } catch (Exception e) {
                log.error("❌ Lỗi khi gửi mail nhắc nhở cho yêu cầu #{}: {}", req.getId(), e.getMessage());
            }
        }
    }

    /**
     * ✅ Tự động quét và đóng các yêu cầu chỉnh sửa hợp đồng đã quá hạn (72h)
     * Chạy mỗi giờ một lần
     */
    @Scheduled(cron = "0 0 * * * *")
    @Transactional
    public void scanExpiredChangeRequests() {
        log.info("⏰ [Task] Bắt đầu quét các yêu cầu chỉnh sửa hợp đồng hết hạn...");
        
        List<ContractChangeRequest> expiredRequests = requestRepository.findAllByStatusAndExpiryDateBefore(
                RequestStatus.PENDING, LocalDateTime.now());

        if (expiredRequests.isEmpty()) {
            return;
        }

        for (ContractChangeRequest req : expiredRequests) {
            log.warn("⚠️ Yêu cầu #{} của hợp đồng #{} đã hết hạn.", req.getId(), req.getContract().getId());
            
            // 1. Cập nhật trạng thái
            req.setStatus(RequestStatus.REJECTED); // Hoặc EXPIRED nếu bạn có enum đó, ở đây dùng REJECTED cho đơn giản
            requestRepository.save(req);

            // 2. Xác định người bị phạt (là người nhận yêu cầu nhưng không phản hồi)
            User violator = "TENANT".equals(req.getRequestedByRole()) 
                    ? req.getContract().getRoom().getProperty().getLandlord() 
                    : req.getContract().getTenant();

            // 3. Trừ điểm uy tín
            reputationService.processPoints(
                    violator, 
                    ReputationAction.NO_RESPONSE_TO_PROPOSAL, 
                    -5, 
                    "Không phản hồi đề xuất chỉnh sửa hợp đồng (#" + req.getContract().getId() + ") đúng hạn (72h)"
            );
        }

        log.info("✅ Đã xử lý xong {} yêu cầu hết hạn.", expiredRequests.size());
    }
}

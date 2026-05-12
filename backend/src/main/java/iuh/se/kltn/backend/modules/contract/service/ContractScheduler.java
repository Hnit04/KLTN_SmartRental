package iuh.se.kltn.backend.modules.contract.service;

import iuh.se.kltn.backend.modules.contract.entity.Contract;
import iuh.se.kltn.backend.modules.contract.enums.ContractStatus;
import iuh.se.kltn.backend.modules.contract.repository.ContractRepository;
import iuh.se.kltn.backend.modules.property.entity.Room;
import iuh.se.kltn.backend.modules.property.enums.RoomStatus;
import iuh.se.kltn.backend.modules.property.repository.RoomRepository;
import org.springframework.beans.factory.annotation.Autowired;
import net.javacrumbs.shedlock.spring.annotation.SchedulerLock;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;

@Service
public class ContractScheduler {

    @Autowired
    private ContractRepository contractRepository;

    @Autowired
    private RoomRepository roomRepository;

    @Autowired
    private iuh.se.kltn.backend.modules.user.service.ReputationService reputationService;

    @Autowired
    private iuh.se.kltn.backend.modules.interaction.service.NotificationService notificationService;

    // Chạy mỗi giờ (cron: giây phút giờ ngày tháng thứ)
    @Scheduled(cron = "0 0 * * * *")
    @SchedulerLock(name = "cancel_expired_pending", lockAtMostFor = "30m", lockAtLeastFor = "5m")
    @Transactional
    public void cancelExpiredPendingContracts() {
        // Lấy hợp đồng PENDING_SIGNATURE quá 24h
        LocalDateTime threshold = LocalDateTime.now().minusHours(24);
        List<Contract> expiredContracts = contractRepository.findByStatusAndCreatedAtBefore(ContractStatus.PENDING_SIGNATURE, threshold);

        for (Contract contract : expiredContracts) {
            // Cập nhật trạng thái hợp đồng thành EXPIRED (hoặc CANCELLED nếu bạn có enum CANCELLED)
            // Trong ContractStatus đang có EXPIRED
            contract.setStatus(ContractStatus.EXPIRED);
            // 💰 Hợp đồng chưa ký bị hủy → Hoàn cọc (nếu đã đặt)
            contract.setDepositStatus(iuh.se.kltn.backend.modules.contract.enums.DepositStatus.REFUNDED);
            contractRepository.save(contract);

            // 🛡️ Vá lỗ hổng: Chỉ nhả phòng nếu không còn hợp đồng nào khác đang sống
            Room room = contract.getRoom();
            if (room != null && room.getStatus() == RoomStatus.RESERVED) {
                boolean hasOtherLive = contractRepository.existsOtherLiveContract(room.getId(), contract.getId());
                if (!hasOtherLive) {
                    room.setStatus(RoomStatus.AVAILABLE);
                    roomRepository.save(room);
                }
            }

            // Thông báo cho cả 2 bên
            notificationService.createNotification(contract.getTenant(), "Hợp đồng bị hủy", 
                "Hợp đồng phòng " + (room != null ? room.getName() : "") + " đã bị hủy tự động do quá hạn 24h không thực hiện ký kết.", 
                iuh.se.kltn.backend.modules.interaction.enums.NotificationType.CONTRACT_UPDATE, contract.getId());
            
            if (room != null) {
                notificationService.createNotification(room.getProperty().getLandlord(), "Hợp đồng bị hủy", 
                    "Hợp đồng phòng " + room.getName() + " đã bị hủy tự động do khách không ký sau 24h. Phòng đã được nhả về trạng thái Trống.", 
                    iuh.se.kltn.backend.modules.interaction.enums.NotificationType.CONTRACT_UPDATE, contract.getId());
            }
        }
        
        if (!expiredContracts.isEmpty()) {
            System.out.println("Đã hủy tự động " + expiredContracts.size() + " hợp đồng chưa ký quá hạn 24h.");
        }
    }

    // Tự động hủy hợp đồng TRỄ NẠP CỌC (Quá 24h kể từ khi cả 2 bên ký)
    @Scheduled(cron = "0 30 * * * *") // Chạy mỗi giờ tại phút 30
    @SchedulerLock(name = "cancel_expired_deposits", lockAtMostFor = "30m", lockAtLeastFor = "5m")
    @Transactional
    public void cancelExpiredAwaitingDepositContracts() {
        LocalDateTime threshold = LocalDateTime.now().minusHours(24);
        // Lưu ý: Cần đảm bảo trong DB có lưu thời điểm chuyển sang AWAITING_DEPOSIT 
        // hoặc dùng signDate (đã được set trong signContract)
        List<Contract> stuckContracts = contractRepository.findByStatusAndSignDateBefore(ContractStatus.AWAITING_DEPOSIT, threshold);

        for (Contract contract : stuckContracts) {
            contract.setStatus(ContractStatus.EXPIRED);
            contract.setDepositStatus(iuh.se.kltn.backend.modules.contract.enums.DepositStatus.UNPAID);
            contractRepository.save(contract);

            // 🛡️ Vá lỗ hổng: Chỉ nhả phòng nếu không còn hợp đồng nào khác đang sống
            Room room = contract.getRoom();
            if (room != null) {
                boolean hasOtherLive = contractRepository.existsOtherLiveContract(room.getId(), contract.getId());
                if (!hasOtherLive) {
                    room.setStatus(RoomStatus.AVAILABLE);
                    roomRepository.save(room);
                }
            }

            // Trừ điểm uy tín khách thuê
            reputationService.processPoints(contract.getTenant(), 
                iuh.se.kltn.backend.modules.user.enums.ReputationAction.SMART_CONTRACT_PENALTY, 
                -10, "Hợp đồng bị hủy tự động do quá 24h không thực hiện nạp cọc (#" + contract.getId() + ")");

            // Thông báo cho cả 2 bên
            notificationService.createNotification(contract.getTenant(), "Hợp đồng bị hủy", 
                "Hợp đồng phòng " + (room != null ? room.getName() : "") + " đã bị hủy tự động do quá hạn 24h nạp cọc. Bạn bị trừ 10 điểm uy tín.", 
                iuh.se.kltn.backend.modules.interaction.enums.NotificationType.CONTRACT_UPDATE, contract.getId());
            
            if (room != null) {
                notificationService.createNotification(room.getProperty().getLandlord(), "Hợp đồng bị hủy", 
                    "Hợp đồng phòng " + room.getName() + " đã bị hủy tự động do khách không nạp cọc sau 24h. Phòng đã được nhả về trạng thái Trống.", 
                    iuh.se.kltn.backend.modules.interaction.enums.NotificationType.CONTRACT_UPDATE, contract.getId());
            }
        }

        if (!stuckContracts.isEmpty()) {
            System.out.println("Đã hủy tự động " + stuckContracts.size() + " hợp đồng trễ nạp cọc.");
        }
    }
    // Chạy hàng ngày lúc 01:00 sáng
    @Scheduled(cron = "0 0 1 * * ?")
    @SchedulerLock(name = "expire_active_contracts", lockAtMostFor = "30m", lockAtLeastFor = "5m")
    @Transactional
    public void expireActiveContracts() {
        java.time.LocalDate today = java.time.LocalDate.now();
        List<Contract> expiredContracts = contractRepository.findByStatusAndEndDateBefore(ContractStatus.ACTIVE, today);
        
        for (Contract contract : expiredContracts) {
            contract.setStatus(ContractStatus.EXPIRED); // Hoàn thành hợp đồng
            // 💰 Hết hạn tự nhiên → Hoàn cọc cho khách thuê
            contract.setDepositStatus(iuh.se.kltn.backend.modules.contract.enums.DepositStatus.REFUNDED);
            contractRepository.save(contract);
            
            // 🛡️ Vá lỗ hổng: Kiểm tra Pre-booking trước khi nhả phòng
            Room room = contract.getRoom();
            if (room != null && room.getStatus() != RoomStatus.AVAILABLE) {
                boolean hasOtherLive = contractRepository.existsOtherLiveContract(room.getId(), contract.getId());
                if (hasOtherLive) {
                    // Có Pre-booking → giữ phòng RESERVED (hoặc RENTED nếu Pre-booking đã ACTIVE)
                    room.setStatus(RoomStatus.RESERVED);
                } else {
                    room.setStatus(RoomStatus.AVAILABLE);
                }
                roomRepository.save(room);
            }

            // Thông báo hết hạn hợp đồng
            notificationService.createNotification(contract.getTenant(), "Hợp đồng hết hạn", 
                "Hợp đồng thuê phòng " + (room != null ? room.getName() : "") + " của bạn đã kết thúc thành công. Vui lòng bàn giao phòng.", 
                iuh.se.kltn.backend.modules.interaction.enums.NotificationType.CONTRACT_UPDATE, contract.getId());
            
            if (room != null) {
                notificationService.createNotification(room.getProperty().getLandlord(), "Hợp đồng hết hạn", 
                    "Hợp đồng thuê phòng " + room.getName() + " với khách " + contract.getTenant().getFullName() + " đã kết thúc hôm nay.", 
                    iuh.se.kltn.backend.modules.interaction.enums.NotificationType.CONTRACT_UPDATE, contract.getId());
            }
        }
        
        if (!expiredContracts.isEmpty()) {
            System.out.println("Đã kết thúc tự động " + expiredContracts.size() + " hợp đồng hết hạn.");
        }
    }

    // 🔔 NHẮC NHỞ GIA HẠN HỢP ĐỒNG (Chạy hàng ngày lúc 8h sáng)
    @Scheduled(cron = "0 0 8 * * ?")
    @SchedulerLock(name = "send_renewal_reminders", lockAtMostFor = "30m", lockAtLeastFor = "5m")
    @Transactional
    public void sendRenewalReminders() {
        java.time.LocalDate today = java.time.LocalDate.now();
        java.time.LocalDate in30Days = today.plusDays(30);

        // Lấy hợp đồng ACTIVE sắp hết hạn trong 30 ngày
        List<Contract> soonExpiring = contractRepository.findByStatusAndEndDateBefore(ContractStatus.ACTIVE, in30Days.plusDays(1));
        
        for (Contract contract : soonExpiring) {
            if (contract.getEndDate() == null) continue;
            long daysLeft = java.time.temporal.ChronoUnit.DAYS.between(today, contract.getEndDate());
            
            // Chỉ gửi thông báo cho 2 mốc: đúng 30 ngày và đúng 15 ngày
            if (daysLeft == 30) {
                notificationService.createNotification(contract.getTenant(),
                    "Nhắc nhở gia hạn hợp đồng",
                    "Hợp đồng phòng " + contract.getRoom().getName() + " sẽ hết hạn sau 30 ngày (" + contract.getEndDate() + "). Vui lòng liên hệ chủ trọ để gia hạn nếu muốn ở tiếp.",
                    iuh.se.kltn.backend.modules.interaction.enums.NotificationType.CONTRACT_UPDATE, contract.getId());
            } else if (daysLeft == 15) {
                notificationService.createNotification(contract.getTenant(),
                    "⚠️ Cảnh báo: Phòng sẽ được mở đặt trước",
                    "Hợp đồng phòng " + contract.getRoom().getName() + " chỉ còn 15 ngày. Từ bây giờ người khác có thể đặt trước phòng này. Nếu bạn muốn ở tiếp, hãy gia hạn ngay.",
                    iuh.se.kltn.backend.modules.interaction.enums.NotificationType.CONTRACT_UPDATE, contract.getId());
                
                // Thông báo chủ trọ
                notificationService.createNotification(contract.getRoom().getProperty().getLandlord(),
                    "Phòng sắp trống: " + contract.getRoom().getName(),
                    "Hợp đồng phòng " + contract.getRoom().getName() + " của khách " + contract.getTenant().getFullName() + " sẽ hết hạn sau 15 ngày (" + contract.getEndDate() + "). Phòng đã được mở cho người khác đặt trước.",
                    iuh.se.kltn.backend.modules.interaction.enums.NotificationType.CONTRACT_UPDATE, contract.getId());
            }
        }
    }
}

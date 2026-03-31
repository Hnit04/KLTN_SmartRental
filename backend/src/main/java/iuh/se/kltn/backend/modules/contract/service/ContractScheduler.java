package iuh.se.kltn.backend.modules.contract.service;

import iuh.se.kltn.backend.modules.contract.entity.Contract;
import iuh.se.kltn.backend.modules.contract.enums.ContractStatus;
import iuh.se.kltn.backend.modules.contract.repository.ContractRepository;
import iuh.se.kltn.backend.modules.property.entity.Room;
import iuh.se.kltn.backend.modules.property.enums.RoomStatus;
import iuh.se.kltn.backend.modules.property.repository.RoomRepository;
import org.springframework.beans.factory.annotation.Autowired;
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

    // Chạy mỗi giờ (cron: giây phút giờ ngày tháng thứ)
    @Scheduled(cron = "0 0 * * * *")
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

            // Nhả phòng về AVAILABLE
            Room room = contract.getRoom();
            if (room != null && room.getStatus() == RoomStatus.RESERVED) {
                room.setStatus(RoomStatus.AVAILABLE);
                roomRepository.save(room);
            }
        }
        
        if (!expiredContracts.isEmpty()) {
            System.out.println("Đã hủy tự động " + expiredContracts.size() + " hợp đồng quá hạn 24h.");
        }
    }
    // Chạy hàng ngày lúc 01:00 sáng
    @Scheduled(cron = "0 0 1 * * ?")
    @Transactional
    public void expireActiveContracts() {
        java.time.LocalDate today = java.time.LocalDate.now();
        List<Contract> expiredContracts = contractRepository.findByStatusAndEndDateBefore(ContractStatus.ACTIVE, today);
        
        for (Contract contract : expiredContracts) {
            contract.setStatus(ContractStatus.EXPIRED); // Hoàn thành hợp đồng
            // 💰 Hết hạn tự nhiên → Hoàn cọc cho khách thuê
            contract.setDepositStatus(iuh.se.kltn.backend.modules.contract.enums.DepositStatus.REFUNDED);
            contractRepository.save(contract);
            
            // Xử lý nhả phòng trống cho hệ thống
            Room room = contract.getRoom();
            if (room != null && room.getStatus() != RoomStatus.AVAILABLE) {
                room.setStatus(RoomStatus.AVAILABLE);
                roomRepository.save(room);
            }
        }
        
        if (!expiredContracts.isEmpty()) {
            System.out.println("Đã kết thúc tự động " + expiredContracts.size() + " hợp đồng hết hạn.");
        }
    }
}

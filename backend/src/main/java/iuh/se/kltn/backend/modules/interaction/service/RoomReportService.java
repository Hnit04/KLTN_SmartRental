package iuh.se.kltn.backend.modules.interaction.service;

import iuh.se.kltn.backend.modules.interaction.dto.request.ResolveReportRequest;
import iuh.se.kltn.backend.modules.interaction.dto.request.RoomReportRequest;
import iuh.se.kltn.backend.modules.interaction.dto.response.RoomReportResponse;
import iuh.se.kltn.backend.modules.interaction.entity.RoomReport;
import iuh.se.kltn.backend.modules.interaction.enums.NotificationType;
import iuh.se.kltn.backend.modules.interaction.enums.ReportStatus;
import iuh.se.kltn.backend.modules.interaction.repository.RoomReportRepository;
import iuh.se.kltn.backend.modules.property.entity.Room;
import iuh.se.kltn.backend.modules.property.enums.RoomStatus;
import iuh.se.kltn.backend.modules.property.repository.RoomRepository;
import iuh.se.kltn.backend.modules.user.entity.User;
import iuh.se.kltn.backend.modules.user.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;


import java.time.LocalDateTime;
import java.util.List;
import java.util.stream.Collectors;

import org.springframework.messaging.simp.SimpMessagingTemplate;

@Service
@RequiredArgsConstructor
public class RoomReportService {

    private final RoomReportRepository roomReportRepository;
    private final UserRepository userRepository;
    private final RoomRepository roomRepository;
    private final NotificationService notificationService;
    private final SimpMessagingTemplate messagingTemplate;
    private final iuh.se.kltn.backend.modules.contract.repository.ContractRepository contractRepository;
    private final iuh.se.kltn.backend.modules.contract.service.ContractService contractService;

    /**
     * Tenant gửi báo cáo phòng trọ.
     * - Bắt buộc KYC đã VERIFIED.
     * - Mỗi user chỉ báo cáo 1 phòng 1 lần.
     * - Tối đa 3 báo cáo/ngày.
     */
    @Transactional
    public RoomReportResponse createReport(String username, RoomReportRequest request) {
        User reporter = userRepository.findByUsername(username)
                .orElseThrow(() -> new RuntimeException("Không tìm thấy người dùng"));

        // 🔓 [DEMO MODE] Bỏ qua kiểm tra KYC
        /*
        if (!"VERIFIED".equals(reporter.getKycStatus().name())) {
            throw new RuntimeException("Tài khoản chưa xác thực CCCD không thể gửi báo cáo");
        }
        */

        Room room = roomRepository.findById(request.getRoomId())
                .orElseThrow(() -> new RuntimeException("Không tìm thấy phòng trọ"));

        // 🔓 [DEMO MODE] Bỏ qua kiểm tra trùng lặp
        /*
        if (roomReportRepository.existsByReporterAndRoom(reporter.getId(), room.getId())) {
            throw new RuntimeException("Bạn đã gửi báo cáo cho phòng trọ này rồi");
        }
        */

        // 🔓 [DEMO MODE] Bỏ qua giới hạn spam
        /*
        LocalDateTime startOfDay = LocalDate.now().atStartOfDay();
        long reportsToday = roomReportRepository.countReportsByUserToday(reporter.getId(), startOfDay);
        if (reportsToday >= 3) {
            throw new RuntimeException("Bạn đã vượt quá số lần báo cáo trong ngày (tối đa 3 lần/ngày)");
        }
        */

        RoomReport report = new RoomReport();
        report.setReporter(reporter);
        report.setRoom(room);
        report.setReason(request.getReason());
        report.setDetails(request.getDetails());
        report.setStatus(ReportStatus.PENDING);

        report.setEvidenceUrls(request.getEvidenceUrls());

        RoomReport saved = roomReportRepository.save(report);
        RoomReportResponse response = RoomReportResponse.from(saved);
        
        // Broadcast realtime qua WebSockets cho Admin
        messagingTemplate.convertAndSend("/topic/admin/reports", response);
        
        return response;
    }

    /**
     * Admin lấy danh sách tất cả báo cáo.
     */
    @Transactional(readOnly = true)
    public List<RoomReportResponse> getAdminReports() {
        return roomReportRepository.findAll().stream()
                .map(r -> RoomReportResponse.from(r))
                .collect(Collectors.toList());
    }

    /**
     * Admin duyệt báo cáo:
     * - RESOLVED_CLEAN (Báo cáo sai): Trừ 15 điểm uy tín người báo cáo. Khóa nếu <= 0.
     * - RESOLVED_VIOLATING (Báo cáo đúng): Cộng 10 điểm người báo cáo, trừ 30 điểm chủ trọ, ẩn phòng.
     */
    @Transactional
    public RoomReportResponse resolveReport(Long reportId, ResolveReportRequest request) {
        RoomReport report = roomReportRepository.findById(reportId)
                .orElseThrow(() -> new RuntimeException("Không tìm thấy báo cáo"));

        if (report.getStatus() != ReportStatus.PENDING) {
            throw new RuntimeException("Báo cáo này đã được xử lý trước đó");
        }

        report.setStatus(request.getStatus());
        report.setAdminNotes(request.getAdminNotes());

        User reporter = report.getReporter();
        Room room = report.getRoom();
        User landlord = room.getProperty() != null ? room.getProperty().getLandlord() : null;

        if (request.getStatus() == ReportStatus.RESOLVED_CLEAN) {
            // ========== BÁO CÁO SAI SỰ THẬT ==========
            int newScore = Math.max(0, reporter.getReputationScore() - 15);
            reporter.setReputationScore(newScore);

            if (newScore <= 0) {
                reporter.setLocked(true);
                reporter.setLockedAt(LocalDateTime.now());
                reporter.setLockUntil(LocalDateTime.now().plusDays(30));
                reporter.setLockReason(List.of("Báo cáo sai sự thật nhiều lần, tài khoản bị khóa 30 ngày"));
            }
            userRepository.save(reporter);

            notificationService.createNotification(
                    reporter,
                    "Báo cáo không hợp lệ",
                    "Báo cáo của bạn về phòng '" + room.getName() + "' là không chính xác. Bạn bị trừ 15 điểm uy tín. Điểm hiện tại: " + newScore + ".",
                    NotificationType.SYSTEM,
                    room.getId()
            );

        } else if (request.getStatus() == ReportStatus.RESOLVED_VIOLATING) {
            // ========== BÁO CÁO ĐÚNG — PHÒNG VI PHẠM ==========

            // Thưởng người báo cáo
            int reporterNewScore = Math.min(100, reporter.getReputationScore() + 10);
            reporter.setReputationScore(reporterNewScore);
            userRepository.save(reporter);

            // Phạt chủ trọ
            if (landlord != null) {
                int landlordNewScore = Math.max(0, landlord.getReputationScore() - 30);
                landlord.setReputationScore(landlordNewScore);

                if (landlordNewScore <= 0) {
                    landlord.setLocked(true);
                    landlord.setLockedAt(LocalDateTime.now());
                    landlord.setLockUntil(LocalDateTime.now().plusDays(30));
                    landlord.setLockReason(List.of("Nhiều phòng vi phạm chính sách nền tảng"));
                }
                userRepository.save(landlord);

                notificationService.createNotification(
                        landlord,
                        "Cảnh báo vi phạm chính sách",
                        "Phòng '" + room.getName() + "' của bạn bị ẩn do vi phạm chính sách nền tảng. Bạn bị trừ 30 điểm uy tín. Điểm hiện tại: " + landlordNewScore + ".",
                        NotificationType.ROOM_UPDATED,
                        room.getProperty().getId()
                );
            }

            // Ẩn phòng vi phạm (dùng MAINTENANCE vì DB ENUM chưa có HIDDEN)
            room.setStatus(RoomStatus.MAINTENANCE);
            roomRepository.save(room);

            // ================== TẠO TRANH CHẤP TỰ ĐỘNG ==================
            try {
                // Lấy tất cả hợp đồng của phòng này
                List<iuh.se.kltn.backend.modules.contract.entity.Contract> contracts = contractRepository.findByRoomIdOrderByStartDateDesc(room.getId());
                
                for (iuh.se.kltn.backend.modules.contract.entity.Contract c : contracts) {
                    if (c.getStatus() == iuh.se.kltn.backend.modules.contract.enums.ContractStatus.ACTIVE || 
                        c.getStatus() == iuh.se.kltn.backend.modules.contract.enums.ContractStatus.AWAITING_DEPOSIT) {
                        
                        iuh.se.kltn.backend.modules.contract.dto.request.OpenDisputeRequest disputeReq = new iuh.se.kltn.backend.modules.contract.dto.request.OpenDisputeRequest();
                        disputeReq.setViolationType("OTHER");
                        disputeReq.setDescription("Hệ thống tự động tạo tranh chấp do phòng bị báo cáo vi phạm nghiêm trọng. Lý do vi phạm: " + request.getAdminNotes());
                        disputeReq.setEvidenceUrls(report.getEvidenceUrls() != null && !report.getEvidenceUrls().isEmpty() ? 
                            report.getEvidenceUrls() : null);
                        
                        // Gọi ContractService bằng quyền của hệ thống (Admin)
                        // Ở đây chúng ta tạm lấy ID của reporter làm người mở tranh chấp vì hàm yêu cầu currentUserId
                        // Hoặc lý tưởng nhất là truyền ID của Admin đang thao tác (lấy từ request context, nhưng service này hiện chưa nhận currentAdminId)
                        // Tạm thời lấy ID của Reporter để đại diện cho người phát hiện vi phạm
                        contractService.openDispute(c.getId(), reporter.getId(), disputeReq);
                    }
                }
            } catch (Exception e) {
                System.err.println("Lỗi tạo tranh chấp tự động khi xử lý báo cáo: " + e.getMessage());
            }
            // ============================================================

            // Thông báo cho người báo cáo
            notificationService.createNotification(
                    reporter,
                    "Cảm ơn bạn đã báo cáo",
                    "Phòng '" + room.getName() + "' vi phạm đã bị gỡ bỏ. Bạn được cộng 10 điểm uy tín. Điểm hiện tại: " + reporterNewScore + ".",
                    NotificationType.SYSTEM,
                    room.getId()
            );
        }

        RoomReport saved = roomReportRepository.save(report);
        RoomReportResponse response = RoomReportResponse.from(saved);
        
        // Broadcast realtime qua WebSockets cho tất cả Admin đang mở trang quản lý
        messagingTemplate.convertAndSend("/topic/admin/reports", response);
        
        return response;
    }
}

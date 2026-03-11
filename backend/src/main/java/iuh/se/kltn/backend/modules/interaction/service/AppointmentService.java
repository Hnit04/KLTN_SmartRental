package iuh.se.kltn.backend.modules.interaction.service;

import iuh.se.kltn.backend.modules.interaction.dto.request.AppointmentRequest;
import iuh.se.kltn.backend.modules.interaction.dto.response.AppointmentResponse;
import iuh.se.kltn.backend.modules.interaction.entity.Appointment;
import iuh.se.kltn.backend.modules.interaction.enums.AppointmentStatus;
import iuh.se.kltn.backend.modules.interaction.enums.NotificationType; // ✅ Import type thông báo
import iuh.se.kltn.backend.modules.interaction.repository.AppointmentRepository;
import iuh.se.kltn.backend.modules.property.entity.Room;
import iuh.se.kltn.backend.modules.property.repository.RoomRepository;
import iuh.se.kltn.backend.modules.user.entity.Tenant;
import iuh.se.kltn.backend.modules.user.entity.User;
import iuh.se.kltn.backend.modules.user.repository.UserRepository;
import jakarta.transaction.Transactional;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.time.format.DateTimeFormatter;
import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class AppointmentService {
    private final AppointmentRepository appointmentRepo;
    private final RoomRepository roomRepo;
    private final UserRepository userRepo;

    // ✅ 1. INJECT NOTIFICATION SERVICE
    private final NotificationService notificationService;

    @Transactional
    public AppointmentResponse createAppointment(AppointmentRequest request, String username) {
        User user = userRepo.findByUsername(username)
                .orElseThrow(() -> new RuntimeException("Không tìm thấy user: " + username));

        Tenant tenant = (Tenant) user;
        Room room = roomRepo.findById(request.getRoomId())
                .orElseThrow(() -> new RuntimeException("Không tìm thấy phòng"));

        Appointment appointment = new Appointment();
        appointment.setTenant(tenant);
        appointment.setRoom(room);
        appointment.setLandlord(room.getProperty().getLandlord());
        appointment.setMeetTime(request.getMeetTime());
        appointment.setNote(request.getNote());
        appointment.setMeetingLink(request.getMeetingLink());
        appointment.setStatus(AppointmentStatus.PENDING);

        Appointment saved = appointmentRepo.save(appointment);

        // (Tùy chọn) Gửi thông báo cho Chủ nhà khi có khách đặt lịch
        notificationService.createNotification(
                room.getProperty().getLandlord(),
                "Yêu cầu xem phòng mới",
                "Khách hàng " + tenant.getFullName() + " vừa đặt lịch xem phòng " + room.getName(),
                NotificationType.SYSTEM,
                room.getProperty().getId() // Dẫn về trang chi tiết khu trọ
        );

        return mapToResponse(saved);
    }

    public List<AppointmentResponse> getPendingAppointmentsByLandlord(Long landlordId) {
        List<Appointment> appointments = appointmentRepo.findByLandlordIdAndStatus(landlordId, AppointmentStatus.PENDING);

        return appointments.stream()
                .map(this::mapToResponse)
                .collect(Collectors.toList());
    }

    @Transactional
    public void updateAppointmentStatus(Long id, AppointmentStatus status, String username) {
        Appointment appointment = appointmentRepo.findById(id)
                .orElseThrow(() -> new RuntimeException("Không tìm thấy lịch hẹn"));

        // Kiểm tra xem người đang thao tác có đúng là chủ trọ của lịch hẹn này không
        if (!appointment.getLandlord().getUsername().equals(username)) {
            throw new RuntimeException("Bạn không có quyền cập nhật lịch hẹn này");
        }

        // Cập nhật trạng thái
        appointment.setStatus(status);
        appointmentRepo.save(appointment);

        // --- GỬI THÔNG BÁO CHO KHÁCH THUÊ ---
        String title = "Cập nhật lịch hẹn xem phòng";
        String message = "";

        // Format lại thời gian cho đẹp (VD: 14:30 20/10/2026)
        DateTimeFormatter formatter = DateTimeFormatter.ofPattern("HH:mm dd/MM/yyyy");
        String timeStr = appointment.getMeetTime() != null ? appointment.getMeetTime().format(formatter) : "";

        // ✅ SỬA LẠI CHỖ NÀY: Dùng trực tiếp Enum CONFIRMED và CANCELLED
        if (status == AppointmentStatus.CONFIRMED) {
            message = String.format("Chủ nhà đã DUYỆT lịch hẹn xem phòng %s vào lúc %s. Vui lòng đến đúng giờ nhé!",
                    appointment.getRoom().getName(), timeStr);
        } else if (status == AppointmentStatus.CANCELLED) {
            message = String.format("Tiếc quá! Chủ nhà đã TỪ CHỐI lịch hẹn xem phòng %s của bạn.",
                    appointment.getRoom().getName());
        }

        // Bắn thông báo xuống DB
        if (!message.isEmpty()) {
            notificationService.createNotification(
                    appointment.getTenant(), // Gửi cho Khách thuê
                    title,
                    message,
                    NotificationType.SYSTEM, // Loại thông báo hệ thống
                    appointment.getRoom().getProperty().getId() // Dẫn Khách về lại trang chi tiết khu trọ
            );
        }
    }

    private AppointmentResponse mapToResponse(Appointment appointment) {
        return new AppointmentResponse(
                appointment.getId(),
                appointment.getRoom().getId(),
                appointment.getRoom().getName(),
                appointment.getLandlord().getId(),
                appointment.getLandlord().getFullName(),
                appointment.getTenant().getId(),
                appointment.getTenant().getFullName(),
                appointment.getTenant().getPhoneNumber(),
                appointment.getMeetTime(),
                appointment.getStatus(),
                appointment.getNote(),
                appointment.getMeetingLink(),
                appointment.getCreatedAt()
        );
    }
}
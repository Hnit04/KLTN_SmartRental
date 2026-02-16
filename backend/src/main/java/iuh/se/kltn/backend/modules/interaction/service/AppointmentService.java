package iuh.se.kltn.backend.modules.interaction.service;

import iuh.se.kltn.backend.modules.interaction.dto.request.AppointmentRequest;
import iuh.se.kltn.backend.modules.interaction.dto.response.AppointmentResponse;
import iuh.se.kltn.backend.modules.interaction.entity.Appointment;
import iuh.se.kltn.backend.modules.interaction.enums.AppointmentStatus;
import iuh.se.kltn.backend.modules.interaction.repository.AppointmentRepository;
import iuh.se.kltn.backend.modules.property.entity.Room;
import iuh.se.kltn.backend.modules.property.repository.RoomRepository;
import iuh.se.kltn.backend.modules.user.entity.Tenant;
import iuh.se.kltn.backend.modules.user.entity.User;
import iuh.se.kltn.backend.modules.user.repository.UserRepository;
import jakarta.transaction.Transactional;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class AppointmentService {
    private final AppointmentRepository appointmentRepo;
    private final RoomRepository roomRepo;
    private final UserRepository userRepo;

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

        return mapToResponse(saved); // Dùng chung hàm map cho gọn
    }

    public List<AppointmentResponse> getPendingAppointmentsByLandlord(Long landlordId) {
        List<Appointment> appointments = appointmentRepo.findByLandlordIdAndStatus(landlordId, AppointmentStatus.PENDING);

        return appointments.stream()
                .map(this::mapToResponse)
                .collect(Collectors.toList());
    }

    // ✅ THÊM HÀM NÀY ĐỂ DUYỆT / TỪ CHỐI LỊCH HẸN
    @Transactional
    public void updateAppointmentStatus(Long id, AppointmentStatus status, String username) {
        Appointment appointment = appointmentRepo.findById(id)
                .orElseThrow(() -> new RuntimeException("Không tìm thấy lịch hẹn"));

        // Kiểm tra xem người đang thao tác có đúng là chủ trọ của lịch hẹn này không
        if (!appointment.getLandlord().getUsername().equals(username)) {
            throw new RuntimeException("Bạn không có quyền cập nhật lịch hẹn này");
        }

        appointment.setStatus(status);
        appointmentRepo.save(appointment);
    }

    // ✅ SỬA HÀM NÀY ĐỂ TRẢ VỀ THÊM THÔNG TIN TENANT
    private AppointmentResponse mapToResponse(Appointment appointment) {
        return new AppointmentResponse(
                appointment.getId(),
                appointment.getRoom().getId(),
                appointment.getRoom().getName(),
                appointment.getLandlord().getId(),
                appointment.getLandlord().getFullName(),
                appointment.getTenant().getId(),             // Thêm Tenant ID
                appointment.getTenant().getFullName(),       // Thêm Tenant Name
                appointment.getTenant().getPhoneNumber(),    // Thêm Tenant Phone (Lấy từ class cha User)
                appointment.getMeetTime(),
                appointment.getStatus(),
                appointment.getNote(),
                appointment.getMeetingLink(),
                appointment.getCreatedAt()
        );
    }
}
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

        return new AppointmentResponse(
                saved.getId(),
                saved.getRoom().getId(),
                saved.getRoom().getName(),
                saved.getLandlord().getId(),
                saved.getLandlord().getFullName(),
                saved.getMeetTime(),
                saved.getStatus(),
                saved.getNote(),
                saved.getMeetingLink(),
                saved.getCreatedAt()
        );
    }
}
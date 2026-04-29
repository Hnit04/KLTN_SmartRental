package iuh.se.kltn.backend.modules.interaction.service;

import iuh.se.kltn.backend.modules.interaction.entity.Appointment;
import iuh.se.kltn.backend.modules.interaction.enums.AppointmentStatus;
import iuh.se.kltn.backend.modules.interaction.repository.AppointmentRepository;
import iuh.se.kltn.backend.modules.user.service.EmailService;
import lombok.RequiredArgsConstructor;
import org.springframework.context.event.EventListener;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

import java.time.LocalDateTime;

import java.util.List;

@Component
@RequiredArgsConstructor
public class AppointmentReminderScheduler {
    private final AppointmentRepository appointmentRepo;
    private final EmailService emailService;

    // Chạy định kỳ mỗi 2 tiếng
    @Scheduled(cron = "0 0 */2 * * *")
    public void scheduledScan() {
        performScan();
    }

    // Chạy NGAY LẬP TỨC khi ứng dụng vừa khởi động xong
    @EventListener(org.springframework.boot.context.event.ApplicationReadyEvent.class)
    public void runNowOnStartup() {
        System.out.println("Hệ thống khởi động: Bắt đầu quét lịch hẹn ngay...");
        performScan();
    }

    // Tách logic quét ra một hàm riêng để dùng chung
    private void performScan() {
        LocalDateTime now = LocalDateTime.now();
        LocalDateTime threshold = now.plusHours(24);

        List<Appointment> appointments = appointmentRepo.findUpcomingAppointments(
                now,
                threshold,
                AppointmentStatus.CONFIRMED,
                false);

        for (Appointment app : appointments) {
            try {
                // Logic gửi mail nhắc hẹn
                emailService.sendAppointmentReminder(
                        app.getTenant().getEmail(),
                        app.getTenant().getFullName(),
                        app.getRoom().getName(),
                        app.getMeetTime().toString(),
                        app.getLandlord().getFullName()
                );

                app.setReminderSent(true);
                appointmentRepo.save(app);
            } catch (Exception e) {
                System.err.println("Lỗi quét khởi động cho ID " + app.getId() + ": " + e.getMessage());
            }
        }
    }
}
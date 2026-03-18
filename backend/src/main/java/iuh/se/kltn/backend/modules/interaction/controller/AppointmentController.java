package iuh.se.kltn.backend.modules.interaction.controller;

import iuh.se.kltn.backend.modules.interaction.dto.request.AppointmentRequest;
import iuh.se.kltn.backend.modules.interaction.dto.response.AppointmentResponse;
import iuh.se.kltn.backend.modules.interaction.enums.AppointmentStatus; // Nhớ import enum
import iuh.se.kltn.backend.modules.interaction.service.AppointmentService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.security.Principal;
import java.util.List;
import java.util.Map; // Import Map

@RestController
@RequestMapping("/api/appointments")
@RequiredArgsConstructor
public class AppointmentController {
    private final AppointmentService appointmentService;

    @PostMapping
    public ResponseEntity<?> createAppointment(@RequestBody AppointmentRequest request, Principal principal) {
        AppointmentResponse response = appointmentService.createAppointment(request, principal.getName());
        return ResponseEntity.ok(response);
    }

    // ✅ Tenant xem danh sách lịch hẹn của chính mình
    @GetMapping("/mine")
    public ResponseEntity<List<AppointmentResponse>> getMyAppointments(Principal principal) {
        List<AppointmentResponse> appointments = appointmentService.getMyAppointments(principal.getName());
        return ResponseEntity.ok(appointments);
    }

    // ✅ Chủ trọ xem TẤT CẢ lịch hẹn (mọi trạng thái)
    @GetMapping("/my-appointments")
    public ResponseEntity<List<AppointmentResponse>> getAllByLandlord(Principal principal) {
        List<AppointmentResponse> appointments = appointmentService.getAllByLandlord(principal.getName());
        return ResponseEntity.ok(appointments);
    }

    @GetMapping("/landlord/{landlordId}/pending")
    public ResponseEntity<List<AppointmentResponse>> getPendingAppointments(@PathVariable Long landlordId) {
        List<AppointmentResponse> appointments = appointmentService.getPendingAppointmentsByLandlord(landlordId);

        if (appointments.isEmpty()) {
            return ResponseEntity.ok(java.util.Collections.emptyList());
        }

        return ResponseEntity.ok(appointments);
    }

    // ✅ THÊM API CẬP NHẬT TRẠNG THÁI (DUYỆT/TỪ CHỐI)
    @PutMapping("/{id}/status")
    public ResponseEntity<?> updateStatus(
            @PathVariable Long id,
            @RequestBody Map<String, String> request,
            Principal principal) {
        try {
            AppointmentStatus status = AppointmentStatus.valueOf(request.get("status"));
            appointmentService.updateAppointmentStatus(id, status, principal.getName());
            return ResponseEntity.ok().body(Map.of("message", "Cập nhật trạng thái thành công"));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(Map.of("message", "Trạng thái không hợp lệ"));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("message", e.getMessage()));
        }
    }
}
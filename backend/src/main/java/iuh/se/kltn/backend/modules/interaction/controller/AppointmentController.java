package iuh.se.kltn.backend.modules.interaction.controller;

import iuh.se.kltn.backend.modules.interaction.dto.request.AppointmentRequest;
import iuh.se.kltn.backend.modules.interaction.dto.request.AppointmentStatusUpdateRequest;
import iuh.se.kltn.backend.modules.interaction.dto.response.AppointmentResponse;
import iuh.se.kltn.backend.modules.interaction.enums.AppointmentStatus;
import iuh.se.kltn.backend.modules.interaction.service.AppointmentService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.*;

import java.security.Principal;
import java.util.List;
import java.util.Locale;

@RestController
@RequestMapping("/api/appointments")
@RequiredArgsConstructor
@Validated
public class AppointmentController {
    private final AppointmentService appointmentService;

    @PostMapping
    public ResponseEntity<?> createAppointment(@Valid @RequestBody AppointmentRequest request, Principal principal) {
        AppointmentResponse response = appointmentService.createAppointment(request, principal.getName());
        return ResponseEntity.ok(response);
    }

    @GetMapping("/mine")
    public ResponseEntity<List<AppointmentResponse>> getMyAppointments(Principal principal) {
        List<AppointmentResponse> appointments = appointmentService.getMyAppointments(principal.getName());
        return ResponseEntity.ok(appointments);
    }

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

    @PutMapping("/{id}/status")
    public ResponseEntity<?> updateStatus(
            @PathVariable Long id,
            @Valid @RequestBody AppointmentStatusUpdateRequest request,
            Principal principal) {
        try {
            String statusRaw = request != null ? request.getStatus() : null;
            if (statusRaw == null || statusRaw.isBlank()) {
                return ResponseEntity.badRequest().body(java.util.Map.of("message", "status is required"));
            }

            AppointmentStatus status = AppointmentStatus.valueOf(statusRaw.trim().toUpperCase(Locale.ROOT));
            appointmentService.updateAppointmentStatus(id, status, principal.getName());
            return ResponseEntity.ok().body(java.util.Map.of("message", "Update status successfully"));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(java.util.Map.of("message", "Invalid status"));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(java.util.Map.of("message", e.getMessage()));
        }
    }
}

package iuh.se.kltn.backend.modules.interaction.controller;

import iuh.se.kltn.backend.modules.interaction.dto.request.AppointmentRequest;
import iuh.se.kltn.backend.modules.interaction.dto.response.AppointmentResponse;
import iuh.se.kltn.backend.modules.interaction.entity.Appointment;
import iuh.se.kltn.backend.modules.interaction.service.AppointmentService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.security.Principal;
import java.util.List;

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


    @GetMapping("/landlord/{landlordId}/pending")
    public ResponseEntity<List<AppointmentResponse>> getPendingAppointments(@PathVariable Long landlordId) {
        List<AppointmentResponse> appointments = appointmentService.getPendingAppointmentsByLandlord(landlordId);

        if (appointments.isEmpty()) {
            return ResponseEntity.noContent().build();
        }

        return ResponseEntity.ok(appointments);
    }

}
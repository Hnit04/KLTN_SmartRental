package iuh.se.kltn.backend.modules.interaction.controller;

import iuh.se.kltn.backend.modules.interaction.dto.request.AppointmentRequest;
import iuh.se.kltn.backend.modules.interaction.dto.response.AppointmentResponse;
import iuh.se.kltn.backend.modules.interaction.service.AppointmentService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.security.Principal;

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

}
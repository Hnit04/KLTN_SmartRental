package iuh.se.kltn.backend.modules.contract.controller;

import iuh.se.kltn.backend.modules.contract.entity.ResidentRequest;
import iuh.se.kltn.backend.modules.contract.enums.RequestStatus;
import iuh.se.kltn.backend.modules.contract.service.ResidentRequestService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/resident-requests")
public class ResidentRequestController {
    @Autowired private ResidentRequestService residentRequestService;

    @PostMapping
    public ResponseEntity<?> create(@RequestBody ResidentRequest request) {
        return ResponseEntity.ok(residentRequestService.createRequest(request));
    }

    @PatchMapping("/{id}/status")
    public ResponseEntity<?> updateStatus(@PathVariable Long id, @RequestParam RequestStatus status) {
        return ResponseEntity.ok(residentRequestService.updateStatus(id, status));
    }
}
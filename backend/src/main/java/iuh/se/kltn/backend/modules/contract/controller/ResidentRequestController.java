package iuh.se.kltn.backend.modules.contract.controller;

import iuh.se.kltn.backend.common.security.UserPrincipal;
import iuh.se.kltn.backend.modules.contract.dto.request.ResidentRequestDTO;
import iuh.se.kltn.backend.modules.contract.dto.request.ResidentRemoveRequestDTO;
import iuh.se.kltn.backend.modules.contract.enums.RequestStatus;
import iuh.se.kltn.backend.modules.contract.service.ResidentRequestService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/resident-requests")
public class ResidentRequestController {
    @Autowired private ResidentRequestService residentRequestService;

    @PostMapping
    public ResponseEntity<?> create(@RequestBody ResidentRequestDTO dto, @AuthenticationPrincipal UserPrincipal currentUser) {
        return ResponseEntity.ok(residentRequestService.createRequest(
            dto.getContractId(), 
            currentUser.getId(), 
            dto.getInviteeEmail(), 
            dto.getMessage()
        ));
    }

    @PostMapping("/remove")
    public ResponseEntity<?> remove(@RequestBody ResidentRemoveRequestDTO dto, @AuthenticationPrincipal UserPrincipal currentUser) {
        return ResponseEntity.ok(residentRequestService.createRemoveRequest(
            dto.getContractId(),
            currentUser.getId(),
            dto.getUserId(),
            dto.getMessage()
        ));
    }

    @GetMapping("/contract/{contractId}")
    public ResponseEntity<?> getByContract(@PathVariable Long contractId) {
        return ResponseEntity.ok(residentRequestService.getRequestsByContract(contractId));
    }

    @GetMapping("/contract/{contractId}/members")
    public ResponseEntity<?> getMembers(@PathVariable Long contractId) {
        return ResponseEntity.ok(residentRequestService.getMembersByContract(contractId));
    }

    @PatchMapping("/{id}/status")
    public ResponseEntity<?> updateStatus(@PathVariable Long id, @RequestParam RequestStatus status) {
        return ResponseEntity.ok(residentRequestService.updateStatus(id, status));
    }
}
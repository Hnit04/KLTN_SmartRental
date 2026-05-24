package iuh.se.kltn.backend.modules.property.controller;

import iuh.se.kltn.backend.common.security.UserPrincipal;
import iuh.se.kltn.backend.modules.property.dto.request.RejectReasonRequest;
import iuh.se.kltn.backend.modules.property.dto.request.RoomRequest;
import iuh.se.kltn.backend.modules.property.dto.request.RoomStatusUpdateRequest;
import iuh.se.kltn.backend.modules.property.dto.response.RoomResponse;
import iuh.se.kltn.backend.modules.property.enums.PropertyStatus;
import iuh.se.kltn.backend.modules.property.enums.RoomStatus;
import iuh.se.kltn.backend.modules.property.service.RoomService;
import jakarta.validation.Valid;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/rooms")
public class RoomController {

    @Autowired
    private RoomService roomService;

    @GetMapping("/{id}")
    public ResponseEntity<?> getRoomDetail(@PathVariable Long id) {
        return ResponseEntity.ok(roomService.getRoomById(id));
    }

    @PutMapping("/{id}")
    public ResponseEntity<?> updateRoom(
            @PathVariable Long id,
            @Valid @RequestBody RoomRequest request) {
        return ResponseEntity.ok(roomService.updateRoom(id, request));
    }

    @GetMapping("/stats/landlord")
    public ResponseEntity<?> getLandlordRoomStats(
            @AuthenticationPrincipal UserPrincipal currentUser) {
        return ResponseEntity.ok(roomService.getRoomStatsForLandlord(currentUser.getId()));
    }

    @GetMapping("/pending")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<?> getPendingRooms() {
        return ResponseEntity.ok(roomService.getPendingRooms());
    }

    @PostMapping("/{id}/approve")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<?> approveRoom(@PathVariable Long id) {
        roomService.updateApprovalStatus(id, PropertyStatus.APPROVED, null);
        return ResponseEntity.ok("Da duyet phong");
    }

    @PostMapping("/{id}/reject")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<?> rejectRoom(@PathVariable Long id, @Valid @RequestBody(required = false) RejectReasonRequest body) {
        String reason = (body != null) ? body.getReason() : null;
        roomService.updateApprovalStatus(id, PropertyStatus.REJECTED, reason);
        return ResponseEntity.ok("Da tu choi phong");
    }

    @GetMapping("/{id}/tenants")
    @PreAuthorize("hasAnyRole('LANDLORD', 'ADMIN', 'TENANT')")
    public ResponseEntity<?> getRoomTenants(@PathVariable Long id) {
        return ResponseEntity.ok(roomService.getTenantsByRoomId(id));
    }

    @PutMapping("/{id}/hide")
    @PreAuthorize("hasAnyRole('LANDLORD','ADMIN')")
    public ResponseEntity<?> updateRoomStatus(
            @PathVariable Long id,
            @Valid @RequestBody RoomStatusUpdateRequest requestBody,
            @AuthenticationPrincipal UserPrincipal currentUser) {

        String statusStr = requestBody.getStatus();
        if (statusStr == null || statusStr.isBlank()) {
            return ResponseEntity.badRequest().body("Thieu truong 'status' trong body");
        }

        RoomStatus newStatus;
        try {
            newStatus = RoomStatus.valueOf(statusStr.toUpperCase());
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body("Trạng thái không hợp lệ. Giá trị hợp lệ: AVAILABLE, HIDDEN");
        }

        RoomResponse response = roomService.updateRoomStatus(id, newStatus, currentUser.getId());
        return ResponseEntity.ok(response);
    }
}

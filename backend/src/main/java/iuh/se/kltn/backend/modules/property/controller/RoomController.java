package iuh.se.kltn.backend.modules.property.controller;

import iuh.se.kltn.backend.common.security.UserPrincipal;
import iuh.se.kltn.backend.modules.property.dto.request.RoomRequest;
import iuh.se.kltn.backend.modules.property.service.RoomService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

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
            @RequestBody RoomRequest request) {
        return ResponseEntity.ok(roomService.updateRoom(id, request));
    }

    // Trong RoomController.java (hoặc tạo LandlordController nếu muốn tách)
    @GetMapping("/stats/landlord")
    public ResponseEntity<?> getLandlordRoomStats(
            @AuthenticationPrincipal UserPrincipal currentUser) {

        Map<String, Long> stats = roomService.getRoomStatsForLandlord(currentUser.getId());
        return ResponseEntity.ok(stats);
    }
}
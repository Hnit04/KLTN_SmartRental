package iuh.se.kltn.backend.modules.property.controller;

import iuh.se.kltn.backend.modules.property.dto.request.RoomRequest;
import iuh.se.kltn.backend.modules.property.service.RoomService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/rooms")
public class RoomController {

    @Autowired
    private RoomService roomService;

    // API: Lấy chi tiết phòng
    // URL: GET http://localhost:8080/api/rooms/{id}
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
}
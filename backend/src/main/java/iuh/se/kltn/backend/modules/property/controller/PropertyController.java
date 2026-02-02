package iuh.se.kltn.backend.modules.property.controller;

import iuh.se.kltn.backend.common.security.UserPrincipal;
import iuh.se.kltn.backend.modules.property.dto.request.PropertyRequest;
import iuh.se.kltn.backend.modules.property.dto.request.RoomRequest;
import iuh.se.kltn.backend.modules.property.service.PropertyService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/properties")
public class PropertyController {

    @Autowired
    private PropertyService propertyService;

    // 1. API MỚI: Lấy tất cả danh sách nhà trọ (Public - Ai cũng xem được)
    @GetMapping
    public ResponseEntity<?> getAllProperties() {
        return ResponseEntity.ok(propertyService.getAllProperties());
    }

    // Tạo Khu trọ mới
    @PostMapping
    public ResponseEntity<?> createProperty(@AuthenticationPrincipal UserPrincipal currentUser,
                                            @RequestBody PropertyRequest request) {
        return ResponseEntity.ok(propertyService.createProperty(currentUser.getId(), request));
    }

    // Thêm phòng vào Khu trọ
    @PostMapping("/{propertyId}/rooms")
    public ResponseEntity<?> addRoom(@AuthenticationPrincipal UserPrincipal currentUser,
                                     @PathVariable Long propertyId,
                                     @RequestBody RoomRequest request) {
        return ResponseEntity.ok(propertyService.addRoom(currentUser.getId(), propertyId, request));
    }

    // Xem danh sách nhà của chu tro (Của chính user đang đăng nhập)
    @GetMapping("/mine")
    public ResponseEntity<?> getMyProperties(@AuthenticationPrincipal UserPrincipal currentUser) {
        return ResponseEntity.ok(propertyService.getMyProperties(currentUser.getId()));
    }

    // Xem danh sách phòng của một khu trọ cụ thể
    @GetMapping("/{propertyId}/rooms")
    public ResponseEntity<?> getRooms(@PathVariable Long propertyId) {
        return ResponseEntity.ok(propertyService.getRoomsByProperty(propertyId));
    }
}
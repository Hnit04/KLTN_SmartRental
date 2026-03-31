package iuh.se.kltn.backend.modules.property.controller;

import iuh.se.kltn.backend.common.security.UserPrincipal;
import iuh.se.kltn.backend.common.service.CloudinaryService;
import iuh.se.kltn.backend.modules.property.dto.request.PropertyRequest;
import iuh.se.kltn.backend.modules.property.dto.request.RoomRequest;
import iuh.se.kltn.backend.modules.property.enums.PropertyStatus;
import iuh.se.kltn.backend.modules.property.service.PropertyService;
import jakarta.validation.Valid;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;

import java.io.IOException;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/properties")
public class PropertyController {

    @Autowired
    private PropertyService propertyService;
    @Autowired
    private CloudinaryService cloudinaryService;

    // 1. API MỚI: Lấy tất cả danh sách nhà trọ (Public - Ai cũng xem được)
    @GetMapping
    public ResponseEntity<?> getAllProperties(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "12") int size
    ) {
        Pageable pageable = PageRequest.of(page, size, Sort.by("id").descending());
        return ResponseEntity.ok(propertyService.getAllProperties(pageable));
    }

    // === ADMIN Duyệt tin (Thêm lên trên /{id} để tránh lỗi Type Mismatch) ===
    @GetMapping("/pending")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<?> getPendingProperties() {
        return ResponseEntity.ok(propertyService.getPropertiesByStatus(PropertyStatus.PENDING));
    }

    @PostMapping("/{id}/approve")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<?> approveProperty(@PathVariable Long id) {
        propertyService.updateStatus(id, PropertyStatus.APPROVED, null);
        return ResponseEntity.ok("Đã duyệt khu trọ");
    }

    @PostMapping("/{id}/reject")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<?> rejectProperty(@PathVariable Long id, @RequestBody(required = false) Map<String, String> body) {
        String reason = (body != null) ? body.get("reason") : null;
        propertyService.updateStatus(id, PropertyStatus.REJECTED, reason);
        return ResponseEntity.ok("Đã từ chối khu trọ");
    }

    // Tạo Khu trọ mới
    @PostMapping
    public ResponseEntity<?> createProperty(@AuthenticationPrincipal UserPrincipal currentUser,
                                            @Valid @RequestBody PropertyRequest request) {
        if (currentUser == null) {
            return ResponseEntity.status(401).body("Bạn cần đăng nhập để thực hiện thao tác này");
        }
        return ResponseEntity.ok(propertyService.createProperty(currentUser.getId(), request));
    }

    // Thêm phòng vào Khu trọ
    @PostMapping("/{propertyId}/rooms")
    public ResponseEntity<?> addRoom(@AuthenticationPrincipal UserPrincipal currentUser,
                                     @PathVariable Long propertyId,
                                     @Valid @RequestBody RoomRequest request) {
        return ResponseEntity.ok(propertyService.addRoom(currentUser.getId(), propertyId, request));
    }

    // Xem danh sách nhà của chu tro (Của chính user đang đăng nhập)
    @GetMapping("/mine")
    public ResponseEntity<?> getMyProperties(@AuthenticationPrincipal UserPrincipal currentUser) {
        return ResponseEntity.ok(propertyService.getMyProperties(currentUser.getId()));
    }

    // Xem danh sách phòng của một khu trọ cụ thể
    @GetMapping("/{propertyId}/rooms")
    public ResponseEntity<?> getRooms(
            @AuthenticationPrincipal UserPrincipal currentUser,
            @PathVariable Long propertyId) {
        Long currentUserId = currentUser != null ? currentUser.getId() : null;
        return ResponseEntity.ok(propertyService.getRoomsByProperty(propertyId, currentUserId));
    }

    @GetMapping("/{id}")
    public ResponseEntity<?> getPropertyDetail(@PathVariable Long id) {
        return ResponseEntity.ok(propertyService.getPropertyById(id));
    }

    @PutMapping("/{id}")
    public ResponseEntity<?> updateProperty(
            @AuthenticationPrincipal UserPrincipal currentUser,
            @PathVariable Long id,
            @Valid @RequestBody PropertyRequest request
    ) {
        if (currentUser == null) {
            return ResponseEntity.status(401).body("Bạn cần đăng nhập để thực hiện thao tác này");
        }
        return ResponseEntity.ok(propertyService.updateProperty(currentUser.getId(), id, request));
    }

    @PostMapping("/upload-images")
    public ResponseEntity<?> uploadPropertyImages(
            @RequestParam("files") List<MultipartFile> files
    ) {
        try {
            // Đẩy vào folder "smart-rental/properties" cho gọn gàng
            List<String> uploadedUrls = cloudinaryService.uploadImages(files, "smart-rental/properties");
            return ResponseEntity.ok(uploadedUrls);
        } catch (IOException e) {
            return ResponseEntity.internalServerError().body("Lỗi khi tải ảnh lên Cloudinary: " + e.getMessage());
        }
    }

    @GetMapping("/reverse-geocode")
    public ResponseEntity<?> reverseGeocode(@RequestParam double lat, @RequestParam double lon) {
        try {
            // Gọi sang Service để lấy chuỗi JSON địa chỉ
            String result = propertyService.reverseGeocode(lat, lon);
            return ResponseEntity.ok(result);
        } catch (Exception e) {
            return ResponseEntity.badRequest().body("Lỗi khi gọi API bản đồ: " + e.getMessage());
        }
    }
}
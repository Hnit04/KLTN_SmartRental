package iuh.se.kltn.backend.modules.property.controller;

import iuh.se.kltn.backend.modules.property.dto.response.PropertyLandlordInfo;
import iuh.se.kltn.backend.modules.property.dto.response.RoomResponse;
import iuh.se.kltn.backend.modules.property.entity.Room;
import iuh.se.kltn.backend.modules.property.service.RoomService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/rooms")
public class RoomController {

    @Autowired
    private RoomService roomService;

    // Lấy thông tin chi tiết của một phòng cụ thể bằng ID
    @GetMapping("/{roomId}")
    public ResponseEntity<?> getRoomDetail(@PathVariable Long roomId) {
        return ResponseEntity.ok(roomService.getRoomById(roomId));
    }

    @GetMapping("/{roomId}/property-id")
    public ResponseEntity<Long> getPropertyId(@PathVariable Long roomId) {
        return ResponseEntity.ok(roomService.getPropertyIdByRoomId(roomId));
    }


    @GetMapping("/{roomId}/landlord-info")
    public ResponseEntity<PropertyLandlordInfo> getLandlordInfo(
            @PathVariable Long roomId
    ) {
        return ResponseEntity.ok(
                roomService.findLandlordInfoByRoomId(roomId)
        );
    }

}

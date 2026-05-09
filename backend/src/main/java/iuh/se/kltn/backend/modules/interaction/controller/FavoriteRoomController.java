package iuh.se.kltn.backend.modules.interaction.controller;

import iuh.se.kltn.backend.common.security.UserPrincipal;
import iuh.se.kltn.backend.modules.interaction.service.FavoriteRoomService;
import iuh.se.kltn.backend.modules.property.dto.response.RoomResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/favorites/rooms")
@RequiredArgsConstructor
public class FavoriteRoomController {

    private final FavoriteRoomService favoriteRoomService;

    @PostMapping("/{roomId}")
    public ResponseEntity<Void> toggleFavorite(
            @AuthenticationPrincipal UserPrincipal userPrincipal,
            @PathVariable Long roomId) {
        favoriteRoomService.toggleFavorite(userPrincipal.getId(), roomId);
        return ResponseEntity.ok().build();
    }

    @GetMapping
    public ResponseEntity<List<RoomResponse>> getFavoriteRooms(
            @AuthenticationPrincipal UserPrincipal userPrincipal) {
        return ResponseEntity.ok(favoriteRoomService.getFavoriteRooms(userPrincipal.getId()));
    }

    @GetMapping("/ids")
    public ResponseEntity<List<Long>> getFavoriteRoomIds(
            @AuthenticationPrincipal UserPrincipal userPrincipal) {
        return ResponseEntity.ok(favoriteRoomService.getFavoriteRoomIds(userPrincipal.getId()));
    }
}

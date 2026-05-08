package iuh.se.kltn.backend.modules.interaction.service;

import iuh.se.kltn.backend.modules.property.dto.response.RoomResponse;
import iuh.se.kltn.backend.modules.property.entity.Room;
import iuh.se.kltn.backend.modules.property.repository.RoomRepository;
import iuh.se.kltn.backend.modules.property.service.PropertyService;
import iuh.se.kltn.backend.modules.user.entity.User;
import iuh.se.kltn.backend.modules.user.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class FavoriteRoomService {
    private final UserRepository userRepository;
    private final RoomRepository roomRepository;
    private final PropertyService propertyService; // Reuse to map Room to RoomResponse

    @Transactional
    public void toggleFavorite(Long userId, Long roomId) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new RuntimeException("User not found"));

        List<Long> favorites = user.getFavoriteRoomIds();
        
        if (favorites.contains(roomId)) {
            favorites.remove(roomId);
        } else {
            if (favorites.size() >= 20) {
                throw new RuntimeException("Bạn chỉ có thể yêu thích tối đa 20 phòng.");
            }
            // Verify room exists
            if (!roomRepository.existsById(roomId)) {
                throw new RuntimeException("Phòng không tồn tại");
            }
            favorites.add(roomId);
        }
        
        userRepository.save(user);
    }

    @Transactional(readOnly = true)
    public List<RoomResponse> getFavoriteRooms(Long userId) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new RuntimeException("User not found"));
                
        List<Long> favoriteIds = user.getFavoriteRoomIds();
        if (favoriteIds == null || favoriteIds.isEmpty()) {
            return List.of();
        }

        List<Room> rooms = roomRepository.findAllById(favoriteIds);
        
        return rooms.stream()
                .map(propertyService::mapToRoomResponse)
                .collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public List<Long> getFavoriteRoomIds(Long userId) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new RuntimeException("User not found"));
        return user.getFavoriteRoomIds();
    }
}

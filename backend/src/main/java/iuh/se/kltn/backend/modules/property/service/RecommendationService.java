package iuh.se.kltn.backend.modules.property.service;

import iuh.se.kltn.backend.modules.property.dto.response.RoomResponse;
import iuh.se.kltn.backend.modules.property.entity.Room;
import iuh.se.kltn.backend.modules.property.enums.RoomStatus;
import iuh.se.kltn.backend.modules.property.repository.RoomRepository;
import iuh.se.kltn.backend.modules.user.entity.TenantPreference;
import iuh.se.kltn.backend.modules.user.service.TenantPreferenceService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.util.Comparator;
import java.util.List;
import java.util.stream.Collectors;

@Service
public class RecommendationService {

    @Autowired
    private RoomRepository roomRepository;

    @Autowired
    private RoomService roomService;

    @Autowired
    private TenantPreferenceService tenantPreferenceService;

    public List<RoomResponse> getRecommendedRoomsForTenant(Long tenantId) {
        TenantPreference pref = tenantPreferenceService.getPreference(tenantId);
        
        List<Room> availableRooms = roomRepository.findByStatus(RoomStatus.AVAILABLE);

        if (pref == null) {
            // Không có sở thích -> Trả danh sách rỗng hoặc toàn bộ phòng tuỳ ý.
            // Để an toàn, trả về danh sách rỗng để UI báo người dùng cập nhật sở thích.
            return List.of();
        }

        // Tính điểm matching 
        return availableRooms.stream()
                .filter(r -> isMatchingPrice(r, pref))
                .sorted(Comparator.comparingDouble((Room r) -> calculateMatchScore(r, pref)).reversed())
                .limit(10) // Lấy top 10 phòng
                .map(r -> roomService.mapToRoomResponse(r))
                .collect(Collectors.toList());
    }

    private boolean isMatchingPrice(Room r, TenantPreference pref) {
        if (pref.getTargetPriceMin() != null && r.getPrice() < pref.getTargetPriceMin()) return false;
        if (pref.getTargetPriceMax() != null && r.getPrice() > pref.getTargetPriceMax()) return false;
        return true;
    }

    private double calculateMatchScore(Room r, TenantPreference pref) {
        double score = 0.0;
        
        // Match khu vực
        if (pref.getPreferredLocation() != null && !pref.getPreferredLocation().trim().isEmpty() && r.getProperty() != null) {
            String propertyCity = r.getProperty().getCity() != null ? r.getProperty().getCity().toLowerCase() : "";
            String propertyDistrict = r.getProperty().getDistrict() != null ? r.getProperty().getDistrict().toLowerCase() : "";
            String propertyAddress = r.getProperty().getAddress() != null ? r.getProperty().getAddress().toLowerCase() : "";
            
            String prefLoc = pref.getPreferredLocation().toLowerCase();
            if (propertyCity.contains(prefLoc) || propertyDistrict.contains(prefLoc) || propertyAddress.contains(prefLoc)) {
                score += 50.0; // Điểm match vị trí rất cao
            }
        }
        
        // Match giá: càng gần mức trung bình của user càng tốt
        if (pref.getTargetPriceMin() != null && pref.getTargetPriceMax() != null) {
            double targetAvg = (pref.getTargetPriceMin() + pref.getTargetPriceMax()) / 2.0;
            double diff = Math.abs(r.getPrice() - targetAvg);
            double range = pref.getTargetPriceMax() - pref.getTargetPriceMin();
            if (range > 0) {
                double percentDiff = diff / range;
                if (percentDiff < 1.0) {
                    score += (1.0 - percentDiff) * 30.0;
                }
            }
        }

        return score;
    }
}

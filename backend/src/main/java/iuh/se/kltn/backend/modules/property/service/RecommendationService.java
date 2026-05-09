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

    @org.springframework.transaction.annotation.Transactional(readOnly = true)
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
                .map(r -> {
                    StringBuilder reason = new StringBuilder();
                    double score = calculateMatchScoreWithReason(r, pref, reason);
                    
                    RoomResponse res = roomService.mapToRoomResponse(r);
                    res.setMatchScore(score);
                    res.setMatchReason(reason.toString());
                    return res;
                })
                .sorted(Comparator.comparingDouble(RoomResponse::getMatchScore).reversed())
                .limit(10)
                .collect(Collectors.toList());
    }

    private boolean isMatchingPrice(Room r, TenantPreference pref) {
        if (pref.getTargetPriceMin() == null || pref.getTargetPriceMax() == null) {
            return true;
        }
        // Cho phép mức giá dao động 20% so với budget để hệ thống có thể gợi ý thêm lựa chọn
        double minAcceptable = pref.getTargetPriceMin() * 0.8;
        double maxAcceptable = pref.getTargetPriceMax() * 1.2;
        return r.getPrice() >= minAcceptable && r.getPrice() <= maxAcceptable;
    }

    private double calculateMatchScoreWithReason(Room r, TenantPreference pref, StringBuilder reason) {
        double score = 0.0;
        
        // Match khu vực
        if (pref.getPreferredLocation() != null && !pref.getPreferredLocation().trim().isEmpty() && r.getProperty() != null) {
            String propertyCity = r.getProperty().getCity() != null ? r.getProperty().getCity().toLowerCase() : "";
            String propertyDistrict = r.getProperty().getDistrict() != null ? r.getProperty().getDistrict().toLowerCase() : "";
            String propertyAddress = r.getProperty().getAddress() != null ? r.getProperty().getAddress().toLowerCase() : "";
            
            String prefLoc = pref.getPreferredLocation().toLowerCase();
            if (propertyCity.contains(prefLoc) || propertyDistrict.contains(prefLoc) || propertyAddress.contains(prefLoc)) {
                score += 50.0;
                reason.append("Gần khu vực bạn tìm. ");
            }
        }
        
        // Match giá
        if (pref.getTargetPriceMin() != null && pref.getTargetPriceMax() != null) {
            double targetAvg = (pref.getTargetPriceMin() + pref.getTargetPriceMax()) / 2.0;
            double diff = Math.abs(r.getPrice() - targetAvg);
            double range = pref.getTargetPriceMax() - pref.getTargetPriceMin();
            if (range > 0) {
                double percentDiff = diff / range;
                if (percentDiff < 1.0) {
                    double priceScore = (1.0 - percentDiff) * 30.0;
                    score += priceScore;
                    if (priceScore > 20) reason.append("Giá cực tốt. ");
                    else reason.append("Mức giá phù hợp. ");
                }
            }
        }

        // Match tiện ích (Amenities)
        if (pref.getAmenitiesRef() != null && !pref.getAmenitiesRef().isEmpty() && r.getAmenities() != null) {
            String[] prefAmenities = pref.getAmenitiesRef().split(",");
            int matchCount = 0;
            for (String am : prefAmenities) {
                if (r.getAmenities().contains(am.trim())) {
                    matchCount++;
                }
            }
            if (matchCount > 0) {
                score += matchCount * 5.0;
                reason.append("Có tiệ̣n ích bạn cần. ");
            }
        }

        return score;
    }
}

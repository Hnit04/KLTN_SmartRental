package iuh.se.kltn.backend.modules.property.dto.response;

import iuh.se.kltn.backend.modules.property.enums.PropertyStatus;
import lombok.Data;
import java.util.List;

@Data
public class PropertyResponse {
    private Long id;
    private String name;
    private String address;
    private String district;
    private String city;
    private String description;
    private PropertyStatus status;

    // Tọa độ
    private Double latitude;
    private Double longitude;

    // Giá dịch vụ
    private Double elecPrice;
    private Double waterPrice;
    private Double internetPrice;

    private List<String> images;

    private Long landlordId;

    private String landlordUsername;
    private String landlordName;
    private String landlordPhone;
    private String landlordAvatar;
    private String landlordEmail;
    private String landlordZalo;
    private Integer landlordReputationScore;

    private Double minPrice;
    private Double maxPrice;
    private Integer availableRooms;
    private Integer totalRooms;
    private Double averageRating;
    private Integer reviewCount;
    private Double trustEvidence;
    private Double trustEffectiveScore;
    private Double ratingBayesScore;
    private Double distanceKm;
    private Double distanceScore;
    private Double rankScore;

    private Integer safetyScore;
    private String moderationReason;
}

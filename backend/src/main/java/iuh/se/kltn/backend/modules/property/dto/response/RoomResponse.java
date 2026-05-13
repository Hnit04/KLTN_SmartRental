package iuh.se.kltn.backend.modules.property.dto.response;

import iuh.se.kltn.backend.modules.property.enums.PropertyStatus;
import iuh.se.kltn.backend.modules.property.enums.RoomStatus;
import lombok.Data;
import java.util.List;

@Data
public class RoomResponse {
    private Long id;
    private String name;
    private Double price;
    private Float area;
    private String type;
    private Boolean hasMezzanine;
    private Boolean hasBalcony;
    private RoomStatus status;
    private PropertyStatus approvalStatus;
    private List<String> amenities;
    private List<String> images;
    private List<String> panoramaImages;
    private Integer maxOccupants;
    private String propertyName;
    private String propertyAddress;
    private String landlordUsername;
    private String landlordName;
    private String landlordPhone;
    private String landlordAvatar;
    private Integer landlordReputationScore;
    private Double elecPrice;
    private Long propertyId;
    private Double waterPrice;
    private Double internetPrice;
    private String defaultTerms;
    private Double matchScore; // Thêm điểm phù hợp AI
    private String matchReason; // Lý do phù hợp (Vd: "Giá tốt, có gác lửng")
    private Integer safetyScore;
    private String moderationReason;
    private String description;
    private String availableFromDate; // Thêm ngày dự kiến trống
}

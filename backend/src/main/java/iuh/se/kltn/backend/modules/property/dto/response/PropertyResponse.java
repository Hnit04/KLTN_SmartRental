package iuh.se.kltn.backend.modules.property.dto.response;

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

    // Giá dịch vụ
    private Double elecPrice;
    private Double waterPrice;
    private Double internetPrice;

    private List<String> images;

    private Long landlordId;

    private String landlordName;
    private String landlordPhone;

    private Double minPrice;
    private Double maxPrice;
    private Integer availableRooms;
    private Integer totalRooms;
}
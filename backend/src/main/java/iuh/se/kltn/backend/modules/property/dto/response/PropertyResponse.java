// File: PropertyResponse.java
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
    private String landlordName;
    private String landlordPhone;

    private Double minPrice;       // Giá thấp nhất
    private Double maxPrice;       // Giá cao nhất
    private Integer availableRooms; // Số phòng còn trống
    private Integer totalRooms;     // Tổng số phòng
}
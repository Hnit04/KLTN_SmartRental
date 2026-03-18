package iuh.se.kltn.backend.modules.property.dto.request;

import lombok.Data;
import java.util.List;

@Data
public class PropertyRequest {
    private String name;
    private String address;
    private String district;
    private String city;
    private String description;
    
    // Tọa độ
    private Double latitude;
    private Double longitude;

    private Double elecPrice;
    private Double waterPrice;
    private Double internetPrice;

    private List<String> images;
}
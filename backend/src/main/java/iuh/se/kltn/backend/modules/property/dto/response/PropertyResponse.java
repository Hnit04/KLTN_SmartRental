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
    private Double elecPrice;
    private Double waterPrice;
    private Double internetPrice;
    private List<String> images;
    private String landlordName;
}
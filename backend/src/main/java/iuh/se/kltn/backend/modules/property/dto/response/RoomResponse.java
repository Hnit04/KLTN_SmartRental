package iuh.se.kltn.backend.modules.property.dto.response;

import iuh.se.kltn.backend.modules.property.enums.RoomStatus;
import lombok.Data;
import java.util.List;

@Data
public class RoomResponse {
    private Long id;
    private String name;
    private Double price;
    private Float area;
    private RoomStatus status;
    private List<String> amenities;
    private List<String> images;
    private String propertyName;
    private String defaultTerms;
}
package iuh.se.kltn.backend.modules.property.dto.request;

import lombok.Data;
import java.util.List;

@Data
public class RoomRequest {
    private String name;
    private Double price;
    private Float area;
    private String type;
    private Boolean hasMezzanine;
    private Boolean hasBalcony;
    private List<String> amenities;
    private List<String> images;
    private String defaultTerms;
}
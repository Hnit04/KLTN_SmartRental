package iuh.se.kltn.backend.modules.property.dto.request;

import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.Data;
import java.util.List;

@Data
public class RoomRequest {
    @NotBlank(message = "Tên phòng không được để trống")
    private String name;

    @NotNull(message = "Giá thuê không được để trống")
    @Min(value = 0, message = "Giá thuê không được âm")
    private Double price;

    @NotNull(message = "Diện tích không được để trống")
    @Min(value = 1, message = "Diện tích phải lớn hơn 0")
    private Float area;

    private String type;
    private Boolean hasMezzanine;
    private Boolean hasBalcony;

    @Min(value = 1, message = "Số người tối đa phải >= 1")
    private Integer maxOccupants;

    private List<String> amenities;
    private List<String> images;
    private List<String> panoramaImages;
    private String defaultTerms;
    private String description;

}
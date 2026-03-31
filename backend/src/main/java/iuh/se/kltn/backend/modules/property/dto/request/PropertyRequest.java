package iuh.se.kltn.backend.modules.property.dto.request;

import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import lombok.Data;
import java.util.List;

@Data
public class PropertyRequest {
    @NotBlank(message = "Tên khu trọ không được để trống")
    private String name;

    @NotBlank(message = "Địa chỉ không được để trống")
    private String address;

    private String district;

    @NotBlank(message = "Tỉnh/Thành phố không được để trống")
    private String city;

    private String description;
    
    // Tọa độ
    private Double latitude;
    private Double longitude;

    @Min(value = 0, message = "Giá điện không được âm")
    private Double elecPrice;

    @Min(value = 0, message = "Giá nước không được âm")
    private Double waterPrice;

    @Min(value = 0, message = "Giá internet không được âm")
    private Double internetPrice;

    private List<String> images;
}
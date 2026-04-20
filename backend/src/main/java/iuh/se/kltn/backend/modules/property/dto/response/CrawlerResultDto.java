package iuh.se.kltn.backend.modules.property.dto.response;

import lombok.Data;
import java.util.List;

@Data
public class CrawlerResultDto {
    private String name;
    private String district;
    private String city;
    private String address;
    private String description;
    private Double price;         // Giá thuê (VNĐ)
    private Float area;           // Diện tích (m2)
    private String originalLink;
    private String image;         // JSON array string các URL ảnh

    // --- FIELDS MỚI THÊM ---
    private String phone;              // Số điện thoại liên hệ
    private Integer totalRooms;        // Tổng số phòng (từ NhaTroVn)
    private String roomType;           // Loại phòng: "studio", "shared", "mezzanine", "single", "one_bedroom", "two_bedroom"
    private List<String> amenitiesList; // Tiện ích thực tế: ["WIFI", "AIR_CONDITIONER", "PARKING", "WASHING_MACHINE", "FRIDGE", "WATER_HEATER", "ELEVATOR", "CAMERA"]
    private Boolean hasMezzanine;      // Có gác lửng không
    private Boolean hasBalcony;        // Có ban công không
}

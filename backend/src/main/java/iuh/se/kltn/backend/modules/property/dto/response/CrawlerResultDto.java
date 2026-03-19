package iuh.se.kltn.backend.modules.property.dto.response;

import lombok.Data;

@Data
public class CrawlerResultDto {
    private String name;
    private String district;
    private String city;
    private String address;
    private String description;
    private Double price; // Giá (VNĐ)
    private Float area;   // Diện tích (m2)
    private String originalLink;
    private String image;
}

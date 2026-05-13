package iuh.se.kltn.backend.modules.ai.dto.request;

import com.fasterxml.jackson.annotation.JsonAlias;
import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import lombok.Data;

import java.util.List;

@Data
@JsonIgnoreProperties(ignoreUnknown = true)
public class AiSuggestRoomPriceRequest {
    @NotBlank(message = "District is required")
    @Size(max = 100, message = "District is too long")
    @JsonAlias({"quan", "districtName"})
    private String district;

    @NotBlank(message = "City is required")
    @Size(max = 100, message = "City is too long")
    @JsonAlias({"province", "cityName"})
    private String city;

    @NotNull(message = "Area is required")
    @DecimalMin(value = "0.1", message = "Area must be greater than 0")
    @JsonAlias({"squareMeters", "dienTich"})
    private Double area;

    @NotBlank(message = "Type is required")
    @Size(max = 100, message = "Type is too long")
    @JsonAlias({"roomType", "loaiPhong"})
    private String type;

    @JsonAlias({"utilities", "amenityList"})
    private List<String> amenities;
}

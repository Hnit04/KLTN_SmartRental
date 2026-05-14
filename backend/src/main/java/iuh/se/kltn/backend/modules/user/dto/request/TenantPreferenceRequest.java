package iuh.se.kltn.backend.modules.user.dto.request;

import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.Size;
import lombok.Data;

@Data
public class TenantPreferenceRequest {
    @DecimalMin(value = "0.0", message = "Minimum target price must be >= 0")
    private Double targetPriceMin;

    @DecimalMin(value = "0.0", message = "Maximum target price must be >= 0")
    private Double targetPriceMax;

    @Size(max = 255, message = "Preferred location is too long")
    private String preferredLocation;

    private Boolean hasPet;

    @Size(max = 1000, message = "Amenities reference is too long")
    private String amenitiesRef;
}

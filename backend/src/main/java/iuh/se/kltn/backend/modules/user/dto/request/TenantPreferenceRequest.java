package iuh.se.kltn.backend.modules.user.dto.request;

import lombok.Data;

@Data
public class TenantPreferenceRequest {
    private Double targetPriceMin;
    private Double targetPriceMax;
    private String preferredLocation;
    private Boolean hasPet;
    private String amenitiesRef;
}

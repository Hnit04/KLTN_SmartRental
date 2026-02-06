package iuh.se.kltn.backend.modules.property.dto.response;

import iuh.se.kltn.backend.modules.user.enums.KYCStatus;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@AllArgsConstructor
@NoArgsConstructor
public class PropertyLandlordInfo {
    private String fullName;
    private String avatarUrl;
    private KYCStatus kycStatus;
    private Long propertyId;
}

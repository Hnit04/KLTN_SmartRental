package iuh.se.kltn.backend.modules.user.dto.response;

import iuh.se.kltn.backend.common.enums.Role;
import iuh.se.kltn.backend.modules.user.enums.KYCStatus;
import lombok.Data;

@Data
public class UserProfileResponse {
    private Long id;
    private String username;
    private String fullName;
    private String email;
    private String phoneNumber;
    private String walletAddress;
    private String avatarUrl;
    private Role role;
    private KYCStatus kycStatus;
    private int reputationScore;
    private String businessLicenseUrl;
}
package iuh.se.kltn.backend.modules.user.dto.response;

import iuh.se.kltn.backend.common.enums.Role;
import iuh.se.kltn.backend.modules.user.enums.KYCStatus;
import jakarta.persistence.Column;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;

@Data
@AllArgsConstructor
@NoArgsConstructor
public class UserProfileResponse {
    private Long id;
    private String username;
    private String email;
    private String fullName;
    private String phoneNumber;
    private String avatarUrl;
    private String walletAddress;
    private String zaloPhone;
    private LocalDate dateOfBirth;
    private String currentAddress;
    private String cccdNumber;

    private int reputationScore;
    private KYCStatus kycStatus;
    private Role role;
    private String businessLicenseUrl;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
    private String cccdFrontUrl;
    private String cccdBackUrl;
    private boolean isLocked;
    private LocalDateTime lockedAt;
    private LocalDateTime lockUntil;
    private List<String> lockReason;
    // 💰 Thông tin ngân hàng
    private String bankName;
    private String bankAccountNumber;
    private String bankAccountHolder;
    private String bankQrUrl;
}
package iuh.se.kltn.backend.modules.user.dto.request;

import lombok.Data;

import java.time.LocalDate;

@Data
public class UpdateProfileRequest {
    private String fullName;
    private String phoneNumber;
    private String zaloPhone;
    private LocalDate dateOfBirth;
    private String currentAddress;
    private String cccdNumber;
    private String avatarUrl;
}
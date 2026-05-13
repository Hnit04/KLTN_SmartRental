package iuh.se.kltn.backend.modules.user.dto.request;

import jakarta.validation.constraints.Past;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;
import lombok.Data;

import java.time.LocalDate;

@Data
public class UpdateProfileRequest {
    @Size(max = 120, message = "Full name is too long")
    private String fullName;

    @Pattern(regexp = "^$|^(0|\\+84)[0-9]{9}$", message = "Phone number is invalid")
    private String phoneNumber;

    @Pattern(regexp = "^$|^(0|\\+84)[0-9]{9}$", message = "Zalo phone number is invalid")
    private String zaloPhone;

    @Past(message = "Date of birth must be in the past")
    private LocalDate dateOfBirth;

    @Size(max = 255, message = "Current address is too long")
    private String currentAddress;

    @Pattern(regexp = "^$|^\\d{12}$", message = "CCCD must contain exactly 12 digits")
    private String cccdNumber;

    @Size(max = 1000, message = "Avatar URL is too long")
    private String avatarUrl;

    @Size(max = 120, message = "Bank name is too long")
    private String bankName;

    @Pattern(regexp = "^$|^[0-9]{6,30}$", message = "Bank account number is invalid")
    private String bankAccountNumber;

    @Size(max = 120, message = "Bank account holder is too long")
    private String bankAccountHolder;

    @Size(max = 1000, message = "Bank QR URL is too long")
    private String bankQrUrl;
}

package iuh.se.kltn.backend.modules.user.dto.request;

import iuh.se.kltn.backend.common.enums.Role;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.Data;

@Data
public class UserRegisterRequest {
    @NotBlank(message = "Username không được để trống")
    private String username;

    @NotBlank(message = "Password không được để trống")
    @Size(min = 6, message = "Password phải từ 6 ký tự")
    private String password;

    private String fullName;

    @Email(message = "Email không hợp lệ")
    private String email;

    private String walletAddress;
    private Role role;
}
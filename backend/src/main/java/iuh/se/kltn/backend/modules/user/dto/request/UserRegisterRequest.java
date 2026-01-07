package iuh.se.kltn.backend.modules.user.dto.request;

import iuh.se.kltn.backend.common.enums.Role;
import lombok.Data;

@Data
public class UserRegisterRequest {
    private String username;
    private String password;
    private String fullName;
    private String email;
    private String walletAddress;
    private Role role;
}
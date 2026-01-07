package iuh.se.kltn.backend.modules.user.dto.request;

import lombok.Data;

@Data
public class LoginRequest {
    private String username;
    private String password;
}
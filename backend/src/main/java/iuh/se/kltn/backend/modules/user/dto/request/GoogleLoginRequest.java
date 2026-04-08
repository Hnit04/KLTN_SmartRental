package iuh.se.kltn.backend.modules.user.dto.request;

import lombok.Data;

@Data
public class GoogleLoginRequest {
    private String idToken;
    private String email;
    private String name;
    private String picture;
    private String googleId;
}
package iuh.se.kltn.backend.modules.user.dto.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.Data;

@Data
public class GoogleLoginRequest {
    @NotBlank(message = "Google ID token is required")
    private String idToken;

    @Size(max = 255, message = "Email is too long")
    private String email;

    @Size(max = 120, message = "Name is too long")
    private String name;

    @Size(max = 1000, message = "Picture URL is too long")
    private String picture;

    @Size(max = 255, message = "Google ID is too long")
    private String googleId;
}

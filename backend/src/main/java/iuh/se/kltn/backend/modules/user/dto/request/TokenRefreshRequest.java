package iuh.se.kltn.backend.modules.user.dto.request;

import lombok.Data;

@Data
public class TokenRefreshRequest {

    private String refreshToken;
}

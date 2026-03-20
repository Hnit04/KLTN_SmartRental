package iuh.se.kltn.backend.modules.user.dto.request;

import lombok.Data;

@Data
public class VerifyOtpRequest {
    private String email;
    private String code;
}
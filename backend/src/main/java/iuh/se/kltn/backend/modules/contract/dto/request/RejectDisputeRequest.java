package iuh.se.kltn.backend.modules.contract.dto.request;

import jakarta.validation.constraints.NotBlank;
import lombok.Data;

@Data
public class RejectDisputeRequest {
    @NotBlank(message = "Lý do từ chối không được để trống")
    private String resolutionNote;
}

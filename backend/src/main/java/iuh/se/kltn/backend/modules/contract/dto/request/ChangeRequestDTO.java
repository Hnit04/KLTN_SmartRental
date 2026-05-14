package iuh.se.kltn.backend.modules.contract.dto.request;

import iuh.se.kltn.backend.modules.contract.enums.RequestType;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import lombok.Data;

@Data
public class ChangeRequestDTO {
    @NotNull(message = "Request type is required")
    private RequestType type; // CHANGE_PRICE, EXTENSION, etc.

    @Size(max = 2000, message = "New value is too long")
    private String newValue;

    @NotBlank(message = "Reason is required")
    @Size(max = 2000, message = "Reason is too long")
    private String reason;
}

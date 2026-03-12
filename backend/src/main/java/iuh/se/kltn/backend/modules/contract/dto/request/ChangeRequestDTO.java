package iuh.se.kltn.backend.modules.contract.dto.request;

import iuh.se.kltn.backend.modules.contract.enums.RequestType;
import lombok.Data;

@Data
public class ChangeRequestDTO {
    private RequestType type; // CHANGE_PRICE, EXTENSION, etc.
    private String newValue;
    private String reason;
}
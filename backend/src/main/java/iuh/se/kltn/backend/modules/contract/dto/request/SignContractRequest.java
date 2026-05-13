package iuh.se.kltn.backend.modules.contract.dto.request;

import iuh.se.kltn.backend.modules.contract.enums.ContractSignMethod;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import lombok.Data;

@Data
public class SignContractRequest {
    @NotNull(message = "Sign method is required")
    private ContractSignMethod signMethod;

    @Size(max = 4096, message = "Signature is too long")
    private String signature;
}

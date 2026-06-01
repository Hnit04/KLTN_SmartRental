package iuh.se.kltn.backend.modules.contract.dto.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.Data;

@Data
public class SignEip712Request {
    @NotBlank(message = "Signature is required")
    private String signature;
    
    @NotBlank(message = "Typed Data JSON is required")
    private String typedDataJson;
    
    @NotNull(message = "Nonce is required")
    private Long nonce;
}

package iuh.se.kltn.backend.modules.contract.dto.request;

import com.fasterxml.jackson.annotation.JsonAlias;
import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.Data;

@Data
@JsonIgnoreProperties(ignoreUnknown = true)
public class TransactionHashRequest {
    @NotBlank(message = "txHash is required")
    @Size(max = 255, message = "txHash is too long")
    @JsonAlias({"tx_hash", "transactionHash", "hash"})
    private String txHash;
}

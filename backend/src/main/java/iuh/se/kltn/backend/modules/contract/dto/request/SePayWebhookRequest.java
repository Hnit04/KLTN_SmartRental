package iuh.se.kltn.backend.modules.contract.dto.request;

import com.fasterxml.jackson.annotation.JsonProperty;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import lombok.Data;

@Data
public class SePayWebhookRequest {
    @Size(max = 100, message = "Gateway is too long")
    private String gateway;

    @Size(max = 100, message = "Transaction date is too long")
    private String transactionDate;

    @NotBlank(message = "Account number is required")
    @Size(max = 100, message = "Account number is too long")
    private String accountNumber;

    @Size(max = 100, message = "Sub account is too long")
    private String subAccount;
    
    @JsonProperty("transferAmount")
    @NotNull(message = "Transfer amount is required")
    private Double amountIn;
    
    private Double amountOut;
    private Double accumulated;

    @Size(max = 100, message = "Code is too long")
    private String code;
    
    @JsonProperty("content")
    @NotBlank(message = "Transaction content is required")
    @Size(max = 500, message = "Transaction content is too long")
    private String transactionContent;
    
    @JsonProperty("referenceCode")
    @NotBlank(message = "Reference number is required")
    @Size(max = 200, message = "Reference number is too long")
    private String referenceNumber;

    @Size(max = 2000, message = "Body is too long")
    private String body;
}

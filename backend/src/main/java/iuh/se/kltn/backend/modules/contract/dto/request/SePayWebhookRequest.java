package iuh.se.kltn.backend.modules.contract.dto.request;

import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.Data;

@Data
public class SePayWebhookRequest {
    private String gateway;
    private String transactionDate;
    private String accountNumber;
    private String subAccount;
    
    @JsonProperty("transferAmount")
    private Double amountIn;
    
    private Double amountOut;
    private Double accumulated;
    private String code;
    
    @JsonProperty("content")
    private String transactionContent;
    
    @JsonProperty("referenceCode")
    private String referenceNumber;

    private String body;
}

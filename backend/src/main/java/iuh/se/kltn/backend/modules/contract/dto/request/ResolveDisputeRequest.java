package iuh.se.kltn.backend.modules.contract.dto.request;

import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;
import lombok.Data;

@Data
public class ResolveDisputeRequest {
    @NotNull
    @Min(value = 0, message = "Số tiền hoàn cọc không được âm")
    private Double tenantRefundAmount;
    
    @NotNull
    @Min(value = 0, message = "Số tiền khấu trừ không được âm")
    private Double landlordDeductionAmount;
    
    private String resolutionNote;
    
    @NotNull
    private Boolean terminateContract;
}

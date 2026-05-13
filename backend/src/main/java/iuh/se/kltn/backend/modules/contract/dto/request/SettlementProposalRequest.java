package iuh.se.kltn.backend.modules.contract.dto.request;

import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.PositiveOrZero;
import lombok.Data;

@Data
public class SettlementProposalRequest {
    @NotNull(message = "Deduction amount is required")
    @PositiveOrZero(message = "Deduction amount must be >= 0")
    private Long deductionAmount;

    private boolean earlyTermination;
}

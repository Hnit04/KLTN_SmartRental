package iuh.se.kltn.backend.modules.contract.dto.request;

import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.PositiveOrZero;
import lombok.Data;
import java.util.List;

@Data
public class SettlementProposalRequest {
    @NotNull(message = "Deduction amount is required")
    @PositiveOrZero(message = "Deduction amount must be >= 0")
    private Long deductionAmount;

    private boolean earlyTermination;

    // New fields for detailed settlement
    private String txHash;
    private String inspectionNote;
    private UtilityBill utilityBill;
    private List<DeductionItem> items;

    @Data
    public static class UtilityBill {
        private Double electricityUsage;
        private Double waterUsage;
        private Double electricityFee;
        private Double waterFee;
        private Double internetFee;
        private Double total;
    }

    @Data
    public static class DeductionItem {
        private String reason;
        private Long amount;
        private String type; // UTILITY, DAMAGE, OTHER
        private Boolean locked;
    }
}

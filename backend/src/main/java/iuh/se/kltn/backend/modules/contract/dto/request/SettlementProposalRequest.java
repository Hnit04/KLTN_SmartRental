package iuh.se.kltn.backend.modules.contract.dto.request;

import lombok.Data;

@Data
public class SettlementProposalRequest {
    private Long deductionAmount;
    private boolean earlyTermination;
}

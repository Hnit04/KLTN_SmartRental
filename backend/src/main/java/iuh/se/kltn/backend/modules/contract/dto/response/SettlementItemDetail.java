package iuh.se.kltn.backend.modules.contract.dto.response;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class SettlementItemDetail {
    private String type; // "BILL" or "DEPOSIT"
    private Long id;
    private String description;
    private Double amount;
    private LocalDateTime paidAt;
    private String referenceCode;
}

package iuh.se.kltn.backend.modules.contract.dto.request;

import lombok.Data;
import java.time.LocalDate;

@Data
public class ContractRequest {
    private Long roomId;
    private LocalDate startDate;
    private LocalDate endDate;
    private Double depositAmount;
}
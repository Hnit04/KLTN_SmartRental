package iuh.se.kltn.backend.modules.contract.dto.request;

import lombok.Data;
import java.time.LocalDateTime;

@Data
public class BillRequest {
    private Long contractId;
    private Integer month;
    private Integer year;

    private Integer oldElecIndex;
    private Integer newElecIndex;
    private Integer oldWaterIndex;
    private Integer newWaterIndex;

    private LocalDateTime deadline;
}
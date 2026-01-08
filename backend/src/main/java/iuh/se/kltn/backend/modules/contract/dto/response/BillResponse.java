package iuh.se.kltn.backend.modules.contract.dto.response;

import iuh.se.kltn.backend.modules.contract.enums.BillStatus;
import lombok.Data;
import java.time.LocalDateTime;

@Data
public class BillResponse {
    private Long id;
    private String roomName;
    private int month;
    private int year;

    private Double totalAmount;
    private Double elecCost;
    private Double waterCost;
    private Double roomCost;

    private BillStatus status;
    private LocalDateTime deadline;
    private String paymentTxHash;
}
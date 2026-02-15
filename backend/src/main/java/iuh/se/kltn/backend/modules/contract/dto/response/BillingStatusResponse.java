package iuh.se.kltn.backend.modules.contract.dto.response;

import lombok.Data;
import java.time.LocalDateTime;

@Data
public class BillingStatusResponse {
    private Long id; // ID của Hợp đồng
    private String roomName;
    private String tenantName;

    private Double actualPrice;
    private Double elecPrice;
    private Double waterPrice;
    private Double internetPrice;

    private String billStatus; // UNBILLED, UNPAID, PAID, LATE
    private Integer oldElecIndex;
    private Integer oldWaterIndex;

    private Double totalAmount;
    private LocalDateTime deadline;
    private String paymentMethod; // "BLOCKCHAIN" hoặc "TRADITIONAL"
}
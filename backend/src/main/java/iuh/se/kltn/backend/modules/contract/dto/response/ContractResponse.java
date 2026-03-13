package iuh.se.kltn.backend.modules.contract.dto.response;

import iuh.se.kltn.backend.modules.contract.enums.ContractSignMethod;
import iuh.se.kltn.backend.modules.contract.enums.ContractStatus;
import iuh.se.kltn.backend.modules.contract.enums.DepositStatus;
import lombok.Data;
import java.time.LocalDate;
import java.time.LocalDateTime;

@Data
public class ContractResponse {
    private Long id;
    private String roomName;
    private String propertyAddress;
    private String tenantName;
    private String landlordName;

    private LocalDate startDate;
    private LocalDate endDate;
    private Double actualPrice;
    private Double depositAmount;

    private ContractStatus status;
    private DepositStatus depositStatus;
    private ContractSignMethod signMethod;
    private String additionalTerms;
    // Thông tin nội dung
    private String contentUrl;
    private String contractHash;
    private Double elecPrice;
    private Double waterPrice;
    private Double internetPrice;

    private String smartContractAddress;
    private String deployTxHash;
    private LocalDateTime signDate;
}
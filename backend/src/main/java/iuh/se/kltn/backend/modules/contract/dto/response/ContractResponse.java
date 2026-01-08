package iuh.se.kltn.backend.modules.contract.dto.response;

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
    private Double price;
    private Double depositAmount;

    private ContractStatus status;
    private DepositStatus depositStatus;

    // Thông tin Blockchain
    private String contractHash;
    private String smartContractAddress;
    private LocalDateTime signDate;
}
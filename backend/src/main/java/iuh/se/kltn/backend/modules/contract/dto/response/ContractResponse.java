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
    private Long roomId;
    private Long tenantId;
    private Long landlordId;
    private String roomName;
    private Integer maxOccupants;
    private String propertyAddress;
    private String tenantName;
    private String landlordName;
    private String landlordWalletAddress;

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
    private Boolean isTenantSigned;
    private Boolean isLandlordSigned;
    private String smartContractAddress;
    private String deployTxHash;
    private LocalDateTime signDate;

    // 💰 Thông tin thanh toán/hoàn cọc của Khách thuê
    private String tenantPhone;
    private String tenantCccd;
    private String tenantWalletAddress;
    private String tenantBankName;
    private String tenantBankAccountNumber;
    private String tenantBankAccountHolder;
    private String tenantBankQrUrl;

    // 💰 Thông tin ngân hàng của Chủ trọ để Khách thuê thanh toán
    private String landlordBankName;
    private String landlordBankAccountNumber;
    private String landlordBankAccountHolder;
    private String landlordBankQrUrl;

    // 🏷️ Vai trò của người đang xem trong hợp đồng này (Dùng cho Lịch sử thuê)
    private String userRole;
    private Integer tenantReputationScore;
    private String tenantKycStatus;
    private String cancelReason;
}
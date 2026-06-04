package iuh.se.kltn.backend.modules.contract.dto.response;

import iuh.se.kltn.backend.modules.contract.entity.ContractDispute;
import lombok.Builder;
import lombok.Data;

import java.time.LocalDateTime;

@Data
@Builder
public class DisputeResponse {
    private Long id;
    private Long contractId;
    private String contractSmartContractAddress;
    private String roomName;
    private Long propertyId;
    
    private String violationType;
    private String description;
    private String evidenceUrls;
    private String status; // OPEN, RESOLVED
    
    private Long openedById;
    private String openedByName;
    private String openedByRole;
    
    private LocalDateTime createdAt;
    private LocalDateTime resolvedAt;
    private String resolutionNote;
    
    private Double tenantRefundAmount;
    private Double landlordDeductionAmount;
    private String openTxHash;
    private String resolutionTxHash;
    private String resolutionHash;
    private String previousContractStatus;

    public static DisputeResponse from(ContractDispute dispute) {
        return DisputeResponse.builder()
                .id(dispute.getId())
                .contractId(dispute.getContract() != null ? dispute.getContract().getId() : null)
                .contractSmartContractAddress(dispute.getContract() != null ? dispute.getContract().getSmartContractAddress() : null)
                .roomName(dispute.getContract() != null && dispute.getContract().getRoom() != null ? dispute.getContract().getRoom().getName() : null)
                .propertyId(dispute.getContract() != null && dispute.getContract().getRoom() != null && dispute.getContract().getRoom().getProperty() != null ? dispute.getContract().getRoom().getProperty().getId() : null)
                .violationType(dispute.getViolationType())
                .description(dispute.getDescription())
                .evidenceUrls(dispute.getEvidenceUrls())
                .status(dispute.getStatus())
                .openedById(dispute.getOpenedBy() != null ? dispute.getOpenedBy().getId() : null)
                .openedByName(dispute.getOpenedBy() != null ? dispute.getOpenedBy().getFullName() : null)
                .openedByRole(dispute.getOpenedBy() != null && dispute.getOpenedBy().getRole() != null ? dispute.getOpenedBy().getRole().name() : null)
                .createdAt(dispute.getCreatedAt())
                .resolvedAt(dispute.getResolvedAt())
                .resolutionNote(dispute.getResolutionNote())
                .tenantRefundAmount(dispute.getTenantRefundAmount())
                .landlordDeductionAmount(dispute.getLandlordDeductionAmount())
                .openTxHash(dispute.getOpenTxHash())
                .resolutionTxHash(dispute.getResolutionTxHash())
                .resolutionHash(dispute.getResolutionHash())
                .previousContractStatus(dispute.getPreviousContractStatus())
                .build();
    }
}

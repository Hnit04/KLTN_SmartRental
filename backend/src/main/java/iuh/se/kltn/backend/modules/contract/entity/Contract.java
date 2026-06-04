package iuh.se.kltn.backend.modules.contract.entity;

import iuh.se.kltn.backend.modules.contract.enums.ContractSignMethod;
import iuh.se.kltn.backend.modules.contract.enums.ContractStatus;
import iuh.se.kltn.backend.modules.contract.enums.DepositStatus;
import iuh.se.kltn.backend.modules.property.entity.Room;
import iuh.se.kltn.backend.modules.user.entity.Tenant;
import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;

@Entity
@Table(name = "contracts")
@Data
@NoArgsConstructor
@AllArgsConstructor
public class Contract {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne
    @JoinColumn(name = "tenant_id", nullable = false)
    private Tenant tenant;

    @ManyToOne
    @JoinColumn(name = "room_id", nullable = false)
    private Room room;

    private LocalDateTime signDate;
    private LocalDate startDate;
    private LocalDate endDate;

    private Double actualPrice;
    private Double depositAmount;
    @Enumerated(EnumType.STRING)
    private ContractSignMethod signMethod;
    private String contentUrl;
    private String contractHash;
    private String smartContractAddress;
    private String deployTxHash;
    private String depositTxHash;

    // Các trường Snapshot bảo tồn tính bất biến của hợp đồng
    private Double elecPriceSnapshot;
    private Double waterPriceSnapshot;
    private Double internetPriceSnapshot;
    private Integer latePenaltyPercent;
    
    private String landlordWalletSnapshot;
    private String tenantWalletSnapshot;

    @Enumerated(EnumType.STRING)
    @Column(length = 50)
    private ContractStatus status;

    private String cancelReason;

    private Boolean isCompromised = false;

    private Boolean isTenantSigned = false;
    private Boolean isLandlordSigned = false;

    // ===== PHASE 1 MVP: Blockchain State Machine =====
    @Column(name = "blockchain_state", length = 30)
    private String blockchainState; // On-chain state mirror

    @Column(name = "landlord_sig_hash", length = 255)
    private String landlordSigHash;

    @Column(name = "tenant_sig_hash", length = 255)
    private String tenantSigHash;

    @Column(name = "signing_nonce")
    private Long signingNonce = 0L;

    @Enumerated(EnumType.STRING)
    @Column(length = 50)
    private DepositStatus depositStatus;
    @Column(columnDefinition = "TEXT")
    private String additionalTerms;
    @OneToMany(mappedBy = "contract")
    private List<Bill> bills;

    @OneToMany(mappedBy = "contract")
    private List<ContractMember> members;



    @org.hibernate.annotations.CreationTimestamp
    private LocalDateTime createdAt;

    @org.hibernate.annotations.UpdateTimestamp
    private LocalDateTime updatedAt;

    // ĐỐI SOÁT SEPAY
    @Column(columnDefinition = "boolean default false")
    private Boolean isDepositSettledToLandlord;
    private LocalDateTime depositSettledAt;

    @Column(columnDefinition = "boolean default false")
    private Boolean settlementReminderSent = false;

    // 💰 SETTLEMENT PROPOSAL FIELDS
    @Column(columnDefinition = "TEXT")
    private String settlementItemsJson;

    @Column(columnDefinition = "TEXT")
    private String settlementInspectionNote;

    private Double proposedDeductionAmount;

    @Column(length = 30)
    private String settlementProposalStatus; // PROPOSED, TENANT_ACCEPTED, TENANT_REJECTED, COMPLETED

    private String settlementProposalTxHash;
    private String settlementConsentTxHash;
    private String settlementExecuteTxHash;
}
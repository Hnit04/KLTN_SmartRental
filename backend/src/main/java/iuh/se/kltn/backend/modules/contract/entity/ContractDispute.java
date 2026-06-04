package iuh.se.kltn.backend.modules.contract.entity;

import iuh.se.kltn.backend.modules.user.entity.User;
import jakarta.persistence.*;
import lombok.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "contract_disputes")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ContractDispute {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "contract_id", nullable = false)
    private Contract contract;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "opened_by_id", nullable = false)
    private User openedBy;

    @Column(name = "violation_type", length = 30, nullable = false)
    private String violationType; // DAMAGE, UNAUTHORIZED_USE, NOISE, NON_PAYMENT, OTHER

    @Column(columnDefinition = "TEXT")
    private String description;

    @Column(name = "evidence_hash", length = 66)
    private String evidenceHash;

    @Column(name = "evidence_urls", columnDefinition = "TEXT")
    private String evidenceUrls; // JSON array of image URLs

    @Builder.Default
    @Column(length = 20)
    private String status = "OPEN"; // OPEN, RESOLVED, REJECTED

    @Column(name = "resolution_note", columnDefinition = "TEXT")
    private String resolutionNote;

    @Column(name = "tenant_refund_amount")
    private Double tenantRefundAmount;

    @Column(name = "landlord_deduction_amount")
    private Double landlordDeductionAmount;

    @Column(name = "resolution_hash", length = 66)
    private String resolutionHash;

    @Column(name = "resolution_tx_hash", length = 66)
    private String resolutionTxHash;

    @Column(name = "open_tx_hash", length = 66)
    private String openTxHash;

    @Column(name = "previous_contract_status")
    private String previousContractStatus;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "resolved_by_id")
    private User resolvedBy;

    @Builder.Default
    @Column(name = "created_at")
    private LocalDateTime createdAt = LocalDateTime.now();

    @Column(name = "resolved_at")
    private LocalDateTime resolvedAt;
}

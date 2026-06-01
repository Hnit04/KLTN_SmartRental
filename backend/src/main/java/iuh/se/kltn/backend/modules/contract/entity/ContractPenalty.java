package iuh.se.kltn.backend.modules.contract.entity;

import jakarta.persistence.*;
import lombok.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "contract_penalties")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ContractPenalty {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "contract_id", nullable = false)
    private Contract contract;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "bill_id")
    private Bill bill;

    @Column(name = "penalty_type", length = 30, nullable = false)
    private String penaltyType; // LATE_PAYMENT, DAMAGE, EARLY_TERMINATION

    @Column(nullable = false)
    private Double amount;

    @Column(name = "amount_wei", length = 78)
    private String amountWei;

    @Builder.Default
    @Column(name = "deducted_from_deposit")
    private Boolean deductedFromDeposit = false;

    @Column(name = "tx_hash", length = 66)
    private String txHash;

    @Builder.Default
    @Column(name = "applied_at")
    private LocalDateTime appliedAt = LocalDateTime.now();
}

package iuh.se.kltn.backend.modules.contract.entity;

import jakarta.persistence.*;
import lombok.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "contract_signatures",
       uniqueConstraints = {
           @UniqueConstraint(columnNames = {"contract_id", "signer_role"}),
           @UniqueConstraint(columnNames = {"contract_id", "nonce"})
       })
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ContractSignature {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "contract_id", nullable = false)
    private Contract contract;

    @Column(name = "signer_role", length = 20, nullable = false)
    private String signerRole; // LANDLORD / TENANT

    @Column(name = "signer_address", length = 42, nullable = false)
    private String signerAddress;

    @Column(columnDefinition = "TEXT", nullable = false)
    private String signature; // 0x... (130 hex chars)

    @Column(name = "sig_hash", length = 66, nullable = false)
    private String sigHash; // keccak256(signature)

    @Column(name = "typed_data_json", columnDefinition = "TEXT")
    private String typedDataJson; // Full EIP-712 typed data for audit

    @Column(nullable = false)
    private Long nonce;

    @Column(nullable = false)
    private LocalDateTime deadline;

    @Column(name = "tx_hash", length = 66)
    private String txHash; // Blockchain tx that confirmed

    @Column(name = "verified_at")
    private LocalDateTime verifiedAt;

    @Builder.Default
    @Column(name = "created_at")
    private LocalDateTime createdAt = LocalDateTime.now();
}

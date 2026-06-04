package iuh.se.kltn.backend.modules.contract.entity;

import jakarta.persistence.*;
import lombok.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "contract_state_history")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ContractStateHistory {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "contract_id", nullable = false)
    private Contract contract;

    @Column(name = "from_state", length = 30)
    private String fromState;

    @Column(name = "to_state", length = 30, nullable = false)
    private String toState;

    @Column(name = "actor_address", length = 42)
    private String actorAddress;

    @Column(name = "actor_role", length = 20)
    private String actorRole; // LANDLORD / TENANT / BACKEND / SYSTEM

    @Column(name = "tx_hash", length = 66)
    private String txHash;

    @Column(name = "block_number")
    private Long blockNumber;

    @Column(name = "metadata_json", columnDefinition = "TEXT")
    private String metadataJson;

    @Builder.Default
    @Column(name = "created_at")
    private LocalDateTime createdAt = LocalDateTime.now();
}

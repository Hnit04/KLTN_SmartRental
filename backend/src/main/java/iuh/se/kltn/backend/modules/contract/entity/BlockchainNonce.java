package iuh.se.kltn.backend.modules.contract.entity;

import jakarta.persistence.*;
import lombok.*;
import java.time.LocalDateTime;

/**
 * 🛡️ Distributed nonce management for blockchain transactions.
 * Single row per wallet address. Uses SELECT FOR UPDATE for atomic nonce reservation.
 */
@Entity
@Table(name = "blockchain_nonces")
@Getter @Setter
@NoArgsConstructor @AllArgsConstructor
@Builder
public class BlockchainNonce {

    @Id
    @Column(name = "wallet_address", length = 42)
    private String walletAddress;

    @Column(name = "current_nonce", nullable = false)
    @Builder.Default
    private Long currentNonce = 0L;

    @Column(name = "last_synced_at")
    @Builder.Default
    private LocalDateTime lastSyncedAt = LocalDateTime.now();
}

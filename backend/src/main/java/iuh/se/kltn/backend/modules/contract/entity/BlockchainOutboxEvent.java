package iuh.se.kltn.backend.modules.contract.entity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

import java.time.LocalDateTime;
import java.util.Map;

/**
 * 🛡️ Transactional Outbox Pattern cho Blockchain calls.
 * Thay vì gọi blockchain trực tiếp trong @Transactional,
 * ghi intent vào bảng này → xử lý async bởi OutboxProcessor.
 */
@Entity
@Table(name = "blockchain_outbox_events", indexes = {
    @Index(name = "idx_outbox_status", columnList = "status"),
    @Index(name = "idx_outbox_contract", columnList = "contractId")
}, uniqueConstraints = {
    @UniqueConstraint(name = "uk_outbox_correlation", columnNames = "correlationId")
})
@Getter @Setter
@NoArgsConstructor @AllArgsConstructor
@Builder
public class BlockchainOutboxEvent {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, length = 50)
    private String eventType; // DEPLOY_CONTRACT, END_CONTRACT, PROPOSE_DEDUCTION, CONSENT_END, RECORD_BILL

    @Column(nullable = false, length = 20)
    @Builder.Default
    private String status = "PENDING"; // PENDING, PROCESSING, CONFIRMED, FAILED, DEAD_LETTER

    private Long contractId;

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(columnDefinition = "jsonb", nullable = false)
    private Map<String, Object> payload; // Full parameters for blockchain call

    @Column(length = 100)
    private String txHash;

    @Column(columnDefinition = "text")
    private String result; // Success result (e.g., deployed contract address)

    @Column(columnDefinition = "text")
    private String errorMessage;

    @Builder.Default
    private Integer retryCount = 0;

    @Builder.Default
    private Integer maxRetries = 3;

    @Column(length = 100)
    private String correlationId;

    @Builder.Default
    private LocalDateTime createdAt = LocalDateTime.now();

    @Builder.Default
    private LocalDateTime updatedAt = LocalDateTime.now();

    private LocalDateTime processedAt;
    private LocalDateTime confirmedAt;

    // 🛡️ Phase 2: Exponential backoff support
    private LocalDateTime nextAttemptAt;
    private LocalDateTime txSubmittedAt;

    // Helper methods
    public boolean canRetry() {
        return retryCount < maxRetries;
    }

    public void markProcessing() {
        this.status = "PROCESSING";
        this.updatedAt = LocalDateTime.now();
    }

    public void markConfirmed(String result) {
        this.status = "CONFIRMED";
        this.result = result;
        this.confirmedAt = LocalDateTime.now();
        this.updatedAt = LocalDateTime.now();
    }

    public void markFailed(String error) {
        this.retryCount++;
        this.errorMessage = error;
        this.updatedAt = LocalDateTime.now();
        if (canRetry()) {
            this.status = "PENDING";
            // 🛡️ Exponential backoff: 10s, 30s, 2m
            long[] delays = {10, 30, 120};
            long delay = delays[Math.min(retryCount - 1, delays.length - 1)];
            this.nextAttemptAt = LocalDateTime.now().plusSeconds(delay);
        } else {
            this.status = "DEAD_LETTER";
        }
    }
}

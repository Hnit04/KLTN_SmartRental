package iuh.se.kltn.backend.modules.contract.entity;

import jakarta.persistence.*;
import lombok.*;
import java.time.LocalDateTime;

/**
 * 🛡️ SECURITY: Bảng lưu trữ webhook đã xử lý để chống duplicate processing.
 * Mỗi referenceNumber từ SePay chỉ được xử lý MỘT LẦN duy nhất.
 */
@Entity
@Table(name = "processed_webhooks", indexes = {
    @Index(name = "idx_pw_reference", columnList = "referenceNumber", unique = true)
})
@Getter @Setter
@NoArgsConstructor @AllArgsConstructor
@Builder
public class ProcessedWebhook {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, unique = true, length = 150)
    private String referenceNumber;

    @Column(length = 50)
    private String webhookType; // DEPOSIT, BILL, VIP

    private Long targetId; // contractId / billId / orderId

    private Double amount;

    @Column(length = 300)
    private String transactionContent;

    @Builder.Default
    private LocalDateTime processedAt = LocalDateTime.now();
}

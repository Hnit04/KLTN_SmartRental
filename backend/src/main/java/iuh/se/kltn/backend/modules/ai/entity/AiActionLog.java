package iuh.se.kltn.backend.modules.ai.entity;

import jakarta.persistence.*;
import lombok.*;
import java.time.LocalDateTime;

/**
 * Bảng ghi Log lịch sử cho AI Observability.
 * Mỗi lần User hỏi AI, một bản ghi được tạo ra để:
 * 1. Theo dõi tỷ lệ Intent đoán đúng/sai.
 * 2. Đo lường Latency (ms) giữa Hybrid Engine vs Legacy SQL.
 * 3. Thu thập Dataset thực tế để Fine-Tune prompt.
 */
@Entity
@Table(name = "ai_action_logs")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class AiActionLog {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "user_id")
    private Long userId;

    @Column(name = "user_role", length = 20)
    private String userRole;

    @Column(name = "raw_query", length = 1000, nullable = false)
    private String rawQuery;

    @Column(name = "predicted_intent", length = 50)
    private String predictedIntent;

    @Column(name = "confidence_score")
    private Double confidenceScore;

    @Column(name = "is_fallback_used")
    private boolean isFallbackUsed;

    @Column(name = "execution_time_ms")
    private Long executionTimeMs;

    @Column(name = "is_success")
    private boolean isSuccess;

    @Column(name = "created_at")
    private LocalDateTime createdAt;

    @PrePersist
    protected void onCreate() {
        this.createdAt = LocalDateTime.now();
    }
}

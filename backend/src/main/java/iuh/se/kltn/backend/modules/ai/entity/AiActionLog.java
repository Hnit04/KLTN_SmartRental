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

    /** Nguồn trả lời: FAQ_HIT, FAQ_SKIPPED, DQE_HIT, SQL_CACHE_HIT, SQL_GENERATED, SECURITY_BLOCKED, LOCATION_GPS, LOCATION_LANDMARK, RESULT_CACHE_HIT */
    @Column(name = "response_source", length = 30)
    private String responseSource;

    /** SQL được sinh ra hoặc lấy từ cache (chỉ lưu khi đi qua SQL pipeline) */
    @Column(name = "generated_sql", length = 2000)
    private String generatedSql;

    /** Số dòng kết quả trả về từ DB */
    @Column(name = "result_row_count")
    private Integer resultRowCount;

    /** Score matching từ FAQ/SQL semantic cache (0.0 - 1.0) */
    @Column(name = "cache_score")
    private Double cacheScore;

    /** Nguồn vị trí: GPS, LANDMARK, NONE */
    @Column(name = "location_source", length = 15)
    private String locationSource;

    @Column(name = "created_at")
    private LocalDateTime createdAt;

    @PrePersist
    protected void onCreate() {
        this.createdAt = LocalDateTime.now();
    }
}

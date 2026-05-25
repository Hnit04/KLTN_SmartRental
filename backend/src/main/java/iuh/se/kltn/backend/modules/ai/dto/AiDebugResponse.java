package iuh.se.kltn.backend.modules.ai.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;
import java.util.Map;

/**
 * Response DTO cho endpoint Admin AI Pipeline Debug.
 * Chứa toàn bộ trace pipeline từ câu hỏi gốc đến SQL cuối cùng.
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class AiDebugResponse {
    private String question;
    private String normalizedQuestion;
    private String finalStatus;       // PASSED, BLOCKED, ERROR
    private boolean llmUsed;
    private String quotaImpact;       // NONE, NORMAL
    private String route;             // DYNAMIC_QUERY_ENGINE_HIT, SQL_CACHE_HIT, LLM_SQL_GENERATION, ...
    private String rawSql;
    private String finalSql;
    private List<AiTraceStep> traceSteps;
    private AiExecutionSummary executionSummary;

    /**
     * Một bước trong pipeline debug.
     */
    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class AiTraceStep {
        private String step;          // PREPROCESSING, INTENT_EXTRACTION, ENTITY_EXTRACTION, ROUTING, NL_SQL_MAPPING, SQL_GENERATION, SECURITY_GATE, FINAL_SQL, EXECUTION_SUMMARY
        private String title;
        private String status;        // PASSED, SKIPPED, BLOCKED, ERROR
        private Object input;
        private Object output;
        private Map<String, Object> metadata;
        private Long durationMs;
    }

    /**
     * Kết quả thực thi SQL (chỉ khi execute=true).
     */
    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class AiExecutionSummary {
        private Boolean executed;
        private Integer rowCount;
        private Integer sampleSize;
        private Long executionTimeMs;
        private String error;
    }

    /**
     * Một mapping từ cụm từ tiếng Việt sang thành phần SQL.
     */
    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class NlSqlMapping {
        private String phrase;
        private String sqlPart;
        private String explanation;
    }
}

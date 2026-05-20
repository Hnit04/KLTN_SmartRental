package iuh.se.kltn.backend.modules.ai.repository;

import iuh.se.kltn.backend.modules.ai.entity.AiActionLog;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface AiActionLogRepository extends JpaRepository<AiActionLog, Long> {

    /**
     * Lấy danh sách log theo role, hữu ích khi phân tích hành vi theo nhóm.
     */
    List<AiActionLog> findByUserRole(String userRole);

    /**
     * Lấy những câu hỏi mà AI đoán sai (confidence thấp),
     * giúp kỹ sư thu thập dữ liệu Fine-Tune.
     */
    List<AiActionLog> findByConfidenceScoreLessThan(Double threshold);

    /**
     * Lấy những lần AI phải fallback về SQL cũ.
     */
    List<AiActionLog> findByIsFallbackUsedTrue();

    /**
     * Lấy 50 log gần nhất cho dashboard Observability.
     */
    List<AiActionLog> findTop50ByOrderByCreatedAtDesc();

    /**
     * Lấy log gần nhất với limit tùy chỉnh qua Pageable.
     */
    List<AiActionLog> findAllByOrderByCreatedAtDesc(org.springframework.data.domain.Pageable pageable);
}

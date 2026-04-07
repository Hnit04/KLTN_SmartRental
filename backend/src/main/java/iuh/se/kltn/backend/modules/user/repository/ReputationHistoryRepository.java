package iuh.se.kltn.backend.modules.user.repository;

import iuh.se.kltn.backend.modules.user.entity.ReputationHistory;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface ReputationHistoryRepository extends JpaRepository<ReputationHistory, Long> {
    List<ReputationHistory> findByUserIdOrderByCreatedAtDesc(Long userId);
    
    // Check if a specific action was already taken (e.g., EKYC_VERIFIED to avoid giving points twice)
    boolean existsByUserIdAndActionType(Long userId, iuh.se.kltn.backend.modules.user.enums.ReputationAction actionType);
}

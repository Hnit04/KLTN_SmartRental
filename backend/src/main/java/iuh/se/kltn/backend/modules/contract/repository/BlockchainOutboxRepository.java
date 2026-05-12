package iuh.se.kltn.backend.modules.contract.repository;

import iuh.se.kltn.backend.modules.contract.entity.BlockchainOutboxEvent;
import jakarta.persistence.LockModeType;
import jakarta.persistence.QueryHint;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.jpa.repository.QueryHints;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface BlockchainOutboxRepository extends JpaRepository<BlockchainOutboxEvent, Long> {

    /**
     * 🛡️ SELECT FOR UPDATE SKIP LOCKED — chỉ lấy event chưa bị lock bởi instance khác.
     * Đảm bảo exactly-once execution trong multi-instance environment.
     */
    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @QueryHints({@QueryHint(name = "jakarta.persistence.lock.timeout", value = "-2")}) // SKIP LOCKED
    @Query("SELECT e FROM BlockchainOutboxEvent e WHERE e.status = 'PENDING' ORDER BY e.createdAt ASC")
    List<BlockchainOutboxEvent> findPendingEventsForProcessing();

    List<BlockchainOutboxEvent> findByContractIdAndEventType(Long contractId, String eventType);

    List<BlockchainOutboxEvent> findByStatus(String status);

    long countByStatus(String status);
}

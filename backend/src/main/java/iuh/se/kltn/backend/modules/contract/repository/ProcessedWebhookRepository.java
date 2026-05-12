package iuh.se.kltn.backend.modules.contract.repository;

import iuh.se.kltn.backend.modules.contract.entity.ProcessedWebhook;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface ProcessedWebhookRepository extends JpaRepository<ProcessedWebhook, Long> {
    boolean existsByReferenceNumber(String referenceNumber);
}

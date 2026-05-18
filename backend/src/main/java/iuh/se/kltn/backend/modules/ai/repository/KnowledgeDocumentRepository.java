package iuh.se.kltn.backend.modules.ai.repository;

import iuh.se.kltn.backend.modules.ai.entity.KnowledgeDocument;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Collection;
import java.util.List;

@Repository
public interface KnowledgeDocumentRepository extends JpaRepository<KnowledgeDocument, String> {

    List<KnowledgeDocument> findByStatusInOrderByUpdatedAtDesc(Collection<String> statuses);

    long countByStatusIn(Collection<String> statuses);
}

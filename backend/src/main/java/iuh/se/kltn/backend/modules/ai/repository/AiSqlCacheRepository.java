package iuh.se.kltn.backend.modules.ai.repository;

import iuh.se.kltn.backend.modules.ai.entity.AiSqlCache;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface AiSqlCacheRepository extends JpaRepository<AiSqlCache, Long> {
    Optional<AiSqlCache> findByQuestion(String question);
}
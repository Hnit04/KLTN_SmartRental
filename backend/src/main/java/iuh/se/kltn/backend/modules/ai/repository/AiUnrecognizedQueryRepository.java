/*
 * Decompiled with CFR 0.152.
 * 
 * Could not load the following classes:
 *  org.springframework.data.jpa.repository.JpaRepository
 */
package iuh.se.kltn.backend.modules.ai.repository;

import iuh.se.kltn.backend.modules.ai.entity.AiUnrecognizedQuery;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;

public interface AiUnrecognizedQueryRepository
extends JpaRepository<AiUnrecognizedQuery, Long> {
    public List<AiUnrecognizedQuery> findByStatusOrderByCreatedAtDesc(String var1);

    public long countByStatus(String var1);
}

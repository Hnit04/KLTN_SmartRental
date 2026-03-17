package iuh.se.kltn.backend.modules.user.repository;

import iuh.se.kltn.backend.modules.user.entity.TenantPreference;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface TenantPreferenceRepository extends JpaRepository<TenantPreference, Long> {
    Optional<TenantPreference> findByTenantId(Long tenantId);
}

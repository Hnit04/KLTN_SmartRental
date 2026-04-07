package iuh.se.kltn.backend.modules.property.repository;

import iuh.se.kltn.backend.modules.property.entity.Property;
import iuh.se.kltn.backend.modules.property.enums.PropertyStatus;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.List;

@Repository
public interface PropertyRepository extends JpaRepository<Property, Long> {
    List<Property> findByLandlordId(Long landlordId);
    List<Property> findByLandlordUsername(String username);
    List<Property> findByDistrictContainingIgnoreCase(String district);
    Page<Property> findByStatus(PropertyStatus status, Pageable pageable);
    List<Property> findByStatus(PropertyStatus status);
}
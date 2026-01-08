package iuh.se.kltn.backend.modules.property.repository;

import iuh.se.kltn.backend.modules.property.entity.Property;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.List;

@Repository
public interface PropertyRepository extends JpaRepository<Property, Long> {
    List<Property> findByLandlordId(Long landlordId);
    List<Property> findByDistrictContainingIgnoreCase(String district);
}
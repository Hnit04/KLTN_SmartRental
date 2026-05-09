package iuh.se.kltn.backend.modules.property.repository;

import iuh.se.kltn.backend.modules.property.entity.Property;
import iuh.se.kltn.backend.modules.property.enums.PropertyStatus;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;
import java.util.List;
import java.util.Map;

@Repository
public interface PropertyRepository extends JpaRepository<Property, Long> {
    @org.springframework.data.jpa.repository.EntityGraph(attributePaths = {"landlord"})
    List<Property> findByLandlordIdOrderByCreatedAtDesc(Long landlordId);
    @org.springframework.data.jpa.repository.EntityGraph(attributePaths = {"landlord"})
    List<Property> findByLandlordUsername(String username);
    List<Property> findByDistrictContainingIgnoreCase(String district);
    @org.springframework.data.jpa.repository.EntityGraph(attributePaths = {"landlord"})
    Page<Property> findByStatus(PropertyStatus status, Pageable pageable);
    @org.springframework.data.jpa.repository.EntityGraph(attributePaths = {"landlord"})
    List<Property> findByStatus(PropertyStatus status);

    long countByLandlordId(Long landlordId);
    /**
     * Tìm phòng trọ gần một tọa độ cho trước, sử dụng công thức Haversine.
     * - Chỉ lấy phòng AVAILABLE trong property APPROVED
     * - Sắp xếp theo khoảng cách tăng dần
     * - Trả về tối đa 10 kết quả
     */
    @Query(value = """
        SELECT r.id AS room_id, r.name, r.price, r.images, r.area, r.status AS room_status,
               p.name AS property_name, p.address, p.district, p.city,
               p.latitude, p.longitude,
               ROUND(
                 6371 * ACOS(
                   LEAST(1.0, COS(RADIANS(:lat)) * COS(RADIANS(p.latitude)) *
                   COS(RADIANS(p.longitude) - RADIANS(:lng)) +
                   SIN(RADIANS(:lat)) * SIN(RADIANS(p.latitude)))
                 ), 2
               ) AS distance_km
        FROM rooms r
        JOIN properties p ON r.property_id = p.id
        WHERE p.latitude IS NOT NULL AND p.longitude IS NOT NULL
          AND r.status = 'AVAILABLE'
          AND p.status = 'APPROVED'
        HAVING distance_km <= :radius
        ORDER BY distance_km ASC
        LIMIT 10
        """, nativeQuery = true)
    List<Map<String, Object>> findNearbyRooms(
            @Param("lat") double latitude,
            @Param("lng") double longitude,
            @Param("radius") double radiusKm
    );
}
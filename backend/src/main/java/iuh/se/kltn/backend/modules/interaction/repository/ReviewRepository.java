package iuh.se.kltn.backend.modules.interaction.repository;

import iuh.se.kltn.backend.modules.contract.entity.Contract;
import iuh.se.kltn.backend.modules.interaction.entity.Review;
import iuh.se.kltn.backend.modules.user.entity.User;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface ReviewRepository extends JpaRepository<Review, Long> {

    // Lay danh sach review cua mot chu nha (Target = Landlord)
    List<Review> findByTargetIdOrderByCreatedAtDesc(Long targetId);

    List<Review> findByContract_Room_Property_IdOrderByCreatedAtDesc(Long propertyId);

    // Kiem tra xem user nay da review hop dong nay chua
    boolean existsByContractAndReviewer(Contract contract, User reviewer);

    @Query("""
            SELECT r.contract.room.property.id, AVG(r.rating), COUNT(r)
            FROM Review r
            WHERE r.contract.room.property.id IN :propertyIds
            GROUP BY r.contract.room.property.id
            """)
    List<Object[]> aggregateRatingsByPropertyIds(@Param("propertyIds") List<Long> propertyIds);

    @Query("SELECT COALESCE(AVG(r.rating), 4.2) FROM Review r")
    Double findSystemAverageRating();
}

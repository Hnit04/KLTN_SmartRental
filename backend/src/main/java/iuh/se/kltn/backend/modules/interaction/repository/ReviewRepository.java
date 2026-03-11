package iuh.se.kltn.backend.modules.interaction.repository;

import iuh.se.kltn.backend.modules.contract.entity.Contract;
import iuh.se.kltn.backend.modules.interaction.entity.Review;
import iuh.se.kltn.backend.modules.user.entity.User;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface ReviewRepository extends JpaRepository<Review, Long> {

    // Lấy danh sách review của một chủ nhà (Target = Landlord)
    List<Review> findByTargetIdOrderByCreatedAtDesc(Long targetId);

    // Kiểm tra xem user này đã review hợp đồng này chưa
    boolean existsByContractAndReviewer(Contract contract, User reviewer);
}
package iuh.se.kltn.backend.modules.subscription.repository;

import iuh.se.kltn.backend.modules.subscription.entity.VipOrder;
import iuh.se.kltn.backend.modules.subscription.enums.OrderStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.List;

@Repository
public interface VipOrderRepository extends JpaRepository<VipOrder, Long> {
    List<VipOrder> findByLandlordIdOrderByCreatedAtDesc(Long landlordId);

    List<VipOrder> findByStatusAndCreatedAtBefore(OrderStatus status, LocalDateTime before);
}

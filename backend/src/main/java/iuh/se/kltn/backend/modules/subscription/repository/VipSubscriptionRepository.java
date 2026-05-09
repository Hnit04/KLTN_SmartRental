package iuh.se.kltn.backend.modules.subscription.repository;

import iuh.se.kltn.backend.modules.subscription.entity.VipSubscription;
import iuh.se.kltn.backend.modules.subscription.enums.VipTier;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

@Repository
public interface VipSubscriptionRepository extends JpaRepository<VipSubscription, Long> {
    Optional<VipSubscription> findByLandlordId(Long landlordId);

    // Tìm subscriptions đã hết hạn nhưng chưa hạ về FREE
    List<VipSubscription> findByTierNotAndEndDateBefore(VipTier tier, LocalDateTime before);
}

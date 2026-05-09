package iuh.se.kltn.backend.modules.subscription.entity;

import iuh.se.kltn.backend.modules.subscription.enums.VipTier;
import iuh.se.kltn.backend.modules.user.entity.Landlord;
import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.time.LocalDateTime;

@Entity
@Table(name = "vip_subscriptions")
@Data
@NoArgsConstructor
@AllArgsConstructor
public class VipSubscription {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @OneToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "landlord_id", nullable = false, unique = true)
    private Landlord landlord;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private VipTier tier = VipTier.FREE;

    private LocalDateTime startDate;
    private LocalDateTime endDate;

    @CreationTimestamp
    @Column(updatable = false)
    private LocalDateTime createdAt;

    @UpdateTimestamp
    private LocalDateTime updatedAt;

    /**
     * Kiểm tra gói VIP còn hiệu lực không.
     * FREE luôn active (không có thời hạn).
     */
    public boolean isActive() {
        if (tier == VipTier.FREE) return true;
        return endDate != null && endDate.isAfter(LocalDateTime.now());
    }

    /**
     * Lấy tier thực tế (nếu hết hạn → trả FREE).
     */
    public VipTier getEffectiveTier() {
        return isActive() ? tier : VipTier.FREE;
    }
}

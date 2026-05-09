package iuh.se.kltn.backend.modules.subscription.entity;

import iuh.se.kltn.backend.modules.subscription.enums.OrderStatus;
import iuh.se.kltn.backend.modules.subscription.enums.VipTier;
import iuh.se.kltn.backend.modules.user.entity.Landlord;
import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.hibernate.annotations.CreationTimestamp;

import java.time.LocalDateTime;

@Entity
@Table(name = "vip_orders")
@Data
@NoArgsConstructor
@AllArgsConstructor
public class VipOrder {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "landlord_id", nullable = false)
    private Landlord landlord;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private VipTier tier;

    @Column(nullable = false)
    private Long amount; // Số tiền (VND)

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private OrderStatus status = OrderStatus.PENDING;

    private String paymentRef; // Mã tham chiếu SePay

    @CreationTimestamp
    @Column(updatable = false)
    private LocalDateTime createdAt;

    private LocalDateTime paidAt;

    // Đơn hàng hết hạn sau 15 phút
    public boolean isExpired() {
        return status == OrderStatus.PENDING
                && createdAt != null
                && createdAt.plusMinutes(15).isBefore(LocalDateTime.now());
    }
}

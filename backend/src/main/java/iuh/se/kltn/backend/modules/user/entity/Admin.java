package iuh.se.kltn.backend.modules.user.entity;

import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;

@Entity
@Table(name = "admins")
@Data
@EqualsAndHashCode(callSuper = true)
@NoArgsConstructor

public class Admin extends User {

    @Column(name = "last_action_at")
    private LocalDateTime lastActionAt; // Thời điểm thao tác gần nhất (duyệt tin, xử lý tranh chấp, payout...)

    @Column(name = "total_approved_listings")
    private Integer totalApprovedListings = 0; // Tổng số bài đăng đã duyệt

    @Column(name = "total_resolved_disputes")
    private Integer totalResolvedDisputes = 0; // Tổng số tranh chấp đã phán quyết

    @Column(name = "total_processed_payouts")
    private Integer totalProcessedPayouts = 0; // Tổng số lần quyết toán (Payout) đã thực hiện cho chủ trọ

    public Admin(Long id) {
        this.setId(id);
    }
}
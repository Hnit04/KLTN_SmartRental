package iuh.se.kltn.backend.modules.user.entity;

import iuh.se.kltn.backend.modules.user.enums.ReputationAction;
import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.hibernate.annotations.CreationTimestamp;

import java.time.LocalDateTime;

@Entity
@Table(name = "reputation_histories")
@Data
@NoArgsConstructor
@AllArgsConstructor
public class ReputationHistory {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private ReputationAction actionType;

    @Column(nullable = false)
    private int pointsChanged; // Thể hiện số điểm được cộng hoặc trừ (vd: +5, -10)

    @Column(columnDefinition = "TEXT")
    private String description; // Mô tả chi tiết: "Cộng điểm do đóng tiền đúng hạn hóa đơn #123"

    @CreationTimestamp
    @Column(updatable = false)
    private LocalDateTime createdAt;
}

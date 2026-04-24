package iuh.se.kltn.backend.modules.contract.entity;

import iuh.se.kltn.backend.modules.contract.enums.RequestStatus;
import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.hibernate.annotations.CreationTimestamp;

import java.time.LocalDateTime;

@Entity
@Table(name = "resident_requests")
@Data
@NoArgsConstructor
@AllArgsConstructor
public class ResidentRequest {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne
    @JoinColumn(name = "contract_id", nullable = false)
    private Contract contract;

    @ManyToOne
    @JoinColumn(name = "requester_id", nullable = false)
    private iuh.se.kltn.backend.modules.user.entity.User requester; // Người gửi yêu cầu (thường là chủ hợp đồng)

    @ManyToOne
    @JoinColumn(name = "invitee_id", nullable = false)
    private iuh.se.kltn.backend.modules.user.entity.User invitee;   // Người được mời vào ở cùng

    private String message; // Lời nhắn gửi cho chủ nhà (tùy chọn)

    @Column(name = "request_type", length = 20)
    @Enumerated(EnumType.STRING)
    private iuh.se.kltn.backend.modules.contract.enums.ResidentRequestType requestType = iuh.se.kltn.backend.modules.contract.enums.ResidentRequestType.ADD;

    @Column(length = 50)
    @Enumerated(EnumType.STRING)
    private RequestStatus status = RequestStatus.PENDING;

    @CreationTimestamp
    private LocalDateTime createdAt;
}
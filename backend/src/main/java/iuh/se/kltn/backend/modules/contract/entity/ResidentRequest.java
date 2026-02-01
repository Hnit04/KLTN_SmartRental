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

    private String fullName;
    private String cccdNumber;
    private String phoneNumber;
    private String dateOfBirth;
    private String cccdIssueDate;
    private String cccdIssuePlace;
    private String permanentAddress;

    @Enumerated(EnumType.STRING)
    private RequestStatus status = RequestStatus.PENDING;

    @CreationTimestamp
    private LocalDateTime createdAt;
}
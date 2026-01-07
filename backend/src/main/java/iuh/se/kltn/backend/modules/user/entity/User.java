package iuh.se.kltn.backend.modules.user.entity;


import iuh.se.kltn.backend.common.enums.Role;
import iuh.se.kltn.backend.modules.user.enums.KYCStatus;
import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.time.LocalDateTime;

@Entity
@Table(name = "users")
@Inheritance(strategy = InheritanceType.JOINED)
@Data
@NoArgsConstructor
@AllArgsConstructor
public class User {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(unique = true, nullable = false)
    private String username;

    @Column(nullable = false)
    private String password;

    private String fullName;

    @Column(unique = true)
    private String email;

    private String phoneNumber;

    private String zaloPhone;

    @Column(unique = true)
    private String walletAddress;

    private String avatarUrl;

    private String cccdNumber;

    @Column(columnDefinition = "TEXT")
    private String cccdImages;

    @Column(columnDefinition = "TEXT")
    private String kycMetadata;

    @Enumerated(EnumType.STRING)
    private KYCStatus kycStatus = KYCStatus.PENDING;

    private int reputationScore = 50;

    @Enumerated(EnumType.STRING)
    private Role role;

    @CreationTimestamp
    private LocalDateTime createdAt;

    @UpdateTimestamp
    private LocalDateTime updatedAt;
}
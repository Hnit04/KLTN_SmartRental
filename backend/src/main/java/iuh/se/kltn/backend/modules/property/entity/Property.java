package iuh.se.kltn.backend.modules.property.entity;

import iuh.se.kltn.backend.modules.property.enums.PropertyStatus;
import iuh.se.kltn.backend.modules.user.entity.Landlord;
import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.hibernate.annotations.CreationTimestamp;

import java.time.LocalDateTime;
import java.util.List;

@Entity
@Table(name = "properties")
@Data
@NoArgsConstructor
@AllArgsConstructor
public class Property {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "landlord_id", nullable = false)
    private Landlord landlord;

    private String name;
    private String address;
    private String district;
    private String city;

    // Tọa độ cho Map
    private Double latitude;
    private Double longitude;

    @Column(columnDefinition = "TEXT")
    private String description;

    private Boolean isAiGeneratedDescription;

    // Giá dịch vụ chung
    private Double elecPrice;
    private Double waterPrice;
    private Double internetPrice;

    @Column(columnDefinition = "TEXT")
    private String images;

    @Enumerated(EnumType.STRING)
    private PropertyStatus status = PropertyStatus.PENDING;

    private Integer safetyScore;
    
    @Column(columnDefinition = "TEXT")
    private String moderationReason;

    @CreationTimestamp
    @Column(updatable = false)
    private LocalDateTime createdAt;

    @OneToMany(mappedBy = "property", cascade = CascadeType.ALL)
    private List<Room> rooms;
}
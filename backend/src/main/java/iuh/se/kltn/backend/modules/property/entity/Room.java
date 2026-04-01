package iuh.se.kltn.backend.modules.property.entity;

import iuh.se.kltn.backend.modules.property.enums.PropertyStatus;
import iuh.se.kltn.backend.modules.property.enums.RoomStatus;
import iuh.se.kltn.backend.modules.property.enums.RoomType;
import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Entity
@Table(name = "rooms")
@Data
@NoArgsConstructor
@AllArgsConstructor
public class Room {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "property_id", nullable = false)
    private Property property;

    private String name; // Số phòng
    private Double price;
    private Float area;
    private Integer maxOccupants;
    private Integer currentOccupants;
    
    @Enumerated(EnumType.STRING)
    private RoomType type = RoomType.STUDIO;
    
    // Không gian
    private Boolean hasMezzanine = false;
    private Boolean hasBalcony = false;

    @Enumerated(EnumType.STRING)
    private RoomStatus status = RoomStatus.AVAILABLE;

    @Column(columnDefinition = "TEXT")
    private String amenities; // JSON tiện ích
    @Column(columnDefinition = "TEXT")
    private String defaultTerms;
    @Column(columnDefinition = "TEXT")
    private String images; // JSON ảnh phòng
    @Column(columnDefinition = "TEXT")
    private String description;

    @Enumerated(EnumType.STRING)
    private PropertyStatus approvalStatus = PropertyStatus.PENDING;

    private String metaDataHash;

    private Integer safetyScore;

    @Column(columnDefinition = "TEXT")
    private String moderationReason;
}
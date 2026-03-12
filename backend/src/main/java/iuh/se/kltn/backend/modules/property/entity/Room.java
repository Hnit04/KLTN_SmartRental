package iuh.se.kltn.backend.modules.property.entity;

import iuh.se.kltn.backend.modules.property.enums.RoomStatus;
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

    @Enumerated(EnumType.STRING)
    private RoomStatus status = RoomStatus.AVAILABLE;

    @Column(columnDefinition = "TEXT")
    private String amenities; // JSON tiện ích
    @Column(columnDefinition = "TEXT")
    private String defaultTerms;
    @Column(columnDefinition = "TEXT")
    private String images; // JSON ảnh phòng

    private String metaDataHash;
}
package iuh.se.kltn.backend.modules.user.entity;

import jakarta.persistence.*;
import lombok.*;

@Entity
@Table(name = "tenant_preferences")
@Data
@NoArgsConstructor
@AllArgsConstructor
public class TenantPreference {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @OneToOne
    @JoinColumn(name = "tenant_id", nullable = false)
    private Tenant tenant;

    private Double targetPriceMin;
    private Double targetPriceMax;
    private String preferredLocation;
    private Boolean hasPet;

    @Column(columnDefinition = "TEXT")
    private String amenitiesRef;
}
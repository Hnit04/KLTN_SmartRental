package iuh.se.kltn.backend.modules.contract.entity;

import iuh.se.kltn.backend.modules.contract.enums.ContractSignMethod;
import iuh.se.kltn.backend.modules.contract.enums.ContractStatus;
import iuh.se.kltn.backend.modules.contract.enums.DepositStatus;
import iuh.se.kltn.backend.modules.property.entity.Room;
import iuh.se.kltn.backend.modules.user.entity.Tenant;
import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;

@Entity
@Table(name = "contracts")
@Data
@NoArgsConstructor
@AllArgsConstructor
public class Contract {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne
    @JoinColumn(name = "tenant_id", nullable = false)
    private Tenant tenant;

    @ManyToOne
    @JoinColumn(name = "room_id", nullable = false)
    private Room room;

    private LocalDateTime signDate;
    private LocalDate startDate;
    private LocalDate endDate;

    private Double actualPrice;
    private Double depositAmount;
    @Enumerated(EnumType.STRING)
    private ContractSignMethod signMethod;
    private String contentUrl;
    private String contractHash;
    private String smartContractAddress;
    private String deployTxHash;

    @Enumerated(EnumType.STRING)
    private ContractStatus status;

    @Enumerated(EnumType.STRING)
    private DepositStatus depositStatus;
    @Column(columnDefinition = "TEXT")
    private String additionalTerms;
    @OneToMany(mappedBy = "contract")
    private List<Bill> bills;

}
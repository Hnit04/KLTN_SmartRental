package iuh.se.kltn.backend.modules.contract.entity;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import java.time.LocalDate;

@Entity
@Table(name = "contract_members")
@Data
@NoArgsConstructor
@AllArgsConstructor
public class ContractMember {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne
    @JoinColumn(name = "contract_id", nullable = false)
    private Contract contract;

    @ManyToOne
    @JoinColumn(name = "user_id", nullable = false)
    private iuh.se.kltn.backend.modules.user.entity.User user;

    private LocalDate joinedDate;
    private LocalDate leftDate;
}
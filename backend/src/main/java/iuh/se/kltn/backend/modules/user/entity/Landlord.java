package iuh.se.kltn.backend.modules.user.entity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.envers.Audited;

@Entity
@Table(name = "landlords")
@Data
@EqualsAndHashCode(callSuper = true)
@NoArgsConstructor
@AllArgsConstructor
@Audited
public class Landlord extends User {
    private String businessLicenseUrl;
}
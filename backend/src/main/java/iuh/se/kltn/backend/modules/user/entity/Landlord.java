package iuh.se.kltn.backend.modules.user.entity;

import jakarta.persistence.*;
import lombok.*;

@Entity
@Table(name = "landlords")
@Data
@EqualsAndHashCode(callSuper = true)
@NoArgsConstructor
@AllArgsConstructor
public class Landlord extends User {
    private String businessLicenseUrl;
}
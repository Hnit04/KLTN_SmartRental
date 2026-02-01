package iuh.se.kltn.backend.modules.user.entity;

import jakarta.persistence.*;
import lombok.*;

@Entity
@Table(name = "admins")
@Data
@EqualsAndHashCode(callSuper = true)
@NoArgsConstructor

public class Admin extends User {

    public Admin(Long id) {
        this.setId(id);
    }
}
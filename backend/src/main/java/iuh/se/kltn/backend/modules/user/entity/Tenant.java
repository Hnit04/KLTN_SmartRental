package iuh.se.kltn.backend.modules.user.entity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.envers.Audited;

@Entity
@Table(name = "tenants")
@Data
@EqualsAndHashCode(callSuper = true)
@NoArgsConstructor
@Audited
public class Tenant extends User {
    private String occupation; // Nghề nghiệp hiện tại (Sinh viên, Người đi làm...)
    private String workplaceOrUniversity; // Nơi làm việc hoặc Trường học
    private String emergencyContactName; // Tên người liên hệ khẩn cấp
    private String emergencyContactPhone; // Số điện thoại liên hệ khẩn cấp
}

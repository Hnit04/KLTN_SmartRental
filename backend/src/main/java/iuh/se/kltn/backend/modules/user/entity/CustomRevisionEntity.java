package iuh.se.kltn.backend.modules.user.entity;

import jakarta.persistence.*;
import lombok.Data;
import org.hibernate.envers.RevisionEntity;
import org.hibernate.envers.RevisionNumber;
import org.hibernate.envers.RevisionTimestamp;

@Entity
@Table(name = "revinfo_custom")
@RevisionEntity(UserRevisionListener.class) // Gọi đến Listener ở bước 2
@Data
public class CustomRevisionEntity {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @RevisionNumber
    private int id;

    @RevisionTimestamp
    private long timestamp;

    // Cột bạn muốn lưu thêm
    private String modifiedBy;
    private String modifiedByFullName;
    private String auditRemark; // Có thể dùng để lưu lý do chung nếu cần
}
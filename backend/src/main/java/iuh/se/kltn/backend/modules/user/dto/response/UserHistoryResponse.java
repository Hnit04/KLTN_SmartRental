package iuh.se.kltn.backend.modules.user.dto.response;

import lombok.Data;

import java.time.LocalDateTime;
import java.util.List;

@Data
public class UserHistoryResponse {
    private Long id;
    private String fullName;
    private String email;
    private String phoneNumber;
    private boolean isLocked;
    private LocalDateTime lockUntil;
    private List<String> lockReason;
    
    // Thông tin audit
    private String modifiedBy;
    private String modifiedByFullName;
    private LocalDateTime modifiedAt;
    private String auditRemark;      // nếu sau này bạn muốn ghi chú thêm
}
package iuh.se.kltn.backend.modules.user.dto.response;

import iuh.se.kltn.backend.common.enums.Role;
import iuh.se.kltn.backend.modules.user.enums.KYCStatus;
import jakarta.persistence.Column;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;

@Data
@AllArgsConstructor
@NoArgsConstructor
public class UserRe {
    private boolean isLocked;
    private LocalDateTime lockedAt;
    private LocalDateTime lockUntil;
    private List<String> lockReason;
}
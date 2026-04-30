package iuh.se.kltn.backend.modules.user.dto.response;


import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
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
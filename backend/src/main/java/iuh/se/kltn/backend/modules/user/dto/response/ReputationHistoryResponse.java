package iuh.se.kltn.backend.modules.user.dto.response;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class ReputationHistoryResponse {
    private Long id;
    private Long userId;
    private String actionType;
    private int pointsChanged;
    private String description;
    private LocalDateTime createdAt;
}

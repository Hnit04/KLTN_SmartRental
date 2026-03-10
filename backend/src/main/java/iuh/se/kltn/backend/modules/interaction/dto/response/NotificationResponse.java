package iuh.se.kltn.backend.modules.interaction.dto.response;

import com.fasterxml.jackson.annotation.JsonProperty;
import iuh.se.kltn.backend.modules.interaction.enums.NotificationType;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import java.time.LocalDateTime;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class NotificationResponse {
    private Long id;
    private String title;
    private String message;
    private NotificationType type;
    private Long referenceId;
    @JsonProperty("isRead")
    private boolean isRead;
    private LocalDateTime createdAt;
}
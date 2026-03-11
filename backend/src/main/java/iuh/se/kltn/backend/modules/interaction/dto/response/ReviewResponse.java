package iuh.se.kltn.backend.modules.interaction.dto.response;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class ReviewResponse {
    private Long id;
    private Long contractId;
    private String roomName;
    private Long reviewerId;
    private String reviewerName;
    private String reviewerAvatar; // Nếu có
    private Integer rating;
    private String comment;
    private LocalDateTime createdAt;
}
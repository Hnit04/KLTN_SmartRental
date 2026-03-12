package iuh.se.kltn.backend.modules.interaction.dto.request;

import lombok.Data;

@Data
public class ReviewRequest {
    private Long contractId;
    private Integer rating;
    private String comment;
}
package iuh.se.kltn.backend.modules.interaction.dto.request;

import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;
import jakarta.validation.constraints.Size;
import lombok.Data;

@Data
public class ReviewRequest {
    @NotNull(message = "Contract ID is required")
    @Positive(message = "Contract ID must be greater than 0")
    private Long contractId;

    @NotNull(message = "Rating is required")
    @Min(value = 1, message = "Rating must be from 1 to 5")
    @Max(value = 5, message = "Rating must be from 1 to 5")
    private Integer rating;

    @Size(max = 2000, message = "Comment is too long")
    private String comment;
}

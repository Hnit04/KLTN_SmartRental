package iuh.se.kltn.backend.modules.contract.dto.request;

import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;
import jakarta.validation.constraints.PositiveOrZero;
import jakarta.validation.constraints.Size;
import lombok.Data;
import java.time.LocalDateTime;

@Data
public class BillRequest {
    @NotNull(message = "Contract ID is required")
    @Positive(message = "Contract ID must be greater than 0")
    private Long contractId;

    @NotNull(message = "Month is required")
    @Min(value = 1, message = "Month must be between 1 and 12")
    @Max(value = 12, message = "Month must be between 1 and 12")
    private Integer month;

    @NotNull(message = "Year is required")
    @Min(value = 2000, message = "Year is invalid")
    @Max(value = 2100, message = "Year is invalid")
    private Integer year;

    @NotNull(message = "Old electric index is required")
    @PositiveOrZero(message = "Old electric index must be >= 0")
    private Integer oldElecIndex;

    @NotNull(message = "New electric index is required")
    @PositiveOrZero(message = "New electric index must be >= 0")
    private Integer newElecIndex;

    @NotNull(message = "Old water index is required")
    @PositiveOrZero(message = "Old water index must be >= 0")
    private Integer oldWaterIndex;

    @NotNull(message = "New water index is required")
    @PositiveOrZero(message = "New water index must be >= 0")
    private Integer newWaterIndex;

    @NotNull(message = "Deadline is required")
    private LocalDateTime deadline;

    @Size(max = 1000, message = "Electric meter image URL is too long")
    private String elecMeterImageUrl;

    @Size(max = 1000, message = "Water meter image URL is too long")
    private String waterMeterImageUrl;

    @PositiveOrZero(message = "Additional fee must be >= 0")
    private Double additionalFee;

    @PositiveOrZero(message = "Discount amount must be >= 0")
    private Double discountAmount;

    @Size(max = 2000, message = "Note is too long")
    private String note;

    private Boolean isMeterReset;
}

package iuh.se.kltn.backend.modules.contract.dto.request;

import iuh.se.kltn.backend.modules.contract.enums.ContractSignMethod;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.Future;
import jakarta.validation.constraints.FutureOrPresent;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;
import jakarta.validation.constraints.Size;
import lombok.Data;
import java.time.LocalDate;

@Data
public class ContractRequest {
    @NotNull(message = "Room ID is required")
    @Positive(message = "Room ID must be greater than 0")
    private Long roomId;

    @NotNull(message = "Start date is required")
    @FutureOrPresent(message = "Start date must be today or in the future")
    private LocalDate startDate;

    @NotNull(message = "End date is required")
    @Future(message = "End date must be in the future")
    private LocalDate endDate;

    @NotNull(message = "Deposit amount is required")
    @DecimalMin(value = "0.0", message = "Deposit amount must be >= 0")
    private Double depositAmount;

    @NotNull(message = "Sign method is required")
    private ContractSignMethod signMethod;

    @Email(message = "Tenant email is invalid")
    private String tenantEmail;

    @Size(max = 5000, message = "Additional terms are too long")
    private String additionalTerms;
}

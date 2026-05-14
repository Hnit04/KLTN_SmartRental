package iuh.se.kltn.backend.modules.interaction.dto.request;

import com.fasterxml.jackson.annotation.JsonAlias;
import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.Data;

@Data
@JsonIgnoreProperties(ignoreUnknown = true)
public class AppointmentStatusUpdateRequest {
    @NotBlank(message = "Status is required")
    @Size(max = 30, message = "Status is too long")
    @JsonAlias({"newStatus", "appointmentStatus"})
    private String status;
}

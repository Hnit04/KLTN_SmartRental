package iuh.se.kltn.backend.modules.ai.dto.request;

import com.fasterxml.jackson.annotation.JsonAlias;
import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;
import jakarta.validation.constraints.Size;
import lombok.Data;

@Data
@JsonIgnoreProperties(ignoreUnknown = true)
public class AiReminderApprovalRequest {
    @NotNull(message = "tenantId is required")
    @Positive(message = "tenantId must be greater than 0")
    @JsonAlias({"tenant_id"})
    private Long tenantId;

    @NotNull(message = "billId is required")
    @Positive(message = "billId must be greater than 0")
    @JsonAlias({"bill_id"})
    private Long billId;

    @NotBlank(message = "draftedMessage is required")
    @Size(max = 5000, message = "draftedMessage is too long")
    @JsonAlias({"message", "content"})
    private String draftedMessage;

    @NotBlank(message = "roomName is required")
    @Size(max = 255, message = "roomName is too long")
    @JsonAlias({"room_name"})
    private String roomName;
}

package iuh.se.kltn.backend.modules.contract.dto.request;

import com.fasterxml.jackson.annotation.JsonAlias;
import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import jakarta.validation.constraints.Size;
import lombok.Data;

@Data
@JsonIgnoreProperties(ignoreUnknown = true)
public class RejectReasonRequest {
    @Size(max = 1000, message = "Reason is too long")
    @JsonAlias({"rejectReason", "note"})
    private String reason;
}

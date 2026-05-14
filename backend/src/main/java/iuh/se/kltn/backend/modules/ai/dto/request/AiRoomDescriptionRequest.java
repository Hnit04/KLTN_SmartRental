package iuh.se.kltn.backend.modules.ai.dto.request;

import com.fasterxml.jackson.annotation.JsonAlias;
import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.Data;

@Data
@JsonIgnoreProperties(ignoreUnknown = true)
public class AiRoomDescriptionRequest {
    @NotBlank(message = "Prompt is required")
    @Size(max = 5000, message = "Prompt is too long")
    @JsonAlias({"keywords", "message"})
    private String prompt;
}

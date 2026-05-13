package iuh.se.kltn.backend.modules.ai.dto.request;

import com.fasterxml.jackson.annotation.JsonAlias;
import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.Data;

@Data
@JsonIgnoreProperties(ignoreUnknown = true)
public class AiChatRequest {
    @NotBlank(message = "Message is required")
    @Size(max = 5000, message = "Message is too long")
    @JsonAlias({"text", "prompt"})
    private String message;

    @Size(max = 200, message = "Session ID is too long")
    @JsonAlias({"session", "conversationId"})
    private String sessionId;
}

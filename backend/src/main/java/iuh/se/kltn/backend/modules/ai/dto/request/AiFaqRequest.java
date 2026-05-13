package iuh.se.kltn.backend.modules.ai.dto.request;

import com.fasterxml.jackson.annotation.JsonAlias;
import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.Data;

@Data
@JsonIgnoreProperties(ignoreUnknown = true)
public class AiFaqRequest {
    @NotBlank(message = "Question is required")
    @Size(max = 5000, message = "Question is too long")
    @JsonAlias({"query"})
    private String question;

    @NotBlank(message = "Answer is required")
    @Size(max = 20000, message = "Answer is too long")
    @JsonAlias({"response"})
    private String answer;
}

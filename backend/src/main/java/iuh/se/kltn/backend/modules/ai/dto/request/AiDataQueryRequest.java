package iuh.se.kltn.backend.modules.ai.dto.request;

import com.fasterxml.jackson.annotation.JsonAlias;
import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.Data;

@Data
@JsonIgnoreProperties(ignoreUnknown = true)
public class AiDataQueryRequest {
    @NotBlank(message = "Question is required")
    @Size(max = 5000, message = "Question is too long")
    @JsonAlias({"query", "message"})
    private String question;

    @JsonAlias({"lat", "latitude"})
    private Double latitude;

    @JsonAlias({"lng", "longitude"})
    private Double longitude;

    private AiPageContext pageContext;
}

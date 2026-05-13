package iuh.se.kltn.backend.modules.ai.dto.request;

import com.fasterxml.jackson.annotation.JsonAlias;
import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.Data;

@Data
@JsonIgnoreProperties(ignoreUnknown = true)
public class AiUpdateCacheRequest {
    @NotBlank(message = "generatedSql is required")
    @Size(max = 20000, message = "generatedSql is too long")
    @JsonAlias({"sql", "querySql"})
    private String generatedSql;
}

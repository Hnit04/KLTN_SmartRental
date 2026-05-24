package iuh.se.kltn.backend.modules.ai.dto.request;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import lombok.Data;

@Data
@JsonIgnoreProperties(ignoreUnknown = true)
public class AiPageContext {
    private String path;
    private String pageType;
    private String entityType;
    private Long entityId;
}

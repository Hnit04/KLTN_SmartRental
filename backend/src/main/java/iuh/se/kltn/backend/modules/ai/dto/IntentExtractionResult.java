package iuh.se.kltn.backend.modules.ai.dto;

import iuh.se.kltn.backend.modules.ai.enums.SystemIntent;
import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.AllArgsConstructor;
import java.util.Map;
import java.util.HashMap;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class IntentExtractionResult {
    private SystemIntent intent;
    private Double confidenceScore;
    private Map<String, Object> params = new HashMap<>();
}

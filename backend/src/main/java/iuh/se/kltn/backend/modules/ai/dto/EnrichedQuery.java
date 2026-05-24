package iuh.se.kltn.backend.modules.ai.dto;

import iuh.se.kltn.backend.modules.ai.enums.SystemIntent;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class EnrichedQuery {
    private SystemIntent intent;

    @Builder.Default
    private Map<String, Object> params = new HashMap<>();

    private boolean shouldAskClarification;
    private String clarificationMessage;

    @Builder.Default
    private List<String> assumptions = new ArrayList<>();

    private String enrichmentReason;
}


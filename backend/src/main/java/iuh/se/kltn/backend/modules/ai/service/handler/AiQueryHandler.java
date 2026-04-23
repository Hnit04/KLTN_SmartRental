package iuh.se.kltn.backend.modules.ai.service.handler;

import iuh.se.kltn.backend.modules.ai.dto.IntentExtractionResult;
import java.util.List;
import java.util.Map;

public interface AiQueryHandler {
    List<Map<String, Object>> handle(IntentExtractionResult intentData, Long userId, String role);
}

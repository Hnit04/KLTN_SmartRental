package iuh.se.kltn.backend.modules.ai.service;

import iuh.se.kltn.backend.modules.ai.config.AiRuntimeProperties;
import iuh.se.kltn.backend.modules.ai.dto.ImageQualityResult;
import iuh.se.kltn.backend.modules.ai.dto.ImageSceneClassificationResult;
import iuh.se.kltn.backend.modules.ai.dto.ModerationResult;
import org.junit.jupiter.api.Test;
import org.springframework.test.util.ReflectionTestUtils;

import java.util.List;

import static org.junit.jupiter.api.Assertions.assertDoesNotThrow;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertTrue;

class ModerationServiceResilienceTest {

    @Test
    void imageInspectorFailure_shouldNotCrashModerationService() {
        ModerationService moderationService = new ModerationService();
        RuleBasedModerationScorer scorer = new RuleBasedModerationScorer();

        AiRuntimeProperties runtime = new AiRuntimeProperties();
        runtime.getModeration().getImageQuality().setEnabled(true);

        ImageQualityInspector brokenInspector = new ImageQualityInspector((url, maxBytes, timeoutMs) -> {
            throw new RuntimeException("mock image fetch error");
        }) {
            @Override
            public ImageQualityResult inspect(List<String> imageUrls) {
                throw new RuntimeException("mock inspector crash");
            }
        };

        ReflectionTestUtils.setField(scorer, "aiRuntimeProperties", runtime);
        ReflectionTestUtils.setField(scorer, "imageQualityInspector", brokenInspector);
        ReflectionTestUtils.setField(moderationService, "ruleBasedModerationScorer", scorer);
        ReflectionTestUtils.setField(moderationService, "aiRuntimeProperties", runtime);
        ReflectionTestUtils.setField(moderationService, "aiLlmMode", "TEMPLATE_ONLY");

        ModerationResult result = assertDoesNotThrow(() -> moderationService.checkContent(
                "Phong tro",
                "Phong dep, co wifi va may lanh.",
                List.of("https://img.example.com/room-1.jpg")
        ));
        assertNotNull(result);
    }

    @Test
    void sceneClassifierFailure_shouldNotCrashModerationService() {
        ModerationService moderationService = new ModerationService();
        RuleBasedModerationScorer scorer = new RuleBasedModerationScorer();

        AiRuntimeProperties runtime = new AiRuntimeProperties();
        runtime.getModeration().getImageQuality().setEnabled(false);
        runtime.getModeration().getSceneClassifier().setEnabled(true);
        runtime.getFeatures().getModeration().setLlmEnabled(false);

        ImageSceneClassifier brokenSceneClassifier = imageUrls -> {
            throw new RuntimeException("mock scene classifier crash");
        };

        ReflectionTestUtils.setField(scorer, "aiRuntimeProperties", runtime);
        ReflectionTestUtils.setField(scorer, "imageQualityInspector", null);
        ReflectionTestUtils.setField(scorer, "imageSceneClassifier", brokenSceneClassifier);

        ReflectionTestUtils.setField(moderationService, "ruleBasedModerationScorer", scorer);
        ReflectionTestUtils.setField(moderationService, "aiRuntimeProperties", runtime);
        ReflectionTestUtils.setField(moderationService, "aiLlmMode", "TEMPLATE_ONLY");

        ModerationResult result = assertDoesNotThrow(() -> moderationService.checkContent(
                "Phong tro",
                "Phong co wifi va may lanh.",
                List.of("https://img.example.com/room-1.jpg", "https://img.example.com/room-2.jpg")
        ));
        assertNotNull(result);
        assertNotNull(result.getReason());
        assertTrue(result.getReason().toLowerCase().contains("scene classifier"));
    }
}

package iuh.se.kltn.backend.modules.ai.service;

import iuh.se.kltn.backend.modules.ai.config.AiRuntimeProperties;
import iuh.se.kltn.backend.modules.ai.dto.ImageSceneClassificationResult;
import org.junit.jupiter.api.Test;
import org.springframework.test.util.ReflectionTestUtils;

import java.util.List;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertTrue;

class OnnxImageSceneClassifierTest {

    @Test
    void disabledSceneClassifier_shouldReturnDisabledResult() {
        OnnxImageSceneClassifier classifier = new OnnxImageSceneClassifier();
        AiRuntimeProperties runtime = new AiRuntimeProperties();
        runtime.getModeration().getSceneClassifier().setEnabled(false);
        ReflectionTestUtils.setField(classifier, "aiRuntimeProperties", runtime);

        ImageSceneClassificationResult result = classifier.classify(List.of("https://res.cloudinary.com/demo/image/upload/a.jpg"));

        assertNotNull(result);
        assertFalse(result.isEnabled());
        assertEquals("DISABLED", result.getSource());
    }

    @Test
    void enabledButMissingModel_shouldReturnUnavailableAndNeedsReview() {
        OnnxImageSceneClassifier classifier = new OnnxImageSceneClassifier();
        AiRuntimeProperties runtime = new AiRuntimeProperties();
        runtime.getModeration().getSceneClassifier().setEnabled(true);
        runtime.getModeration().getSceneClassifier().setModelPath("models/scene-classifier/missing-model.onnx");
        runtime.getModeration().getSceneClassifier().setLabelsPath("models/scene-classifier/missing-labels.txt");
        ReflectionTestUtils.setField(classifier, "aiRuntimeProperties", runtime);

        ImageSceneClassificationResult result = classifier.classify(List.of("https://res.cloudinary.com/demo/image/upload/a.jpg"));

        assertNotNull(result);
        assertTrue(result.isEnabled());
        assertEquals("ONNX_UNAVAILABLE", result.getSource());
        assertTrue(result.isNeedsReview());
        assertTrue(result.getReasons().stream().anyMatch(item -> item != null && item.contains("NEEDS_REVIEW")));
    }

    @Test
    void enabledWithoutImages_shouldReturnNoImageInput() {
        OnnxImageSceneClassifier classifier = new OnnxImageSceneClassifier();
        AiRuntimeProperties runtime = new AiRuntimeProperties();
        runtime.getModeration().getSceneClassifier().setEnabled(true);
        ReflectionTestUtils.setField(classifier, "aiRuntimeProperties", runtime);

        ImageSceneClassificationResult result = classifier.classify(List.of());

        assertNotNull(result);
        assertTrue(result.isEnabled());
        assertEquals("NO_IMAGE_INPUT", result.getSource());
        assertTrue(result.isNeedsReview());
    }
}

package iuh.se.kltn.backend.modules.ai.service;

import iuh.se.kltn.backend.modules.ai.dto.ImageSceneClassificationResult;

import java.util.List;

public interface ImageSceneClassifier {

    ImageSceneClassificationResult classify(List<String> imageUrls);
}

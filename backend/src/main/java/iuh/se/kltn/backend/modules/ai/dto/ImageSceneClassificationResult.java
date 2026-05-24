package iuh.se.kltn.backend.modules.ai.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.ArrayList;
import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ImageSceneClassificationResult {

    private boolean enabled;
    private String source;
    private int requestedCount;
    private int classifiedCount;
    private int unknownCount;
    private int roomLikeCount;
    private int suspiciousCount;
    private boolean needsReview;

    @Builder.Default
    private List<String> reasons = new ArrayList<>();

    @Builder.Default
    private List<ImageScenePrediction> predictions = new ArrayList<>();

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class ImageScenePrediction {
        private String imageUrl;
        private String label;
        private double confidence;
    }
}

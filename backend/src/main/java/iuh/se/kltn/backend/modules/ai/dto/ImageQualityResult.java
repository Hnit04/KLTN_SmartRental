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
public class ImageQualityResult {

    private boolean enabled;
    private int totalImages;
    private int validUrlCount;
    private int invalidUrlCount;
    private int blockedUrlCount;
    private int duplicateUrlCount;
    private int inspectedImageCount;
    private int lowResolutionCount;
    private int lowQualityCount;
    private int downloadFailedCount;
    private boolean needsReview;

    @Builder.Default
    private List<String> reasons = new ArrayList<>();
}

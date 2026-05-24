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
public class ModerationScoreDetail {
    private int totalScore;
    private int contentScore;
    private int imageScore;
    private int completenessScore;
    private int policyScore;
    private String riskLevel;
    @Builder.Default
    private List<String> ruleReasons = new ArrayList<>();
    private String source;
}

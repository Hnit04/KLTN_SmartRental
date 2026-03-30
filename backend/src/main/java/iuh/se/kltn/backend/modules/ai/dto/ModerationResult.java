package iuh.se.kltn.backend.modules.ai.dto;

import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@AllArgsConstructor
@NoArgsConstructor
public class ModerationResult {
    @JsonProperty("isSafe")
    private boolean isSafe;
    private int score;
    private String reason;
}

package iuh.se.kltn.backend.modules.ai.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;
import java.util.Map;

/**
 * Request DTO cho endpoint Admin AI Pipeline Debug.
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class AiDebugRequest {
    private String question;
    private String simulatedRole;    // GUEST, TENANT, LANDLORD
    private Long simulatedUserId;
    @Builder.Default
    private Boolean execute = false;
    @Builder.Default
    private Boolean includePrompt = false;
    private Double latitude;
    private Double longitude;
    private String pageContext;
}

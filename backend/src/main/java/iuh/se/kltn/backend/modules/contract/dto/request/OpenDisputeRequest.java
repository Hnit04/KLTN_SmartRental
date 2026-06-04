package iuh.se.kltn.backend.modules.contract.dto.request;

import jakarta.validation.constraints.NotBlank;
import lombok.Data;

import java.util.List;

@Data
public class OpenDisputeRequest {
    @NotBlank(message = "Loại vi phạm không được để trống")
    private String violationType;
    
    private String description;
    
    // Cloudinary URLs
    private List<String> evidenceUrls;
}

package iuh.se.kltn.backend.modules.ai.dto.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.Data;

@Data
public class RagDocumentRequest {

    @NotBlank(message = "Title is required")
    @Size(max = 255, message = "Title is too long")
    private String title;

    @NotBlank(message = "Content is required")
    @Size(max = 200000, message = "Content is too long")
    private String content;

    @Size(max = 100, message = "Source is too long")
    private String source;

    @Size(max = 50, message = "Version is too long")
    private String version;

    @Size(max = 20, message = "Status is too long")
    private String status;
}

package iuh.se.kltn.backend.modules.interaction.dto.request;

import iuh.se.kltn.backend.modules.interaction.enums.ReportStatus;
import jakarta.validation.constraints.NotNull;
import lombok.Data;

@Data
public class ResolveReportRequest {
    @NotNull(message = "Trạng thái giải quyết không được để trống")
    private ReportStatus status;
    private String adminNotes;
}

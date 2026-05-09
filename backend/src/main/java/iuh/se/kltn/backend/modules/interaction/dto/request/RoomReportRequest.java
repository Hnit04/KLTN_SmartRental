package iuh.se.kltn.backend.modules.interaction.dto.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.Data;
import java.util.List;

@Data
public class RoomReportRequest {
    @NotNull(message = "Mã phòng không được để trống")
    private Long roomId;

    @NotBlank(message = "Lý do không được để trống")
    private String reason;

    private String details;
    private List<String> evidenceUrls;
}

package iuh.se.kltn.backend.modules.interaction.dto.response;

import iuh.se.kltn.backend.modules.interaction.entity.RoomReport;
import iuh.se.kltn.backend.modules.interaction.enums.ReportStatus;
import lombok.Data;

import java.time.LocalDateTime;
import java.util.List;
import java.util.ArrayList;

@Data
public class RoomReportResponse {
    private Long id;
    private Long reporterId;
    private String reporterName;
    private Long roomId;
    private String roomName;
    private Long propertyId;
    private String propertyName;
    private String reason;
    private String details;
    private List<String> evidenceUrls;
    private ReportStatus status;
    private String adminNotes;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;

    public static RoomReportResponse from(RoomReport report) {
        RoomReportResponse response = new RoomReportResponse();
        response.setId(report.getId());
        if (report.getReporter() != null) {
            response.setReporterId(report.getReporter().getId());
            response.setReporterName(report.getReporter().getFullName());
        }
        if (report.getRoom() != null) {
            response.setRoomId(report.getRoom().getId());
            response.setRoomName(report.getRoom().getName());
            if (report.getRoom().getProperty() != null) {
                response.setPropertyId(report.getRoom().getProperty().getId());
                response.setPropertyName(report.getRoom().getProperty().getName());
            }
        }
        response.setReason(report.getReason());
        response.setDetails(report.getDetails());
        
        response.setEvidenceUrls(report.getEvidenceUrls() != null ? report.getEvidenceUrls() : new java.util.ArrayList<>());
        
        response.setStatus(report.getStatus());
        response.setAdminNotes(report.getAdminNotes());
        response.setCreatedAt(report.getCreatedAt());
        response.setUpdatedAt(report.getUpdatedAt());
        return response;
    }
}

package iuh.se.kltn.backend.modules.interaction.controller;

import iuh.se.kltn.backend.modules.interaction.dto.request.ResolveReportRequest;
import iuh.se.kltn.backend.modules.interaction.dto.request.RoomReportRequest;
import iuh.se.kltn.backend.modules.interaction.dto.response.RoomReportResponse;
import iuh.se.kltn.backend.modules.interaction.service.RoomReportService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.security.Principal;
import java.util.List;

@RestController
@RequestMapping("/api")
@RequiredArgsConstructor
public class RoomReportController {

    private final RoomReportService roomReportService;

    /**
     * Tenant gửi báo cáo phòng trọ.
     * Yêu cầu: Đăng nhập + CCCD đã xác thực.
     */
    @PostMapping("/reports")
    @PreAuthorize("hasRole('TENANT')")
    public ResponseEntity<RoomReportResponse> createReport(
            Principal principal,
            @Valid @RequestBody RoomReportRequest request) {
        return ResponseEntity.ok(roomReportService.createReport(principal.getName(), request));
    }

    /**
     * Admin xem danh sách tất cả báo cáo.
     */
    @GetMapping("/admin/reports")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<List<RoomReportResponse>> getAdminReports() {
        return ResponseEntity.ok(roomReportService.getAdminReports());
    }

    /**
     * Admin xử lý (duyệt) một báo cáo.
     */
    @PutMapping("/admin/reports/{id}/resolve")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<RoomReportResponse> resolveReport(
            @PathVariable Long id,
            @Valid @RequestBody ResolveReportRequest request) {
        return ResponseEntity.ok(roomReportService.resolveReport(id, request));
    }
}

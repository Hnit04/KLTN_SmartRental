package iuh.se.kltn.backend.modules.contract.controller;

import iuh.se.kltn.backend.modules.contract.service.AdminSettlementService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/admin/settlements")
public class AdminSettlementController {

    @Autowired
    private AdminSettlementService adminSettlementService;

    // Lấy danh sách các chủ trọ đang có khoản tiền chờ đối soát
    @GetMapping("/pending")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<?> getPendingSettlements() {
        return ResponseEntity.ok(adminSettlementService.getPendingSettlements());
    }

    // Lấy danh sách các đợt đối soát đã hoàn thành (History)
    @GetMapping("/history")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<?> getSettledHistory() {
        return ResponseEntity.ok(adminSettlementService.getSettledHistory());
    }

    // Xem chi tiết các khoản (Hóa đơn/Tiền cọc) chưa đối soát của 1 chủ trọ
    @GetMapping("/{landlordId}/details")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<?> getSettlementDetails(
            @PathVariable Long landlordId,
            @RequestParam(defaultValue = "false") boolean isSettled) {
        return ResponseEntity.ok(adminSettlementService.getLandlordSettlementDetails(landlordId, isSettled));
    }

    // Lấy mã VietQR để Admin quét chuyển tiền cho chủ trọ
    @GetMapping("/{landlordId}/qr-code")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<?> getPayoutQrCode(@PathVariable Long landlordId) {
        return ResponseEntity.ok(adminSettlementService.getPayoutQrCode(landlordId));
    }

    // Xác nhận đã thanh toán (Payout) cho chủ trọ
    @PostMapping("/{landlordId}/payout")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<?> processPayout(@PathVariable Long landlordId) {
        adminSettlementService.payoutToLandlord(landlordId);
        return ResponseEntity.ok(java.util.Map.of(
            "status", "success", 
            "message", "Đã đánh dấu đối soát và thanh toán cho chủ trọ thành công."
        ));
    }
}

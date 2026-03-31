package iuh.se.kltn.backend.modules.contract.controller;

import iuh.se.kltn.backend.common.security.UserPrincipal;
import iuh.se.kltn.backend.modules.contract.dto.response.MonthlyRevenueResponse;
import iuh.se.kltn.backend.modules.contract.dto.request.BillRequest;
import iuh.se.kltn.backend.modules.contract.dto.response.RevenueChartResponse;
import iuh.se.kltn.backend.modules.contract.service.BillService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/bills")
public class BillController {

    @Autowired
    private BillService billService;

    //Chủ trọ tạo hóa đơn tháng
    @PostMapping
    public ResponseEntity<?> createBill(@AuthenticationPrincipal UserPrincipal currentUser,
                                        @RequestBody BillRequest request) {
        return ResponseEntity.ok(billService.createBill(currentUser.getId(), request));
    }

    //Xem hóa đơn của một hợp đồng
    @GetMapping("/contract/{contractId}")
    public ResponseEntity<?> getBillsByContract(@PathVariable Long contractId) {
        return ResponseEntity.ok(billService.getBillsByContract(contractId));
    }
    @GetMapping("/billing-status")
    public ResponseEntity<?> getBillingStatus(
            @AuthenticationPrincipal UserPrincipal currentUser,
            @RequestParam int month,
            @RequestParam int year) {

        // Truyền ID của Chủ trọ đang đăng nhập vào
        return ResponseEntity.ok(billService.getBillingStatus(currentUser.getId(), month, year));
    }

    @GetMapping("/revenue/compare")
    public ResponseEntity<?> getRevenueThisAndLastMonth(
            @AuthenticationPrincipal UserPrincipal currentUser) {

        Map<String, Object> result = billService.getRevenueThisMonthAndLastMonth(
                currentUser.getId());

        return ResponseEntity.ok(result);
    }

    // BillController.java

    @GetMapping("/overdue/stats")
    public ResponseEntity<?> getOverdueStats(
            @AuthenticationPrincipal UserPrincipal currentUser) {

        Map<String, Object> stats = billService.getOverdueStats(currentUser.getId());
        return ResponseEntity.ok(stats);
    }
    // BillController.java

    @GetMapping("/revenue/last-6-months")
    public ResponseEntity<List<RevenueChartResponse>> getRevenueLast6Months(
            @AuthenticationPrincipal UserPrincipal currentUser) {

        List<RevenueChartResponse> data = billService.getRevenueLast6MonthsForChart(
                currentUser.getId()
        );

        return ResponseEntity.ok(data);
    }

    @PostMapping("/{billId}/confirm-web3")
    public ResponseEntity<?> confirmWeb3Payment(@PathVariable Long billId,
                                                @RequestBody Map<String, String> request) {
        String txHash = request.get("txHash");
        return ResponseEntity.ok(billService.confirmWeb3Payment(billId, txHash));
    }

    @PostMapping("/{billId}/tenant-paid")
    public ResponseEntity<?> tenantNotifyPayment(@PathVariable Long billId,
                                                 @AuthenticationPrincipal UserPrincipal currentUser) {
        return ResponseEntity.ok(billService.tenantNotifyPayment(billId, currentUser.getId()));
    }

    @PostMapping("/{billId}/landlord-confirm")
    public ResponseEntity<?> landlordConfirmPayment(@PathVariable Long billId,
                                                    @AuthenticationPrincipal UserPrincipal currentUser) {
        return ResponseEntity.ok(billService.landlordConfirmPayment(billId, currentUser.getId()));
    }
}
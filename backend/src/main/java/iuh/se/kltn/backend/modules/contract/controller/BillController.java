package iuh.se.kltn.backend.modules.contract.controller;

import iuh.se.kltn.backend.common.security.UserPrincipal;
import iuh.se.kltn.backend.modules.contract.dto.request.BillRequest;
import iuh.se.kltn.backend.modules.contract.service.BillService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

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
}
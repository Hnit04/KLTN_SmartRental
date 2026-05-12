package iuh.se.kltn.backend.modules.contract.controller;

import iuh.se.kltn.backend.common.security.UserPrincipal;
import iuh.se.kltn.backend.modules.contract.dto.request.SignContractRequest;
import iuh.se.kltn.backend.modules.contract.service.ContractChangeService;
import iuh.se.kltn.backend.modules.contract.service.ContractService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;
import iuh.se.kltn.backend.modules.contract.dto.request.ChangeRequestDTO;
import iuh.se.kltn.backend.modules.contract.dto.response.ContractResponse;
import iuh.se.kltn.backend.modules.contract.dto.response.DashboardInsightsResponse;
import java.util.List;

@RestController
@RequestMapping("/api/contracts")
public class ContractController {

    @Autowired
    private ContractService contractService;
    @Autowired
    private ContractChangeService contractChangeService;

    // 1. Tạo hợp đồng
    @PostMapping
    public ResponseEntity<?> createContract(@AuthenticationPrincipal UserPrincipal currentUser,
                                            @RequestBody ContractRequest request) {
        return ResponseEntity.ok(contractService.createContract(currentUser.getId(), request));
    }

    // 2. Lấy danh sách của tôi
    @GetMapping("/mine")
    public ResponseEntity<?> getMyContracts(@AuthenticationPrincipal UserPrincipal currentUser) {
        return ResponseEntity.ok(contractService.getMyContracts(currentUser.getId()));
    }

    // 2b. Lấy phòng hiện tại của tenant (hợp đồng ACTIVE hoặc PENDING_SIGNATURE)
    @GetMapping("/my-current-room")
    public ResponseEntity<?> getMyCurrentRoom(@AuthenticationPrincipal UserPrincipal currentUser) {
        var result = contractService.getMyCurrentRoom(currentUser.getId());
        if (result == null) {
            return ResponseEntity.ok(java.util.Collections.singletonMap("message", "Bạn chưa có phòng nào đang thuê."));
        }
        return ResponseEntity.ok(result);
    }

    // 2c. Lấy TẤT CẢ lịch sử thuê của người dùng
    @GetMapping("/history")
    public ResponseEntity<?> getRentalHistory(@AuthenticationPrincipal UserPrincipal currentUser) {
        return ResponseEntity.ok(contractService.getRentalHistory(currentUser.getId()));
    }

    // 3. Lấy chi tiết
    @GetMapping("/{id}")
    public ResponseEntity<?> getContractById(@PathVariable Long id) {
        return ResponseEntity.ok(contractService.getContractById(id));
    }

    @GetMapping("/history/{userId}")
    public ResponseEntity<List<ContractResponse>> getRentalHistory(@PathVariable Long userId) {
        return ResponseEntity.ok(contractService.getRentalHistory(userId));
    }

    // ✅ Lịch sử hợp đồng theo phòng (cho chủ trọ xem lịch sử thuê của phòng)
    @GetMapping("/room/{roomId}/history")
    public ResponseEntity<?> getRoomContractHistory(@PathVariable Long roomId) {
        return ResponseEntity.ok(contractService.getRoomContractHistory(roomId));
    }

    @GetMapping("/dashboard/insights")
    public ResponseEntity<DashboardInsightsResponse> getDashboardInsights(@AuthenticationPrincipal UserPrincipal currentUser) {
        return ResponseEntity.ok(contractService.getDashboardInsights(currentUser.getId()));
    }

    // 3.5. Admin: Lấy tất cả hợp đồng (cho Blockchain Logs)
    @GetMapping("/all")
    public ResponseEntity<?> getAllContracts() {
        return ResponseEntity.ok(contractService.getAllContracts());
    }

    // 3.6. Admin: Xác minh tính toàn vẹn hợp đồng qua Blockchain
    @GetMapping("/{id}/verify")
    public ResponseEntity<?> verifyContract(@PathVariable Long id) {
        try {
            return ResponseEntity.ok(contractService.verifyContract(id));
        } catch (Exception e) {
            return ResponseEntity.status(500).body(java.util.Collections.singletonMap("message", e.getMessage()));
        }
    }

    // 4. Ký hợp đồng (✅ ĐÃ ĐỔI SANG POST VÀ BỔ SUNG currentUser)
    @PostMapping("/{id}/sign")
    public ResponseEntity<?> signContract(@AuthenticationPrincipal UserPrincipal currentUser,
                                          @PathVariable Long id,
                                          @RequestBody SignContractRequest request) {
        return ResponseEntity.ok(contractService.signContract(id, request, currentUser.getId()));
    }

    @PostMapping("/{id}/reject")
    public ResponseEntity<?> rejectContract(@AuthenticationPrincipal UserPrincipal currentUser,
                                          @PathVariable Long id,
                                          @RequestBody(required = false) java.util.Map<String, String> request) {
        String reason = (request != null) ? request.get("reason") : null;
        return ResponseEntity.ok(contractService.rejectContract(id, currentUser.getId(), reason));
    }

    // 5. Đề xuất thay đổi
    @PostMapping("/{id}/change-requests")
    public ResponseEntity<?> requestChange(@AuthenticationPrincipal UserPrincipal currentUser,
                                           @PathVariable Long id,
                                           @RequestBody ChangeRequestDTO requestDTO) {
        return ResponseEntity.ok(contractChangeService.createChangeRequest(id, requestDTO, currentUser.getId()));
    }

    // 6. Lấy danh sách yêu cầu của một hợp đồng
    @GetMapping("/{id}/change-requests")
    public ResponseEntity<?> getChangeRequests(@PathVariable Long id) {
        return ResponseEntity.ok(contractChangeService.getRequestsByContract(id));
    }

    // 7. Chủ trọ chấp nhận yêu cầu
    @PutMapping("/change-requests/{requestId}/approve")
    public ResponseEntity<?> approveChangeRequest(@PathVariable Long requestId) {
        return ResponseEntity.ok(contractChangeService.approveRequest(requestId));
    }

    // 8. Chủ trọ từ chối yêu cầu
    @PutMapping("/change-requests/{requestId}/reject")
    public ResponseEntity<?> rejectChangeRequest(@PathVariable Long requestId) {
        return ResponseEntity.ok(contractChangeService.rejectRequest(requestId));
    }

    // 9. Phân tích pháp lý điều khoản hợp đồng bằng AI
    @Autowired
    private iuh.se.kltn.backend.modules.ai.service.LegalAdvisorAi legalAdvisorAi;

    @PostMapping("/{id}/analyze-terms")
    public ResponseEntity<?> analyzeTerms(
            @AuthenticationPrincipal UserPrincipal currentUser,
            @PathVariable Long id,
            @RequestBody(required = false) java.util.Map<String, String> request) {
        
        iuh.se.kltn.backend.modules.contract.dto.response.ContractResponse contract = contractService.getContractById(id);
        
        StringBuilder context = new StringBuilder();
        String reqTerms = (request != null && request.containsKey("terms")) ? request.get("terms") : null;
        
        if (reqTerms != null && !reqTerms.trim().isEmpty() && !reqTerms.equals(contract.getAdditionalTerms())) {
             context.append(reqTerms); 
        } else {
            context.append("--- THÔNG TIN CƠ BẢN ---\n")
                   .append("- Phòng / Tòa nhà: ").append(contract.getRoomName()).append("\n")
                   .append("- Thời hạn thuê: ").append(contract.getStartDate()).append(" đến ").append(contract.getEndDate()).append("\n")
                   .append("- Giá thuê (VNĐ/tháng): ").append(contract.getActualPrice()).append("\n")
                   .append("- Tiền cọc (VNĐ): ").append(contract.getDepositAmount()).append("\n")
                   .append("- Giá điện, nước, internet: Điện_").append(contract.getElecPrice()).append(", Nước_").append(contract.getWaterPrice()).append("\n")
                   .append("--- ĐIỀU KHOẢN BỔ SUNG KHÁC ---\n")
                   .append(contract.getAdditionalTerms() != null ? contract.getAdditionalTerms() : "Không có luật gì thêm.");
        }
        
        String roleStr = currentUser.getAuthorities().stream().findFirst().get().getAuthority().replace("ROLE_", "");
        
        try {
            String analysisResult = legalAdvisorAi.processContract(context.toString(), roleStr, "ANALYZE");
            return ResponseEntity.ok(java.util.Collections.singletonMap("result", analysisResult));
        } catch (Exception e) {
            return handleAiException(e);
        }
    }

    @PutMapping("/{id}/terms")
    public ResponseEntity<?> updateContractTerms(
            @AuthenticationPrincipal UserPrincipal currentUser,
            @PathVariable Long id,
            @RequestBody java.util.Map<String, String> request) {
        
        String newTerms = (request != null && request.containsKey("terms")) ? request.get("terms") : "";
        try {
            return ResponseEntity.ok(contractService.updateContractTerms(id, newTerms, currentUser.getId()));
        } catch (Exception e) {
            return ResponseEntity.status(400).body(java.util.Collections.singletonMap("message", e.getMessage()));
        }
    }

    // 💰 Xác nhận đã hoàn cọc
    @PutMapping("/{id}/confirm-deposit-refund")
    public ResponseEntity<?> confirmDepositRefund(
            @AuthenticationPrincipal UserPrincipal currentUser,
            @PathVariable Long id) {
        try {
            return ResponseEntity.ok(contractService.confirmDepositRefund(id, currentUser.getId()));
        } catch (Exception e) {
            return ResponseEntity.status(400).body(java.util.Collections.singletonMap("message", e.getMessage()));
        }
    }

    // 💰 Xác nhận nạp cọc Web3 (Tenant gọi sau khi tx.wait())
    @PostMapping("/{id}/confirm-web3-deposit")
    public ResponseEntity<?> confirmWeb3Deposit(
            @AuthenticationPrincipal UserPrincipal currentUser,
            @PathVariable Long id,
            @RequestBody java.util.Map<String, String> request) {
        String txHash = request.get("txHash");
        try {
            return ResponseEntity.ok(contractService.confirmWeb3Deposit(id, txHash, currentUser.getId()));
        } catch (Exception e) {
            return ResponseEntity.status(400).body(java.util.Collections.singletonMap("message", e.getMessage()));
        }
    }

    // 💰 Xác nhận nạp cọc Truyền thống (Chủ trọ nhấn nút)
    @PostMapping("/{id}/confirm-traditional-deposit")
    public ResponseEntity<?> confirmTraditionalDeposit(
            @AuthenticationPrincipal UserPrincipal currentUser,
            @PathVariable Long id) {
        try {
            return ResponseEntity.ok(contractService.confirmTraditionalDeposit(id, currentUser.getId()));
        } catch (Exception e) {
            return ResponseEntity.status(400).body(java.util.Collections.singletonMap("message", e.getMessage()));
        }
    }

    // 💰 Quyết toán hợp đồng (Two-party consent)
    @PostMapping("/{id}/settle/propose")
    public ResponseEntity<?> proposeSettlement(
            @AuthenticationPrincipal UserPrincipal currentUser,
            @PathVariable Long id,
            @RequestBody iuh.se.kltn.backend.modules.contract.dto.request.SettlementProposalRequest request) {
        return ResponseEntity.ok(contractService.proposeSettlement(id, currentUser.getId(), request));
    }

    @PostMapping("/{id}/settle/consent")
    public ResponseEntity<?> consentSettlement(
            @AuthenticationPrincipal UserPrincipal currentUser,
            @PathVariable Long id) {
        return ResponseEntity.ok(contractService.consentSettlement(id, currentUser.getId()));
    }

    @PostMapping("/{id}/settle/execute")
    public ResponseEntity<?> executeSettlement(
            @AuthenticationPrincipal UserPrincipal currentUser,
            @PathVariable Long id) {
        return ResponseEntity.ok(contractService.executeSettlement(id, currentUser.getId()));
    }

    private ResponseEntity<?> handleAiException(Exception e) {
        if (e.getMessage() != null && e.getMessage().contains("429")) {
            return ResponseEntity.status(429).body(java.util.Collections.singletonMap("message", "AI đang quá tải (Rate Limit). Vui lòng thử lại sau ít phút!"));
        }
        return ResponseEntity.status(500).body(java.util.Collections.singletonMap("message", "Lỗi AI: " + e.getMessage()));
    }
}
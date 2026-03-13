package iuh.se.kltn.backend.modules.contract.controller;

import iuh.se.kltn.backend.common.security.UserPrincipal;
import iuh.se.kltn.backend.modules.contract.dto.request.ContractRequest;
import iuh.se.kltn.backend.modules.contract.dto.request.SignContractRequest;
import iuh.se.kltn.backend.modules.contract.service.ContractChangeService;
import iuh.se.kltn.backend.modules.contract.service.ContractService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;
import iuh.se.kltn.backend.modules.contract.dto.request.ChangeRequestDTO;

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

    // 3. Lấy chi tiết
    @GetMapping("/{id}")
    public ResponseEntity<?> getContractById(@PathVariable Long id) {
        return ResponseEntity.ok(contractService.getContractById(id));
    }

    // 4. Ký hợp đồng (✅ ĐÃ ĐỔI SANG POST VÀ BỔ SUNG currentUser)
    @PostMapping("/{id}/sign")
    public ResponseEntity<?> signContract(@AuthenticationPrincipal UserPrincipal currentUser,
                                          @PathVariable Long id,
                                          @RequestBody SignContractRequest request) {
        return ResponseEntity.ok(contractService.signContract(id, request, currentUser.getId()));
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
}
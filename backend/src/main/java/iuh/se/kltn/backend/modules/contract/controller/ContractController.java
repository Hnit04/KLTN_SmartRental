package iuh.se.kltn.backend.modules.contract.controller;

import iuh.se.kltn.backend.common.security.UserPrincipal;
import iuh.se.kltn.backend.modules.contract.dto.request.ContractRequest;
import iuh.se.kltn.backend.modules.contract.service.ContractService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/contracts")
public class ContractController {

    @Autowired
    private ContractService contractService;

    // Khách thuê tạo hợp đồng
    @PostMapping
    public ResponseEntity<?> createContract(@AuthenticationPrincipal UserPrincipal currentUser,
                                            @RequestBody ContractRequest request) {
        return ResponseEntity.ok(contractService.createContract(currentUser.getId(), request));
    }

    // Xem danh sách hợp đồng của ban than
    @GetMapping("/mine")
    public ResponseEntity<?> getMyContracts(@AuthenticationPrincipal UserPrincipal currentUser) {
        return ResponseEntity.ok(contractService.getMyContracts(currentUser.getId()));
    }
}
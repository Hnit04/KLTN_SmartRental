package iuh.se.kltn.backend.modules.system.controller;

import iuh.se.kltn.backend.modules.system.dto.SystemConfigResponse;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/configs")
@Tag(name = "System Config Controller", description = "Quản lý cấu hình hệ thống (Tỷ giá, Network)")
public class SystemConfigController {

    @Value("${blockchain.vnd-eth-rate:80000000}")
    private long vndEthRate;

    @Value("${blockchain.chain-id:11155111}")
    private long chainId;

    @GetMapping("/exchange-rate")
    @Operation(summary = "Lấy tỷ giá VND/ETH hiện tại từ cấu hình hệ thống")
    public ResponseEntity<SystemConfigResponse> getExchangeRate() {
        return ResponseEntity.ok(SystemConfigResponse.builder()
                .vndEthRate(vndEthRate)
                .networkName(getNetworkName(chainId))
                .build());
    }

    private String getNetworkName(long chainId) {
        if (chainId == 11155111) return "Sepolia Testnet";
        if (chainId == 1) return "Ethereum Mainnet";
        if (chainId == 56) return "BNB Smart Chain";
        return "Unknown Network (Chain ID: " + chainId + ")";
    }
}

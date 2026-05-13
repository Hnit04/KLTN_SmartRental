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

    @Value("${blockchain.rpc-url:https://rpc.sepolia.org}")
    private String rpcUrl;

    @Value("${blockchain.explorer-url:https://sepolia.etherscan.io}")
    private String explorerUrl;

    @GetMapping("/exchange-rate")
    @Operation(summary = "Lấy tỷ giá VND/ETH hiện tại từ cấu hình hệ thống")
    public ResponseEntity<SystemConfigResponse> getExchangeRate() {
        return ResponseEntity.ok(buildSystemConfigResponse());
    }

    @GetMapping("/blockchain")
    @Operation(summary = "Lấy cấu hình blockchain runtime để frontend handshake và validate network")
    public ResponseEntity<SystemConfigResponse> getBlockchainConfig() {
        return ResponseEntity.ok(buildSystemConfigResponse());
    }

    private SystemConfigResponse buildSystemConfigResponse() {
        return SystemConfigResponse.builder()
                .vndEthRate(vndEthRate)
                .networkName(getNetworkName(chainId))
                .chainId(chainId)
                .chainIdHex("0x" + Long.toHexString(chainId))
                .rpcUrl(rpcUrl)
                .explorerUrl(explorerUrl)
                .build();
    }

    private String getNetworkName(long chainId) {
        if (chainId == 80002) return "Polygon Amoy Testnet";
        if (chainId == 11155111) return "Sepolia Testnet";
        if (chainId == 1) return "Ethereum Mainnet";
        if (chainId == 56) return "BNB Smart Chain";
        return "Unknown Network (Chain ID: " + chainId + ")";
    }
}

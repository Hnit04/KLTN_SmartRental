package iuh.se.kltn.backend.modules.system.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class SystemConfigResponse {
    private long vndEthRate;
    private String networkName; // e.g. "Polygon Amoy Testnet"
    private long chainId;
    private String chainIdHex;
    private String rpcUrl;
    private String explorerUrl;
}

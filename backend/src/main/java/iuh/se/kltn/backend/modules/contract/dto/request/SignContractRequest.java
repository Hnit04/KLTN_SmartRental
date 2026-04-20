package iuh.se.kltn.backend.modules.contract.dto.request;

import iuh.se.kltn.backend.modules.contract.enums.ContractSignMethod;
import lombok.Data;

@Data
public class SignContractRequest {
    // Người dùng chọn cách ký nào: TRADITIONAL hay BLOCKCHAIN
    private ContractSignMethod signMethod;
    
    // Chữ ký điện tử (nếu dùng Blockchain)
    private String signature;
}
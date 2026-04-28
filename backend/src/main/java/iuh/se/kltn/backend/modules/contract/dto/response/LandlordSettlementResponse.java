package iuh.se.kltn.backend.modules.contract.dto.response;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class LandlordSettlementResponse {
    private Long landlordId;
    private String landlordName;
    private String landlordEmail;
    
    // Thông tin ngân hàng của chủ trọ để Admin chuyển khoản
    private String bankName;
    private String bankAccountNumber;
    private String bankAccountHolder;
    
    // Thống kê đối soát
    private Double totalDepositAmount;
    private Double totalBillAmount;
    private Double totalRevenue;
    
    // Chi phí và Payout
    private Double platformFee; // 3% hoa hồng
    private Double finalPayoutAmount;
    
    private Integer pendingItemCount; // Số lượng hóa đơn/cọc chờ đối soát
}

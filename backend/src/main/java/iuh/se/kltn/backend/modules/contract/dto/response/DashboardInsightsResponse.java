package iuh.se.kltn.backend.modules.contract.dto.response;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class DashboardInsightsResponse {
    private Double projectedRevenue;          // Dự kiến thu (tiền phòng các HĐ ACTIVE)
    private Double opportunityCost;            // Thất thoát (tiền từ các phòng trống)
    private Long expiringContractsCount;      // Số hợp đồng sắp hết hạn (< 30 ngày)
    private Long latePaymentRoomsCount;       // Số phòng nợ tiền (hóa đơn LATE)
    
    // Danh sách lịch sử tỷ lệ lấp đầy (theo tháng)
    private List<OccupancyTrendDTO> occupancyTrend;

    // ✅ Danh sách hợp đồng sắp hết hạn (chi tiết)
    private List<ExpiringContractDTO> expiringContracts;

    @Data
    @AllArgsConstructor
    @NoArgsConstructor
    public static class OccupancyTrendDTO {
        private String month;                  // "T01", "T02"...
        private Double rate;                   // 85.5%
    }

    @Data
    @AllArgsConstructor
    @NoArgsConstructor
    public static class ExpiringContractDTO {
        private Long contractId;
        private String roomName;
        private String tenantName;
        private String endDate;
        private Long daysLeft;
    }
}

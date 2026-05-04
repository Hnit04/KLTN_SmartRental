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
public class AnnualReportResponse {
    private Double totalAnnualRevenue;
    private Double growthRate;
    private String bestPerformingProperty;
    private List<MonthlyRevenueDTO> monthlyRevenue;
    private List<RevenueDistributionDTO> distribution;
    private List<PropertyRevenueDTO> propertyDetails;

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class MonthlyRevenueDTO {
        private String month; // e.g., "T01"
        private Double rent;
        private Double service;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class RevenueDistributionDTO {
        private String name;
        private Double value;
        private String color;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class PropertyRevenueDTO {
        private Long propertyId;
        private String name;
        private Integer totalRooms;
        private Double revenue;
        private String trend; // "up", "down", or "stable"
    }
}

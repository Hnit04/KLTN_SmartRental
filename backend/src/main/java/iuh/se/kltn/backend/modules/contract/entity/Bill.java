package iuh.se.kltn.backend.modules.contract.entity;

import iuh.se.kltn.backend.modules.contract.enums.BillStatus;
import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Entity
@Table(name = "bills")
@Data
@NoArgsConstructor
@AllArgsConstructor
public class Bill {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne
    @JoinColumn(name = "contract_id", nullable = false)
    private Contract contract;

    private Integer month;
    private Integer year;

    private Integer oldElecIndex;
    private Integer newElecIndex;
    private Integer oldWaterIndex;
    private Integer newWaterIndex;

    private Double totalAmount;
    private Double exchangeRate; // Tỷ giá ETH/VND

    private LocalDateTime deadline; // Hạn để tính phạt

    private String paymentTxHash;
    private Double penaltyFee;

    @Enumerated(EnumType.STRING)
    private BillStatus status;

    private LocalDateTime paidAt;
    private String elecMeterImageUrl; // Ảnh minh chứng đồng hồ điện
    private String waterMeterImageUrl; // Ảnh minh chứng đồng hồ nước
    private Double additionalFee; // Phụ phí (rác, gửi xe, vệ sinh...)
    private Double discountAmount; // Giảm trừ
    private String note; // Ghi chú cho các khoản phát sinh

    // ĐỐI SOÁT SEPAY
    @Column(columnDefinition = "boolean default false")
    private Boolean isSettledToLandlord;
    private LocalDateTime settledAt;
}
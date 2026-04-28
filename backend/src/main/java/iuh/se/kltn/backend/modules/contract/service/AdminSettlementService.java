package iuh.se.kltn.backend.modules.contract.service;

import iuh.se.kltn.backend.modules.contract.dto.response.LandlordSettlementResponse;
import iuh.se.kltn.backend.modules.contract.dto.response.SettlementItemDetail;
import iuh.se.kltn.backend.modules.contract.entity.Bill;
import iuh.se.kltn.backend.modules.contract.entity.Contract;
import iuh.se.kltn.backend.modules.contract.enums.BillStatus;
import iuh.se.kltn.backend.modules.contract.enums.DepositStatus;
import iuh.se.kltn.backend.modules.contract.repository.BillRepository;
import iuh.se.kltn.backend.modules.contract.repository.ContractRepository;
import iuh.se.kltn.backend.modules.user.entity.User;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.*;
import java.util.stream.Collectors;

@Service
public class AdminSettlementService {

    @Autowired
    private BillRepository billRepository;

    @Autowired
    private ContractRepository contractRepository;

    public List<LandlordSettlementResponse> getPendingSettlements() {
        return calculateSettlements(false);
    }

    public List<LandlordSettlementResponse> getSettledHistory() {
        return calculateSettlements(true);
    }

    private List<LandlordSettlementResponse> calculateSettlements(boolean isSettled) {
        Map<Long, LandlordSettlementResponse> map = new HashMap<>();

        // 1. Phân bổ hóa đơn
        billRepository.findAll().stream()
                .filter(b -> b.getStatus() == BillStatus.PAID)
                .filter(b -> (b.getIsSettledToLandlord() != null && b.getIsSettledToLandlord()) == isSettled)
                .forEach(b -> {
                    User landlord = b.getContract().getRoom().getProperty().getLandlord();
                    LandlordSettlementResponse res = getOrCreateResponse(map, landlord);
                    res.setTotalBillAmount(res.getTotalBillAmount() + b.getTotalAmount());
                    res.setTotalRevenue(res.getTotalRevenue() + b.getTotalAmount());
                    res.setPendingItemCount(res.getPendingItemCount() + 1);
                });

        // 2. Phân bổ tiền cọc
        contractRepository.findAll().stream()
                .filter(c -> c.getDepositStatus() == DepositStatus.DEPOSITED)
                .filter(c -> (c.getIsDepositSettledToLandlord() != null && c.getIsDepositSettledToLandlord()) == isSettled)
                .forEach(c -> {
                    User landlord = c.getRoom().getProperty().getLandlord();
                    LandlordSettlementResponse res = getOrCreateResponse(map, landlord);
                    Double deposit = c.getDepositAmount() != null ? c.getDepositAmount() : 0.0;
                    res.setTotalDepositAmount(res.getTotalDepositAmount() + deposit);
                    res.setTotalRevenue(res.getTotalRevenue() + deposit);
                    res.setPendingItemCount(res.getPendingItemCount() + 1);
                });

        // 3. Tính toán phí Platform (3%)
        for (LandlordSettlementResponse res : map.values()) {
            Double totalRevenue = res.getTotalRevenue();
            Double platformFee = totalRevenue * 0.03;
            Double finalPayout = totalRevenue - platformFee;
            
            res.setPlatformFee(platformFee);
            res.setFinalPayoutAmount(finalPayout);
        }

        return new ArrayList<>(map.values());
    }

    private LandlordSettlementResponse getOrCreateResponse(Map<Long, LandlordSettlementResponse> map, User landlord) {
        if (!map.containsKey(landlord.getId())) {
            map.put(landlord.getId(), LandlordSettlementResponse.builder()
                    .landlordId(landlord.getId())
                    .landlordName(landlord.getFullName())
                    .landlordEmail(landlord.getEmail())
                    .bankName(landlord.getBankName())
                    .bankAccountNumber(landlord.getBankAccountNumber())
                    .bankAccountHolder(landlord.getBankAccountHolder())
                    .totalDepositAmount(0.0)
                    .totalBillAmount(0.0)
                    .totalRevenue(0.0)
                    .platformFee(0.0)
                    .finalPayoutAmount(0.0)
                    .pendingItemCount(0)
                    .build());
        }
        return map.get(landlord.getId());
    }

    /**
     * Lấy chi tiết từng khoản (Hóa đơn/Tiền cọc) của 1 chủ trọ theo trạng thái đối soát
     */
    public List<SettlementItemDetail> getLandlordSettlementDetails(Long landlordId, boolean isSettled) {
        List<SettlementItemDetail> details = new ArrayList<>();

        // 1. Phân bổ hóa đơn (Dùng loop tương tự calculateSettlements để đảm bảo khớp số liệu 100%)
        billRepository.findAll().stream()
                .filter(b -> b.getStatus() == BillStatus.PAID)
                .filter(b -> (b.getIsSettledToLandlord() != null && b.getIsSettledToLandlord()) == isSettled)
                .filter(b -> b.getContract().getRoom().getProperty().getLandlord().getId().equals(landlordId))
                .forEach(b -> {
                    details.add(SettlementItemDetail.builder()
                            .type("BILL")
                            .id(b.getId())
                            .description("Hóa đơn " + b.getMonth() + "/" + b.getYear() + " - " + b.getContract().getRoom().getName())
                            .amount(b.getTotalAmount())
                            .paidAt(b.getPaidAt()) 
                            .referenceCode("WEBHOOK_ORDER_" + b.getId())
                            .build());
                });

        // 2. Phân bổ tiền cọc
        contractRepository.findAll().stream()
                .filter(c -> c.getDepositStatus() == DepositStatus.DEPOSITED)
                .filter(c -> (c.getIsDepositSettledToLandlord() != null && c.getIsDepositSettledToLandlord()) == isSettled)
                .filter(c -> c.getRoom().getProperty().getLandlord().getId().equals(landlordId))
                .forEach(c -> {
                    details.add(SettlementItemDetail.builder()
                            .type("DEPOSIT")
                            .id(c.getId())
                            .description("Tiền cọc hợp đồng - " + c.getRoom().getName())
                            .amount(c.getDepositAmount() != null ? c.getDepositAmount() : 0.0)
                            .paidAt(c.getUpdatedAt())
                            .referenceCode("WEBHOOK_DEP_" + c.getId())
                            .build());
                });

        return details;
    }

    @Transactional
    public void payoutToLandlord(Long landlordId) {
        List<Bill> unsettledBills = billRepository.findAll().stream()
                .filter(b -> b.getStatus() == BillStatus.PAID)
                .filter(b -> b.getIsSettledToLandlord() == null || !b.getIsSettledToLandlord())
                .filter(b -> b.getContract().getRoom().getProperty().getLandlord().getId().equals(landlordId))
                .collect(Collectors.toList());

        for (Bill b : unsettledBills) {
            b.setIsSettledToLandlord(true);
            b.setSettledAt(LocalDateTime.now());
            billRepository.save(b);
        }

        List<Contract> unsettledContracts = contractRepository.findAll().stream()
                .filter(c -> c.getDepositStatus() == DepositStatus.DEPOSITED)
                .filter(c -> c.getIsDepositSettledToLandlord() == null || !c.getIsDepositSettledToLandlord())
                .filter(c -> c.getRoom().getProperty().getLandlord().getId().equals(landlordId))
                .collect(Collectors.toList());

        for (Contract c : unsettledContracts) {
            c.setIsDepositSettledToLandlord(true);
            c.setDepositSettledAt(LocalDateTime.now());
            contractRepository.save(c);
        }
    }

    public Map<String, Object> getPayoutQrCode(Long landlordId) {
        LandlordSettlementResponse settlement = getPendingSettlements().stream()
                .filter(s -> s.getLandlordId().equals(landlordId))
                .findFirst()
                .orElseThrow(() -> new RuntimeException("Không tìm thấy khoản đối soát cho chủ trọ này"));

        String bankName = settlement.getBankName();
        String accountNumber = settlement.getBankAccountNumber();
        String accountName = settlement.getBankAccountHolder();

        if (bankName == null || accountNumber == null) {
            throw new RuntimeException("Chủ trọ chưa cấu hình thông tin ngân hàng thụ hưởng");
        }

        // Để test thực tế: Dùng 2000 VNĐ nếu số tiền > 0 (tương tự tenant thanh toán)
        Double finalAmount = settlement.getFinalPayoutAmount();
        String qrAmount = finalAmount > 0 ? "2000" : "0"; 

        String addInfo = "SMR PAYOUT " + landlordId;
        String encodedAddInfo = java.net.URLEncoder.encode(addInfo, java.nio.charset.StandardCharsets.UTF_8).replace("+", "%20");
        String encodedAccountName = accountName != null ? java.net.URLEncoder.encode(accountName, java.nio.charset.StandardCharsets.UTF_8).replace("+", "%20") : "";

        String safeBankName = bankName.trim().replaceAll("\\s+", "");
        String qrUrl = String.format("https://img.vietqr.io/image/%s-%s-compact2.png?amount=%s&addInfo=%s&accountName=%s",
                safeBankName, accountNumber, qrAmount, encodedAddInfo, encodedAccountName);

        return Map.of(
            "status", "success",
            "qrUrl", qrUrl,
            "realAmount", finalAmount,
            "qrAmount", qrAmount,
            "addInfo", addInfo
        );
    }
}

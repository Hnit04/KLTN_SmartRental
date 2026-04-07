package iuh.se.kltn.backend.modules.contract.service;

import iuh.se.kltn.backend.modules.contract.dto.response.MonthlyRevenueResponse;
import iuh.se.kltn.backend.modules.contract.dto.request.BillRequest;
import iuh.se.kltn.backend.modules.contract.dto.response.BillResponse;
import iuh.se.kltn.backend.modules.contract.dto.response.BillingStatusResponse;
import iuh.se.kltn.backend.modules.contract.dto.response.RevenueChartResponse;
import iuh.se.kltn.backend.modules.contract.entity.Bill;
import iuh.se.kltn.backend.modules.contract.entity.Contract;
import iuh.se.kltn.backend.modules.contract.enums.BillStatus;
import iuh.se.kltn.backend.modules.contract.enums.ContractStatus;
import iuh.se.kltn.backend.modules.contract.repository.BillRepository;
import iuh.se.kltn.backend.modules.contract.repository.ContractRepository;
import iuh.se.kltn.backend.modules.property.entity.Property;
import iuh.se.kltn.backend.modules.interaction.service.NotificationService;
import iuh.se.kltn.backend.modules.interaction.enums.NotificationType;
import org.modelmapper.ModelMapper;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@Service
public class BillService {

    @Autowired
    private BillRepository billRepository;
    @Autowired
    private ContractRepository contractRepository;
    @Autowired
    private ModelMapper modelMapper;

    // Inject thêm NotificationService để tạo thông báo
    @Autowired
    private NotificationService notificationService;
    
    @Autowired
    private iuh.se.kltn.backend.modules.user.service.ReputationService reputationService;

    // tạo Hóa Đơn Tháng (Chủ trọ nhập số điện nước)
    @Transactional
    public BillResponse createBill(Long landlordId, BillRequest request) {
        Contract contract = contractRepository.findById(request.getContractId())
                .orElseThrow(() -> new RuntimeException("Hợp đồng không tồn tại"));

        // Kiểm tra quyền chủ trọ
        if (!contract.getRoom().getProperty().getLandlord().getId().equals(landlordId)) {
            throw new RuntimeException("Bạn không phải chủ hợp đồng này!");
        }

        // Kiểm tra trạng thái hợp đồng
        if (contract.getStatus() != ContractStatus.ACTIVE) {
            throw new RuntimeException("Hợp đồng này không còn hiệu lực!");
        }
        if (request.getNewElecIndex() < request.getOldElecIndex() ||
                request.getNewWaterIndex() < request.getOldWaterIndex()) {
            throw new RuntimeException("Chỉ số mới không được nhỏ hơn chỉ số cũ!");
        }

        // Tính tiền
        Property property = contract.getRoom().getProperty();

        double elecUsage = request.getNewElecIndex() - request.getOldElecIndex();
        double waterUsage = request.getNewWaterIndex() - request.getOldWaterIndex();

        double elecCost = elecUsage * property.getElecPrice();
        double waterCost = waterUsage * property.getWaterPrice();
        double internetCost = property.getInternetPrice();
        double roomCost = contract.getActualPrice();

        double totalAmount = roomCost + elecCost + waterCost + internetCost;
        double addFee = request.getAdditionalFee() != null ? request.getAdditionalFee() : 0.0;
        double discount = request.getDiscountAmount() != null ? request.getDiscountAmount() : 0.0;

        // Lưu Hóa đơn
        Bill bill = new Bill();
        bill.setContract(contract);
        bill.setMonth(request.getMonth());
        bill.setYear(request.getYear());
        bill.setOldElecIndex(request.getOldElecIndex());
        bill.setNewElecIndex(request.getNewElecIndex());
        bill.setOldWaterIndex(request.getOldWaterIndex());
        bill.setNewWaterIndex(request.getNewWaterIndex());

        bill.setTotalAmount(totalAmount);
        bill.setDeadline(request.getDeadline());
        bill.setStatus(BillStatus.UNPAID);
        bill.setElecMeterImageUrl(request.getElecMeterImageUrl());
        bill.setWaterMeterImageUrl(request.getWaterMeterImageUrl());
        bill.setAdditionalFee(addFee);
        bill.setDiscountAmount(discount);
        bill.setNote(request.getNote());
        // Lưu tỷ giá ETH/VND tại thời điểm tạo (1 ETH ≈ 80 triệu VND)
        bill.setExchangeRate(80000000.0);

        // Lưu vào DB
        Bill savedBill = billRepository.save(bill);

        // =========================================================
        // TẠO THÔNG BÁO GỬI CHO KHÁCH THUÊ
        // =========================================================
        try {
            String title = "Hóa đơn mới tháng " + savedBill.getMonth() + "/" + savedBill.getYear();
            String message = String.format("Chủ nhà đã chốt điện nước phòng %s. Tổng số tiền cần thanh toán là %,.0f VNĐ. Hạn chót đóng tiền: %s",
                    contract.getRoom().getName(),
                    savedBill.getTotalAmount(),
                    savedBill.getDeadline() != null ? savedBill.getDeadline().toLocalDate().toString() : "Chưa cập nhật");

            // Gọi hàm từ NotificationService
            notificationService.createNotification(
                    contract.getTenant(), // Gửi cho Tenant (Người thuê)
                    title,
                    message,
                    NotificationType.PAYMENT_REMINDER,
                    contract.getId()
            );
        } catch (Exception e) {
            // Log lỗi nếu không gửi được thông báo để không làm gián đoạn việc tạo hóa đơn
            System.err.println("Lỗi khi tạo thông báo hóa đơn: " + e.getMessage());
        }

        return mapToResponse(savedBill, elecCost, waterCost, roomCost);
    }

    // Lấy danh sách hóa đơn của Hợp đồng
    public List<BillResponse> getBillsByContract(Long contractId) {
        return billRepository.findByContractId(contractId).stream()
                .map(bill -> {
                    Property property = bill.getContract().getRoom().getProperty();
                    double elecCost = (bill.getNewElecIndex() - bill.getOldElecIndex()) * property.getElecPrice();
                    double waterCost = (bill.getNewWaterIndex() - bill.getOldWaterIndex()) * property.getWaterPrice();

                    return mapToResponse(bill, elecCost, waterCost, bill.getContract().getActualPrice());
                })
                .collect(Collectors.toList());
    }

    private BillResponse mapToResponse(Bill bill, Double elec, Double water, Double room) {
        BillResponse res = modelMapper.map(bill, BillResponse.class);
        res.setRoomName(bill.getContract().getRoom().getName());
        res.setElecCost(elec);
        res.setWaterCost(water);
        res.setRoomCost(room);
        return res;
    }

    @Transactional
    public BillResponse tenantNotifyPayment(Long billId, Long tenantId) {
        Bill bill = billRepository.findById(billId)
                .orElseThrow(() -> new RuntimeException("Hóa đơn không tồn tại"));

        if (!bill.getContract().getTenant().getId().equals(tenantId)) {
            throw new RuntimeException("Bạn không phải người thuê của hợp đồng này!");
        }

        if (bill.getStatus() != BillStatus.UNPAID && bill.getStatus() != BillStatus.LATE) {
            throw new RuntimeException("Hóa đơn này không thể thanh toán!");
        }

        bill.setStatus(BillStatus.PENDING);
        Bill saved = billRepository.save(bill);

        Property property = bill.getContract().getRoom().getProperty();
        double elecCost = (bill.getNewElecIndex() - bill.getOldElecIndex()) * property.getElecPrice();
        double waterCost = (bill.getNewWaterIndex() - bill.getOldWaterIndex()) * property.getWaterPrice();
        return mapToResponse(saved, elecCost, waterCost, bill.getContract().getActualPrice());
    }

    @Transactional
    public BillResponse landlordConfirmPayment(Long billId, Long landlordId) {
        Bill bill = billRepository.findById(billId)
                .orElseThrow(() -> new RuntimeException("Hóa đơn không tồn tại"));

        if (!bill.getContract().getRoom().getProperty().getLandlord().getId().equals(landlordId)) {
            throw new RuntimeException("Bạn không phải chủ trọ của hợp đồng này!");
        }

        if (bill.getStatus() == BillStatus.PAID) {
            throw new RuntimeException("Hóa đơn này đã được xác nhận thanh toán rồi!");
        }

        bill.setStatus(BillStatus.PAID);
        bill.setPaidAt(LocalDateTime.now());
        Bill saved = billRepository.save(bill);

        // Process reputation score
        if (saved.getPaidAt().toLocalDate().isAfter(saved.getDeadline().toLocalDate())) {
            reputationService.processPoints(saved.getContract().getTenant(), iuh.se.kltn.backend.modules.user.enums.ReputationAction.BILL_LATE, -5, "Thanh toán hóa đơn trễ hạn (Hóa đơn #" + saved.getId() + ")");
        } else {
            reputationService.processPoints(saved.getContract().getTenant(), iuh.se.kltn.backend.modules.user.enums.ReputationAction.BILL_PAID_ON_TIME, 2, "Thanh toán hóa đơn đúng hạn (Hóa đơn #" + saved.getId() + ")");
        }

        Property property = bill.getContract().getRoom().getProperty();
        double elecCost = (bill.getNewElecIndex() - bill.getOldElecIndex()) * property.getElecPrice();
        double waterCost = (bill.getNewWaterIndex() - bill.getOldWaterIndex()) * property.getWaterPrice();
        return mapToResponse(saved, elecCost, waterCost, bill.getContract().getActualPrice());
    }

    public List<BillingStatusResponse> getBillingStatus(Long landlordId, int month, int year) {
        // 1. Lấy tất cả Hợp đồng đang ACTIVE của Chủ trọ này
        List<Contract> activeContracts = contractRepository.findByRoom_Property_Landlord_IdAndStatus(landlordId, ContractStatus.ACTIVE);

        List<BillingStatusResponse> responses = new java.util.ArrayList<>();

        for (Contract contract : activeContracts) {
            BillingStatusResponse res = new BillingStatusResponse();
            res.setId(contract.getId());
            res.setRoomName(contract.getRoom().getName());
            res.setTenantName(contract.getTenant().getFullName()); 
            res.setActualPrice(contract.getActualPrice());

            Property property = contract.getRoom().getProperty();
            res.setElecPrice(property.getElecPrice());
            res.setWaterPrice(property.getWaterPrice());
            res.setInternetPrice(property.getInternetPrice());

            // 2. Kiểm tra xem Tháng này đã có Hóa đơn chưa
            java.util.Optional<Bill> currentBillOpt = billRepository.findByContractIdAndMonthAndYear(contract.getId(), month, year);

            if (currentBillOpt.isPresent()) {
                // NẾU ĐÃ CHỐT SỔ -> Lấy dữ liệu của hóa đơn hiện tại
                Bill currentBill = currentBillOpt.get();
                res.setBillId(currentBill.getId());
                res.setBillStatus(currentBill.getStatus().name()); // UNPAID, PENDING, PAID, LATE
                res.setOldElecIndex(currentBill.getOldElecIndex());
                res.setOldWaterIndex(currentBill.getOldWaterIndex());
                res.setTotalAmount(currentBill.getTotalAmount());
                res.setDeadline(currentBill.getDeadline());
                res.setNewElecIndex(currentBill.getNewElecIndex());
                res.setNewWaterIndex(currentBill.getNewWaterIndex());
                res.setAdditionalFee(currentBill.getAdditionalFee());
                res.setDiscountAmount(currentBill.getDiscountAmount());
                res.setNote(currentBill.getNote());
                // ---------------------------
                res.setTotalAmount(currentBill.getTotalAmount());
                // Cờ nhận diện thanh toán Blockchain
                if (currentBill.getPaymentTxHash() != null && !currentBill.getPaymentTxHash().isEmpty()) {
                    res.setPaymentMethod("BLOCKCHAIN");
                }
            } else {
                // NẾU CHƯA CHỐT SỔ (UNBILLED) -> Đi tìm số điện nước của tháng trước
                res.setBillStatus("UNBILLED");

                int prevMonth = (month == 1) ? 12 : month - 1;
                int prevYear = (month == 1) ? year - 1 : year;

                java.util.Optional<Bill> prevBillOpt = billRepository.findByContractIdAndMonthAndYear(contract.getId(), prevMonth, prevYear);

                if (prevBillOpt.isPresent()) {
                    // Lấy số mới của tháng trước làm số cũ của tháng này
                    res.setOldElecIndex(prevBillOpt.get().getNewElecIndex());
                    res.setOldWaterIndex(prevBillOpt.get().getNewWaterIndex());
                } else {
                    // Nếu là tháng đầu tiên khách mới vào ở, chưa có hóa đơn cũ -> Set là 0
                    res.setOldElecIndex(0);
                    res.setOldWaterIndex(0);
                }
            }
            responses.add(res);
        }
        return responses;
    }

    // Trong BillService.java

    public Map<String, Object> getRevenueThisMonthAndLastMonth(Long landlordId) {
        // Tháng hiện tại: 3/2026 (theo ngày hệ thống 16/03/2026)
        LocalDate now = LocalDate.now();
        int thisMonth = now.getMonthValue();
        int thisYear = now.getYear();

        int lastMonth = now.minusMonths(1).getMonthValue();
        int lastYear = now.minusMonths(1).getYear();

        // Doanh thu tháng này
        Double thisMonthRevenue = billRepository.calculateTotalRevenueForMonthAndLandlord(
                landlordId, thisMonth, thisYear, BillStatus.PAID);

        // Doanh thu tháng trước
        Double lastMonthRevenue = billRepository.calculateTotalRevenueForMonthAndLandlord(
                landlordId, lastMonth, lastYear, BillStatus.PAID);

        Map<String, Object> result = new HashMap<>();
        result.put("thisMonth", Map.of(
                "month", thisMonth,
                "year", thisYear,
                "totalRevenue", thisMonthRevenue != null ? thisMonthRevenue : 0.0
        ));
        result.put("lastMonth", Map.of(
                "month", lastMonth,
                "year", lastYear,
                "totalRevenue", lastMonthRevenue != null ? lastMonthRevenue : 0.0
        ));
        result.put("currency", "VND");

        return result;
    }

    public Map<String, Object> getOverdueStats(Long landlordId) {
        Double overdueAmount = billRepository.sumOverdueAmountByLandlord(landlordId);
        Long overdueCount = billRepository.countOverdueBillsByLandlord(landlordId);

        Map<String, Object> stats = new HashMap<>();
        stats.put("overdueBillCount", overdueCount != null ? overdueCount : 0L);
        stats.put("overdueAmount", overdueAmount != null ? overdueAmount : 0.0);

        return stats;
    }
    public List<MonthlyRevenueResponse> getRevenueLast6Months(Long landlordId) {
        LocalDate now = LocalDate.now(); // hoặc dùng Clock nếu test
        int currentYear  = now.getYear();
        int currentMonth = now.getMonthValue();

        int prevYear = currentYear;
        int startMonthLastYear = currentMonth + 1;

        if (currentMonth <= 6) {
            prevYear--;
            startMonthLastYear = 12 - (6 - currentMonth) + 1;
        } else {
            startMonthLastYear = currentMonth - 5;
        }

        return billRepository.findRevenueLast6Months(
                landlordId, currentYear, currentMonth, prevYear, startMonthLastYear
        );
    }

    public List<RevenueChartResponse> getRevenueLast6MonthsForChart(Long landlordId) {
        LocalDate now = LocalDate.now();
        List<RevenueChartResponse> chartData = new ArrayList<>();

        // 1. Tính toán khoảng thời gian để lấy dữ liệu từ DB
        int currentYear = now.getYear();
        int currentMonth = now.getMonthValue();

        // Tính toán tháng bắt đầu của 6 tháng trước
        LocalDate startDate = now.minusMonths(5);
        int prevYear = startDate.getYear();
        int startMonthLastYear = startDate.getMonthValue();

        // Lấy dữ liệu thô từ database
        List<MonthlyRevenueResponse> rawData = billRepository.findRevenueLast6Months(
                landlordId, currentYear, currentMonth, prevYear, startMonthLastYear
        );

        // Chuyển rawData thành Map để tra cứu nhanh: "Tháng-Năm" -> Doanh thu
        Map<String, Double> dataMap = rawData.stream()
                .collect(Collectors.toMap(
                        item -> item.getMonth() + "-" + item.getYear(),
                        MonthlyRevenueResponse::getRevenue,
                        (v1, v2) -> v1
                ));

        // 2. TẠO CHÍNH XÁC 6 THÁNG (Đây là bước quan trọng nhất)
        for (int i = 5; i >= 0; i--) {
            LocalDate date = now.minusMonths(i);
            int m = date.getMonthValue();
            int y = date.getYear();

            String key = m + "-" + y;
            String label = String.format("T%02d/%d", m, y % 100);

            // Nếu database không có (null), mặc định lấy 0.0
            Double total = dataMap.getOrDefault(key, 0.0);

            chartData.add(new RevenueChartResponse(label, total));
        }

        return chartData;
    }

    @Transactional
    public BillResponse confirmWeb3Payment(Long billId, String txHash) {
        Bill bill = billRepository.findById(billId)
                .orElseThrow(() -> new RuntimeException("Hóa đơn không tồn tại"));

        if (bill.getStatus() == BillStatus.PAID) {
            throw new RuntimeException("Hóa đơn này đã được thanh toán!");
        }

        bill.setPaymentTxHash(txHash);
        bill.setStatus(BillStatus.PAID);
        bill.setPaidAt(LocalDateTime.now());

        Bill savedBill = billRepository.save(bill);

        // Process reputation score for Smart Contract automatic payment tracker
        if (savedBill.getPaidAt().toLocalDate().isAfter(savedBill.getDeadline().toLocalDate())) {
            reputationService.processPoints(savedBill.getContract().getTenant(), iuh.se.kltn.backend.modules.user.enums.ReputationAction.BILL_LATE, -5, "Thanh toán hóa đơn qua Web3 trễ hạn (Hóa đơn #" + savedBill.getId() + ")");
        } else {
            reputationService.processPoints(savedBill.getContract().getTenant(), iuh.se.kltn.backend.modules.user.enums.ReputationAction.BILL_PAID_ON_TIME, 2, "Thanh toán hóa đơn qua Web3 đúng hạn (Hóa đơn #" + savedBill.getId() + ")");
        }

        Property property = savedBill.getContract().getRoom().getProperty();
        double elecCost = (savedBill.getNewElecIndex() - savedBill.getOldElecIndex()) * property.getElecPrice();
        double waterCost = (savedBill.getNewWaterIndex() - savedBill.getOldWaterIndex()) * property.getWaterPrice();

        return mapToResponse(savedBill, elecCost, waterCost, savedBill.getContract().getActualPrice());
    }
}
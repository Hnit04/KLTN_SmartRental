package iuh.se.kltn.backend.modules.contract.service;

import iuh.se.kltn.backend.modules.contract.dto.response.AnnualReportResponse;
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

    @Autowired
    private BlockchainService blockchainService;

    @org.springframework.beans.factory.annotation.Value("${sepay.mock.amount-override:true}")
    private boolean mockAmountOverride;
    @org.springframework.beans.factory.annotation.Value("${blockchain.vnd-eth-rate:80000000}")
    private long vndEthRate;

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
        // Ngăn chặn chốt sổ ở khoảng thời gian ảo (tương lai)
        LocalDate now = LocalDate.now();
        if (request.getYear() > now.getYear() || (request.getYear() == now.getYear() && request.getMonth() > now.getMonthValue())) {
            throw new RuntimeException("Không được chốt sổ cho thời gian ở tương lai!");
        }

        // ✅ FIX #8: Kiểm tra hóa đơn trùng lặp
        if (billRepository.findByContractIdAndMonthAndYear(request.getContractId(), request.getMonth(), request.getYear()).isPresent()) {
            throw new RuntimeException("Đã có hóa đơn cho tháng " + request.getMonth() + "/" + request.getYear() + " của hợp đồng này!");
        }

        // Logic check quay vòng đồng hồ (Meter Rollover)
        boolean isReset = Boolean.TRUE.equals(request.getIsMeterReset());
        if (!isReset && (request.getNewElecIndex() < request.getOldElecIndex() ||
                request.getNewWaterIndex() < request.getOldWaterIndex())) {
            throw new RuntimeException("Chỉ số mới không được nhỏ hơn chỉ số cũ (trừ khi đồng hồ quay vòng)!");
        }

        double elecUsage = calculateUsage(request.getOldElecIndex(), request.getNewElecIndex(), isReset, 10000);
        double waterUsage = calculateUsage(request.getOldWaterIndex(), request.getNewWaterIndex(), isReset, 1000);
        Property property = contract.getRoom().getProperty();
        Double ePrice = contract.getElecPriceSnapshot() != null ? contract.getElecPriceSnapshot() : property.getElecPrice();
        Double wPrice = contract.getWaterPriceSnapshot() != null ? contract.getWaterPriceSnapshot() : property.getWaterPrice();
        Double iPrice = contract.getInternetPriceSnapshot() != null ? contract.getInternetPriceSnapshot() : property.getInternetPrice();

        double elecCost = elecUsage * ePrice;
        double waterCost = waterUsage * wPrice;
        double internetCost = iPrice;
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
        // Lưu tỷ giá ETH/VND tại thời điểm tạo
        bill.setExchangeRate((double) vndEthRate);

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

        // =========================================================
        // GHI HÓA ĐƠN LÊN BLOCKCHAIN (registerExternalBill)
        // =========================================================
        try {
            if (contract.getSmartContractAddress() != null && !contract.getSmartContractAddress().isEmpty()) {
                long EXCHANGE_RATE = vndEthRate;
                java.math.BigInteger WEI_MULT = java.math.BigInteger.TEN.pow(18);
                java.math.BigInteger billAmountWei = java.math.BigInteger.valueOf(Math.round(savedBill.getTotalAmount()))
                        .multiply(WEI_MULT).divide(java.math.BigInteger.valueOf(EXCHANGE_RATE));

                blockchainService.registerExternalBill(
                        contract.getSmartContractAddress(),
                        savedBill.getId(),
                        billAmountWei
                );
                System.out.println("✅ Đã đăng ký hóa đơn #" + savedBill.getId() + " lên Blockchain");
            }
        } catch (Exception e) {
            System.err.println("⚠️ Lỗi ghi hóa đơn lên Blockchain (bill vẫn được lưu trong DB): " + e.getMessage());
        }

        return mapToResponse(savedBill, elecCost, waterCost, roomCost);
    }

    // Lấy danh sách hóa đơn của Hợp đồng
    public List<BillResponse> getBillsByContract(Long contractId) {
        return billRepository.findByContractIdOrderByYearDescMonthDesc(contractId).stream()
                .map(bill -> {
                    Property property = bill.getContract().getRoom().getProperty();
                    Double ePrice = bill.getContract().getElecPriceSnapshot() != null ? bill.getContract().getElecPriceSnapshot() : property.getElecPrice();
                    Double wPrice = bill.getContract().getWaterPriceSnapshot() != null ? bill.getContract().getWaterPriceSnapshot() : property.getWaterPrice();
                    
                    double elecCost = calculateUsage(bill.getOldElecIndex(), bill.getNewElecIndex(), false, 10000) * ePrice;
                    double waterCost = calculateUsage(bill.getOldWaterIndex(), bill.getNewWaterIndex(), false, 1000) * wPrice;

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

    /**
     * ✅ FIX #7: Helper tính lượng tiêu thụ có xử lý meter rollover
     */
    private double calculateUsage(double oldIndex, double newIndex, boolean isReset, int maxMeter) {
        if (isReset && newIndex < oldIndex) {
            return (maxMeter - oldIndex) + newIndex;
        }
        return Math.max(0, newIndex - oldIndex);
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

        // ✅ THÔNG BÁO CHO CHỦ TRỌ
        notificationService.createNotification(
                bill.getContract().getRoom().getProperty().getLandlord(),
                "Thông báo thanh toán",
                "Khách thuê phòng " + bill.getContract().getRoom().getName() + " thông báo đã chuyển khoản hóa đơn tháng " + bill.getMonth() + ". Vui lòng kiểm tra.",
                NotificationType.PAYMENT_REMINDER,
                bill.getContract().getId()
        );

        Property property = bill.getContract().getRoom().getProperty();
        Double ePrice = bill.getContract().getElecPriceSnapshot() != null ? bill.getContract().getElecPriceSnapshot() : property.getElecPrice();
        Double wPrice = bill.getContract().getWaterPriceSnapshot() != null ? bill.getContract().getWaterPriceSnapshot() : property.getWaterPrice();
        double elecCost = (bill.getNewElecIndex() - bill.getOldElecIndex()) * ePrice;
        double waterCost = (bill.getNewWaterIndex() - bill.getOldWaterIndex()) * wPrice;
        return mapToResponse(saved, elecCost, waterCost, bill.getContract().getActualPrice());
    }

    @Transactional
    public BillResponse landlordConfirmPayment(Long billId, Long landlordId, LocalDateTime actualPaidDate) {
        Bill bill = billRepository.findById(billId)
                .orElseThrow(() -> new RuntimeException("Hóa đơn không tồn tại"));

        if (!bill.getContract().getRoom().getProperty().getLandlord().getId().equals(landlordId)) {
            throw new RuntimeException("Bạn không phải chủ trọ của hợp đồng này!");
        }

        if (bill.getStatus() == BillStatus.PAID) {
            throw new RuntimeException("Hóa đơn này đã được xác nhận thanh toán rồi!");
        }

        bill.setStatus(BillStatus.PAID);
        LocalDateTime confirmedDate = actualPaidDate != null ? actualPaidDate : LocalDateTime.now();
        bill.setPaidAt(confirmedDate);
        Bill saved = billRepository.save(bill);

        // ✅ THÔNG BÁO CHO KHÁCH THUÊ
        notificationService.createNotification(
                saved.getContract().getTenant(),
                "Xác nhận thanh toán thành công",
                "Chủ trọ đã xác nhận thanh toán hóa đơn tháng " + saved.getMonth() + " cho phòng " + saved.getContract().getRoom().getName(),
                NotificationType.PAYMENT_REMINDER,
                saved.getContract().getId()
        );

        // Process reputation score
        if (confirmedDate.toLocalDate().isAfter(saved.getDeadline().toLocalDate())) {
            reputationService.processPoints(saved.getContract().getTenant(), iuh.se.kltn.backend.modules.user.enums.ReputationAction.BILL_LATE, -5, "Thanh toán hóa đơn trễ hạn (Hóa đơn #" + saved.getId() + ")");
        } else {
            reputationService.processPoints(saved.getContract().getTenant(), iuh.se.kltn.backend.modules.user.enums.ReputationAction.BILL_PAID_ON_TIME, 2, "Thanh toán hóa đơn đúng hạn (Hóa đơn #" + saved.getId() + ")");
        }

        Property property = bill.getContract().getRoom().getProperty();
        Double ePrice = bill.getContract().getElecPriceSnapshot() != null ? bill.getContract().getElecPriceSnapshot() : property.getElecPrice();
        Double wPrice = bill.getContract().getWaterPriceSnapshot() != null ? bill.getContract().getWaterPriceSnapshot() : property.getWaterPrice();
        double elecCost = (bill.getNewElecIndex() - bill.getOldElecIndex()) * ePrice;
        double waterCost = (bill.getNewWaterIndex() - bill.getOldWaterIndex()) * wPrice;
        return mapToResponse(saved, elecCost, waterCost, bill.getContract().getActualPrice());
    }

    public List<BillingStatusResponse> getBillingStatus(Long landlordId, int month, int year) {
        // 1. Lấy tất cả Hợp đồng đang ACTIVE HOẶC Đã kết thúc nhưng vẫn còn nợ bill
        List<Contract> activeContracts = contractRepository.findBillingContractsByLandlordId(landlordId);

        List<BillingStatusResponse> responses = new java.util.ArrayList<>();

        for (Contract contract : activeContracts) {
            BillingStatusResponse res = new BillingStatusResponse();
            res.setId(contract.getId());
            res.setRoomName(contract.getRoom().getName());
            res.setTenantName(contract.getTenant().getFullName()); 
            res.setActualPrice(contract.getActualPrice());

            Property property = contract.getRoom().getProperty();
            Double ePrice = contract.getElecPriceSnapshot() != null ? contract.getElecPriceSnapshot() : property.getElecPrice();
            Double wPrice = contract.getWaterPriceSnapshot() != null ? contract.getWaterPriceSnapshot() : property.getWaterPrice();
            Double iPrice = contract.getInternetPriceSnapshot() != null ? contract.getInternetPriceSnapshot() : property.getInternetPrice();

            res.setElecPrice(ePrice);
            res.setWaterPrice(wPrice);
            res.setInternetPrice(iPrice);

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
                // NẾU CHƯA CHỐT SỔ (UNBILLED) -> Đi tìm số điện nước của hóa đơn chốt gần nhất
                res.setBillStatus("UNBILLED");

                java.util.Optional<Bill> prevBillOpt = billRepository.findFirstByContractIdOrderByYearDescMonthDesc(contract.getId());

                if (prevBillOpt.isPresent()) {
                    // Lấy số mới của lần chốt gần nhất làm số cũ của kỳ này
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

    /**
     * Đồng bộ hóa đơn cũ (chưa có trên chain) lên Blockchain.
     * Dùng cho các bill được tạo trước khi tích hợp registerExternalBill.
     */
    @Transactional
    public void syncBillToBlockchain(Long billId) {
        Bill bill = billRepository.findById(billId)
                .orElseThrow(() -> new RuntimeException("Hóa đơn không tồn tại"));

        Contract contract = bill.getContract();
        if (contract.getSmartContractAddress() == null || contract.getSmartContractAddress().isEmpty()) {
            throw new RuntimeException("Hợp đồng này chưa có Smart Contract trên Blockchain!");
        }

        try {
            long EXCHANGE_RATE = vndEthRate;
            java.math.BigInteger WEI_MULT = java.math.BigInteger.TEN.pow(18);
            java.math.BigInteger billAmountWei = java.math.BigInteger.valueOf(Math.round(bill.getTotalAmount()))
                        .multiply(WEI_MULT).divide(java.math.BigInteger.valueOf(EXCHANGE_RATE));

            blockchainService.registerExternalBill(
                    contract.getSmartContractAddress(),
                    bill.getId(),
                    billAmountWei
            );
            System.out.println("✅ Đã đồng bộ hóa đơn #" + bill.getId() + " lên Blockchain");
        } catch (Exception e) {
            throw new RuntimeException("Lỗi đăng ký hóa đơn lên Blockchain: " + e.getMessage());
        }
    }

    @Transactional
    public BillResponse confirmWeb3Payment(Long billId, String txHash) {
        Bill bill = billRepository.findById(billId)
                .orElseThrow(() -> new RuntimeException("Hóa đơn không tồn tại"));

        if (bill.getStatus() == BillStatus.PAID) {
            throw new RuntimeException("Hóa đơn này đã được thanh toán!");
        }

        // 🔍 Xác minh giao dịch thật trên Blockchain trước khi ghi nhận
        if (!blockchainService.verifyTransaction(txHash)) {
            throw new RuntimeException("Giao dịch không hợp lệ hoặc chưa được xác nhận trên Blockchain!");
        }

        bill.setPaymentTxHash(txHash);
        bill.setStatus(BillStatus.PAID);
        bill.setPaidAt(LocalDateTime.now());

        Bill savedBill = billRepository.save(bill);

        // ✅ THÔNG BÁO CHO CHỦ TRỌ (Xác nhận tiền đã về ví blockchain)
        notificationService.createNotification(
                savedBill.getContract().getRoom().getProperty().getLandlord(),
                "Thanh toán Web3 thành công",
                "Khách thuê đã thanh toán hóa đơn tháng " + savedBill.getMonth() + " qua Blockchain cho phòng " + savedBill.getContract().getRoom().getName(),
                NotificationType.PAYMENT_REMINDER,
                savedBill.getContract().getId()
        );

        // Process reputation score for Smart Contract automatic payment tracker
        if (savedBill.getPaidAt().toLocalDate().isAfter(savedBill.getDeadline().toLocalDate())) {
            reputationService.processPoints(savedBill.getContract().getTenant(), iuh.se.kltn.backend.modules.user.enums.ReputationAction.BILL_LATE, -5, "Thanh toán hóa đơn qua Web3 trễ hạn (Hóa đơn #" + savedBill.getId() + ")");
        } else {
            reputationService.processPoints(savedBill.getContract().getTenant(), iuh.se.kltn.backend.modules.user.enums.ReputationAction.BILL_PAID_ON_TIME, 2, "Thanh toán hóa đơn qua Web3 đúng hạn (Hóa đơn #" + savedBill.getId() + ")");
        }

        Property property = savedBill.getContract().getRoom().getProperty();
        Double ePrice = savedBill.getContract().getElecPriceSnapshot() != null ? savedBill.getContract().getElecPriceSnapshot() : property.getElecPrice();
        Double wPrice = savedBill.getContract().getWaterPriceSnapshot() != null ? savedBill.getContract().getWaterPriceSnapshot() : property.getWaterPrice();
        double elecCost = (savedBill.getNewElecIndex() - savedBill.getOldElecIndex()) * ePrice;
        double waterCost = (savedBill.getNewWaterIndex() - savedBill.getOldWaterIndex()) * wPrice;

        return mapToResponse(savedBill, elecCost, waterCost, savedBill.getContract().getActualPrice());
    }

    public AnnualReportResponse getAnnualReport(Long landlordId, int year) {
        List<Bill> yearBills = billRepository.findAllByContract_Room_Property_Landlord_IdAndYear(landlordId, year);
        List<Bill> prevYearBills = billRepository.findAllByContract_Room_Property_Landlord_IdAndYear(landlordId, year - 1);

        double totalCurrent = yearBills.stream().filter(b -> b.getStatus() == BillStatus.PAID).mapToDouble(Bill::getTotalAmount).sum();
        double totalPrev = prevYearBills.stream().filter(b -> b.getStatus() == BillStatus.PAID).mapToDouble(Bill::getTotalAmount).sum();

        double growthRate = totalPrev > 0 ? ((totalCurrent - totalPrev) / totalPrev) * 100 : (totalCurrent > 0 ? 100.0 : 0.0);

        // 1. Monthly Revenue
        List<AnnualReportResponse.MonthlyRevenueDTO> monthlyRevenue = new ArrayList<>();
        Map<Integer, List<Bill>> billsByMonth = yearBills.stream().collect(Collectors.groupingBy(Bill::getMonth));
        for (int m = 1; m <= 12; m++) {
            List<Bill> mBills = billsByMonth.getOrDefault(m, new ArrayList<>());
            double rent = mBills.stream().filter(b -> b.getStatus() == BillStatus.PAID).mapToDouble(b -> b.getContract().getActualPrice()).sum();
            double total = mBills.stream().filter(b -> b.getStatus() == BillStatus.PAID).mapToDouble(Bill::getTotalAmount).sum();
            monthlyRevenue.add(new AnnualReportResponse.MonthlyRevenueDTO("T" + String.format("%02d", m), rent, total - rent));
        }

        // 2. Revenue Distribution
        double totalRent = yearBills.stream().filter(b -> b.getStatus() == BillStatus.PAID).mapToDouble(b -> b.getContract().getActualPrice()).sum();
        double totalElec = yearBills.stream().filter(b -> b.getStatus() == BillStatus.PAID).mapToDouble(b -> {
            Double ePrice = b.getContract().getElecPriceSnapshot() != null ? b.getContract().getElecPriceSnapshot() : b.getContract().getRoom().getProperty().getElecPrice();
            return (b.getNewElecIndex() - b.getOldElecIndex()) * ePrice;
        }).sum();
        double totalWater = yearBills.stream().filter(b -> b.getStatus() == BillStatus.PAID).mapToDouble(b -> {
            Double wPrice = b.getContract().getWaterPriceSnapshot() != null ? b.getContract().getWaterPriceSnapshot() : b.getContract().getRoom().getProperty().getWaterPrice();
            return (b.getNewWaterIndex() - b.getOldWaterIndex()) * wPrice;
        }).sum();
        double totalMisc = totalCurrent - totalRent - totalElec - totalWater;

        List<AnnualReportResponse.RevenueDistributionDTO> distribution = List.of(
            new AnnualReportResponse.RevenueDistributionDTO("Tiền phòng", totalCurrent > 0 ? (totalRent / totalCurrent) * 100 : 0, "#3b82f6"),
            new AnnualReportResponse.RevenueDistributionDTO("Tiền điện", totalCurrent > 0 ? (totalElec / totalCurrent) * 100 : 0, "#f59e0b"),
            new AnnualReportResponse.RevenueDistributionDTO("Tiền nước", totalCurrent > 0 ? (totalWater / totalCurrent) * 100 : 0, "#0ea5e9"),
            new AnnualReportResponse.RevenueDistributionDTO("Dịch vụ khác", totalCurrent > 0 ? (totalMisc / totalCurrent) * 100 : 0, "#10b981")
        );

        // 3. Property Details
        Map<Long, List<Bill>> billsByProperty = yearBills.stream().collect(Collectors.groupingBy(b -> b.getContract().getRoom().getProperty().getId()));
        List<AnnualReportResponse.PropertyRevenueDTO> propertyDetails = new ArrayList<>();
        String bestProp = "Chưa có dữ liệu";
        double maxPropRev = -1;

        for (Map.Entry<Long, List<Bill>> entry : billsByProperty.entrySet()) {
            List<Bill> pBills = entry.getValue();
            String name = pBills.get(0).getContract().getRoom().getProperty().getName();
            int totalRooms = pBills.get(0).getContract().getRoom().getProperty().getRooms().size();
            double rev = pBills.stream().filter(b -> b.getStatus() == BillStatus.PAID).mapToDouble(Bill::getTotalAmount).sum();
            
            propertyDetails.add(new AnnualReportResponse.PropertyRevenueDTO(entry.getKey(), name, totalRooms, rev, "stable"));
            if (rev > maxPropRev) {
                maxPropRev = rev;
                bestProp = name;
            }
        }

        return AnnualReportResponse.builder()
                .totalAnnualRevenue(totalCurrent)
                .growthRate(growthRate)
                .bestPerformingProperty(bestProp)
                .monthlyRevenue(monthlyRevenue)
                .distribution(distribution)
                .propertyDetails(propertyDetails)
                .build();
    }

    @Transactional
    public void processSePayWebhook(iuh.se.kltn.backend.modules.contract.dto.request.SePayWebhookRequest request) {
        String content = request.getTransactionContent();
        if (content == null) return;

        java.util.regex.Matcher matcher = java.util.regex.Pattern.compile("SMR BILL (\\d+)", java.util.regex.Pattern.CASE_INSENSITIVE).matcher(content);
        if (matcher.find()) {
            Long billId = Long.parseLong(matcher.group(1));
            Bill bill = billRepository.findById(billId).orElse(null);

            if (bill == null || bill.getStatus() == BillStatus.PAID) {
                return; // Không tồn tại hoặc đã thanh toán
            }

            // ĐÃ SỬA THÀNH VÍ TRUNG GIAN (Centralized Wallet)
            // Không còn kiểm tra khớp với số tài khoản cá nhân của chủ trọ nữa.
            // Mọi giao dịch từ Webhook SePay (được bảo vệ bằng ApiKey) đều được tin cậy vì chuyển thẳng vào Platform.

            // MOCK: Nếu mock=true, cho phép 2000 VNĐ pass. Nếu mock=false, kiểm tra số tiền thật.
            if (request.getAmountIn() < bill.getTotalAmount() && !(mockAmountOverride && request.getAmountIn() == 2000.0)) {
                System.out.println("⚠️ [SePay] Số tiền chuyển (" + request.getAmountIn() + ") nhỏ hơn tổng hóa đơn (" + bill.getTotalAmount() + "). Không tự động duyệt.");
                return;
            }

            // Xử lý thành công -> Đổi trạng thái hóa đơn
            bill.setStatus(BillStatus.PAID);
            bill.setPaymentTxHash(request.getReferenceNumber() != null ? request.getReferenceNumber() : "SEPAY_AUTO");
            bill.setPaidAt(LocalDateTime.now());
            billRepository.save(bill);

            // Gửi thông báo cho Khách thuê
            notificationService.createNotification(
                    bill.getContract().getTenant(),
                    "Thanh toán hóa đơn thành công",
                    "Hóa đơn tháng " + bill.getMonth() + " của bạn đã được ghi nhận thanh toán qua VietQR (Mã GD: " + request.getReferenceNumber() + "). Khoản tiền sẽ được chuyển đến Chủ trọ trong đợt đối soát tiếp theo.",
                    NotificationType.PAYMENT_REMINDER,
                    bill.getContract().getId()
            );

            // Gửi thông báo cho Chủ trọ
            notificationService.createNotification(
                    bill.getContract().getRoom().getProperty().getLandlord(),
                    "Khách thuê đã thanh toán hóa đơn",
                    "Khách thuê phòng " + bill.getContract().getRoom().getName() + " đã thanh toán hóa đơn tháng " + bill.getMonth() + " qua VietQR. Khoản tiền sẽ được chuyển đến bạn trong đợt đối soát tiếp theo.",
                    NotificationType.PAYMENT_REMINDER,
                    bill.getContract().getId()
            );

            // Cộng / trừ điểm uy tín
            if (bill.getPaidAt().toLocalDate().isAfter(bill.getDeadline().toLocalDate())) {
                reputationService.processPoints(bill.getContract().getTenant(), iuh.se.kltn.backend.modules.user.enums.ReputationAction.BILL_LATE, -5, "Thanh toán hóa đơn trễ hạn tự động (Hóa đơn #" + bill.getId() + ")");
            } else {
                reputationService.processPoints(bill.getContract().getTenant(), iuh.se.kltn.backend.modules.user.enums.ReputationAction.BILL_PAID_ON_TIME, 2, "Thanh toán hóa đơn đúng hạn tự động (Hóa đơn #" + bill.getId() + ")");
            }

            System.out.println("✅ [SePay] Đã tự động gạch nợ thành công cho Hóa đơn #" + bill.getId());
        }
    }
}
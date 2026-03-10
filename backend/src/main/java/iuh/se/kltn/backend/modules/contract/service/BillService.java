package iuh.se.kltn.backend.modules.contract.service;

import iuh.se.kltn.backend.modules.contract.dto.request.BillRequest;
import iuh.se.kltn.backend.modules.contract.dto.response.BillResponse;
import iuh.se.kltn.backend.modules.contract.dto.response.BillingStatusResponse;
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

import java.util.List;
import java.util.stream.Collectors;

@Service
public class BillService {

    @Autowired private BillRepository billRepository;
    @Autowired private ContractRepository contractRepository;
    @Autowired private ModelMapper modelMapper;

    // Inject thêm NotificationService để tạo thông báo
    @Autowired private NotificationService notificationService;

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
        // Lưu tỷ giá ETH/VND tại thời điểm tạo
        bill.setExchangeRate(2500.0);

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

    public List<BillingStatusResponse> getBillingStatus(Long landlordId, int month, int year) {
        // 1. Lấy tất cả Hợp đồng đang ACTIVE của Chủ trọ này
        List<Contract> activeContracts = contractRepository.findByRoom_Property_Landlord_IdAndStatus(landlordId, ContractStatus.ACTIVE);

        List<BillingStatusResponse> responses = new java.util.ArrayList<>();

        for (Contract contract : activeContracts) {
            BillingStatusResponse res = new BillingStatusResponse();
            res.setId(contract.getId());
            res.setRoomName(contract.getRoom().getName());
            res.setTenantName(contract.getTenant().getFullName()); // Tùy thuộc Entity User/Tenant của bạn
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
                res.setBillStatus(currentBill.getStatus().name()); // UNPAID, PAID, LATE
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
}
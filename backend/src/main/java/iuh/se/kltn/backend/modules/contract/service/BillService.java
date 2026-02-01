package iuh.se.kltn.backend.modules.contract.service;

import iuh.se.kltn.backend.modules.contract.dto.request.BillRequest;
import iuh.se.kltn.backend.modules.contract.dto.response.BillResponse;
import iuh.se.kltn.backend.modules.contract.entity.Bill;
import iuh.se.kltn.backend.modules.contract.entity.Contract;
import iuh.se.kltn.backend.modules.contract.enums.BillStatus;
import iuh.se.kltn.backend.modules.contract.enums.ContractStatus;
import iuh.se.kltn.backend.modules.contract.repository.BillRepository;
import iuh.se.kltn.backend.modules.contract.repository.ContractRepository;
import iuh.se.kltn.backend.modules.property.entity.Property;
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

        // Lưu tỷ giá ETH/VND tại thời điểm tạo
        bill.setExchangeRate(2500.0);

        return mapToResponse(billRepository.save(bill), elecCost, waterCost, roomCost);
    }

    // Lấy danh sách hóa đơn của Hợp đồng
    public List<BillResponse> getBillsByContract(Long contractId) {
        return billRepository.findByContractId(contractId).stream()
                .map(bill -> {
                    return mapToResponse(bill, 0.0, 0.0, bill.getContract().getActualPrice());
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
}
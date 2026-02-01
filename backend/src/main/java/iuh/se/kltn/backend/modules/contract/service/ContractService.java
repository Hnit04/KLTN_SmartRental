package iuh.se.kltn.backend.modules.contract.service;

import iuh.se.kltn.backend.common.enums.Role;
import iuh.se.kltn.backend.modules.contract.dto.request.ContractRequest;
import iuh.se.kltn.backend.modules.contract.dto.response.ContractResponse;
import iuh.se.kltn.backend.modules.contract.entity.Contract;
import iuh.se.kltn.backend.modules.contract.enums.ContractStatus;
import iuh.se.kltn.backend.modules.contract.enums.DepositStatus;
import iuh.se.kltn.backend.modules.contract.repository.ContractRepository;
import iuh.se.kltn.backend.modules.property.entity.Room;
import iuh.se.kltn.backend.modules.property.enums.RoomStatus;
import iuh.se.kltn.backend.modules.property.repository.RoomRepository;
import iuh.se.kltn.backend.modules.user.entity.Tenant;
import iuh.se.kltn.backend.modules.user.entity.User;
import iuh.se.kltn.backend.modules.user.repository.UserRepository;
import org.modelmapper.ModelMapper;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
public class ContractService {

    @Autowired private ContractRepository contractRepository;
    @Autowired private RoomRepository roomRepository;
    @Autowired private UserRepository userRepository;
    @Autowired private ModelMapper modelMapper;

    // Tạo Hợp đồng mới (Khách thuê)
    @Transactional
    public ContractResponse createContract(Long tenantId, ContractRequest request) {
        // kiểm tra Tenant
        User user = userRepository.findById(tenantId)
                .orElseThrow(() -> new RuntimeException("User không tồn tại"));
        if (user.getRole() != Role.TENANT) {
            throw new RuntimeException("Chỉ khách thuê mới được tạo hợp đồng!");
        }

        // Kiểm tra Phòng
        Room room = roomRepository.findById(request.getRoomId())
                .orElseThrow(() -> new RuntimeException("Phòng không tồn tại"));

        if (room.getStatus() != RoomStatus.AVAILABLE) {
            throw new RuntimeException("Phòng này đã có người thuê hoặc đang bảo trì!");
        }

        // Khởi tạo Contract
        Contract contract = new Contract();
        contract.setTenant((Tenant) user);
        contract.setRoom(room);
        contract.setStartDate(request.getStartDate());
        contract.setEndDate(request.getEndDate());
        contract.setActualPrice(room.getPrice());
        contract.setDepositAmount(request.getDepositAmount());


        contract.setSignMethod(request.getSignMethod());

        contract.setStatus(ContractStatus.PENDING_SIGNATURE);
        contract.setDepositStatus(DepositStatus.UNPAID);

        String rawData = "CONTRACT-" + room.getId() + "-" + tenantId + "-" + UUID.randomUUID();
        contract.setContractHash(calculateSHA256(rawData));
        contract.setContentUrl("https://smart-rental-storage.com/contracts/sample.pdf");

        Contract saved = contractRepository.save(contract);
        return mapToResponse(saved);
    }

    // Lấy danh sách hợp đồng của tôi
    public List<ContractResponse> getMyContracts(Long tenantId) {
        return contractRepository.findByTenantId(tenantId).stream()
                .map(this::mapToResponse)
                .collect(Collectors.toList());
    }

    // Helper Mapping
    private ContractResponse mapToResponse(Contract contract) {
        ContractResponse res = modelMapper.map(contract, ContractResponse.class);
        res.setRoomName(contract.getRoom().getName());
        res.setPropertyAddress(contract.getRoom().getProperty().getAddress());
        res.setTenantName(contract.getTenant().getFullName());
        res.setLandlordName(contract.getRoom().getProperty().getLandlord().getFullName());
        res.setPrice(contract.getActualPrice());
        return res;
    }

    // Hàm Hash SHA-256 (Dùng tạm để test logic)
    private String calculateSHA256(String data) {
        try {
            MessageDigest digest = MessageDigest.getInstance("SHA-256");
            byte[] encodedhash = digest.digest(data.getBytes(StandardCharsets.UTF_8));
            StringBuilder hexString = new StringBuilder(2 * encodedhash.length);
            for (byte b : encodedhash) {
                String hex = Integer.toHexString(0xff & b);
                if (hex.length() == 1) hexString.append('0');
                hexString.append(hex);
            }
            return hexString.toString();
        } catch (Exception e) {
            return "HASH_ERROR";
        }
    }
}
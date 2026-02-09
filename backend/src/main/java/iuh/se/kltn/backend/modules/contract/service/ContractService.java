package iuh.se.kltn.backend.modules.contract.service;

import iuh.se.kltn.backend.common.enums.Role;
import iuh.se.kltn.backend.modules.contract.dto.request.ContractRequest;
import iuh.se.kltn.backend.modules.contract.dto.request.SignContractRequest;
import iuh.se.kltn.backend.modules.contract.dto.response.ContractResponse;
import iuh.se.kltn.backend.modules.contract.entity.Contract;
import iuh.se.kltn.backend.modules.contract.enums.ContractStatus;
import iuh.se.kltn.backend.modules.contract.enums.ContractSignMethod;
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

import java.math.BigInteger;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
public class ContractService {

    @Autowired private ContractRepository contractRepository;
    @Autowired private RoomRepository roomRepository;
    @Autowired private UserRepository userRepository;
    @Autowired private ModelMapper modelMapper;

    @Autowired private BlockchainService blockchainService;

    // --- 1. Tạo Hợp đồng mới ---
    @Transactional
    public ContractResponse createContract(Long tenantId, ContractRequest request) {
        User user = userRepository.findById(tenantId)
                .orElseThrow(() -> new RuntimeException("User không tồn tại"));
        if (user.getRole() != Role.TENANT) {
            throw new RuntimeException("Chỉ khách thuê mới được tạo hợp đồng!");
        }

        Room room = roomRepository.findById(request.getRoomId())
                .orElseThrow(() -> new RuntimeException("Phòng không tồn tại"));

        if (room.getStatus() != RoomStatus.AVAILABLE) {
            throw new RuntimeException("Phòng này đã có người thuê hoặc đang bảo trì!");
        }

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

    // --- 2. Lấy danh sách ---
    public List<ContractResponse> getMyContracts(Long tenantId) {
        return contractRepository.findByTenantId(tenantId).stream()
                .map(this::mapToResponse)
                .collect(Collectors.toList());
    }

    public ContractResponse getContractById(Long id) {
        Contract contract = contractRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Không tìm thấy hợp đồng với ID: " + id));
        return mapToResponse(contract);
    }

    // --- 3. Hàm ký hợp đồng (Đã Fix lỗi Null Pointer) ---
    @Transactional
    public ContractResponse signContract(Long id, SignContractRequest request) {
        Contract contract = contractRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Hợp đồng không tồn tại"));

        if (contract.getStatus() == ContractStatus.ACTIVE) {
            throw new RuntimeException("Hợp đồng này đã được ký trước đó!");
        }

        // Cập nhật thông tin cơ bản
        contract.setSignDate(LocalDateTime.now());
        contract.setStatus(ContractStatus.ACTIVE);
        contract.setSignMethod(request.getSignMethod());

        // 🔥 XỬ LÝ THEO PHƯƠNG THỨC KÝ 🔥
        if (request.getSignMethod() == ContractSignMethod.BLOCKCHAIN) {
            try {
                String contractHashData = "HASH-" + contract.getId() + "-" + UUID.randomUUID();

                // Cấu hình ví Test
                String tenantWallet = "0xAb8483F64d9C6d1EcF9b849Ae677dD3315835cb2";
                String landlordWallet = "0x5B38Da6a701c568545dCfcB03FcB875f56beddC4";

                // ✅ FIX LỖI Ở ĐÂY: Kiểm tra Null trước khi convert
                long priceVal = (contract.getActualPrice() != null) ? contract.getActualPrice().longValue() : 0L;
                long depositVal = (contract.getDepositAmount() != null) ? contract.getDepositAmount().longValue() : 0L;

                BigInteger rentWei = BigInteger.valueOf(priceVal);
                BigInteger depositWei = BigInteger.valueOf(depositVal);

                // Gọi Blockchain Service
                String deployedAddress = blockchainService.deployRentalContract(
                        landlordWallet,
                        tenantWallet,
                        "Phong " + (contract.getRoom() != null ? contract.getRoom().getName() : "Unknown"),
                        contractHashData,
                        rentWei,
                        depositWei
                );

                contract.setSmartContractAddress(deployedAddress);
                contract.setContractHash(contractHashData);
                contract.setDeployTxHash("Deployed on Sepolia via Backend");

            } catch (Exception e) {
                e.printStackTrace();
                throw new RuntimeException("Lỗi Deploy Blockchain: " + e.getMessage());
            }
        } else {
            contract.setSmartContractAddress(null);
            contract.setDeployTxHash(null);
        }

        if (contract.getRoom() != null) {
            contract.getRoom().setStatus(RoomStatus.RENTED);
            roomRepository.save(contract.getRoom());
        }

        Contract savedContract = contractRepository.save(contract);
        return mapToResponse(savedContract);
    }

    // --- Helper Functions ---
    private ContractResponse mapToResponse(Contract contract) {
        ContractResponse res = modelMapper.map(contract, ContractResponse.class);
        if (contract.getRoom() != null) {
            res.setRoomName(contract.getRoom().getName());
            if (contract.getRoom().getProperty() != null) {
                res.setPropertyAddress(contract.getRoom().getProperty().getAddress());
                if (contract.getRoom().getProperty().getLandlord() != null) {
                    res.setLandlordName(contract.getRoom().getProperty().getLandlord().getFullName());
                }
            }
        }
        if (contract.getTenant() != null) {
            res.setTenantName(contract.getTenant().getFullName());
        }
        res.setPrice(contract.getActualPrice());
        return res;
    }

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
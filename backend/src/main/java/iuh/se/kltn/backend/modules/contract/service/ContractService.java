package iuh.se.kltn.backend.modules.contract.service;

import iuh.se.kltn.backend.common.enums.Role;
import iuh.se.kltn.backend.modules.contract.dto.request.ContractRequest;
import iuh.se.kltn.backend.modules.contract.dto.request.SignContractRequest;
import iuh.se.kltn.backend.modules.contract.dto.response.ContractResponse;
import iuh.se.kltn.backend.modules.contract.entity.Contract;
import iuh.se.kltn.backend.modules.contract.enums.ContractStatus;
import iuh.se.kltn.backend.modules.contract.enums.ContractSignMethod;
import iuh.se.kltn.backend.modules.contract.enums.DepositStatus;
import iuh.se.kltn.backend.modules.contract.enums.RequestStatus; // THÊM IMPORT NÀY
import iuh.se.kltn.backend.modules.contract.repository.ContractChangeRequestRepository; // THÊM IMPORT NÀY
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

    // ✅ BỔ SUNG REPO ĐỂ KIỂM TRA YÊU CẦU CHỈNH SỬA
    @Autowired private ContractChangeRequestRepository changeRequestRepository;

    // --- 1. Tạo Hợp đồng mới ---
    @Transactional
    public ContractResponse createContract(Long currentUserId, ContractRequest request) {
        User currentUser = userRepository.findById(currentUserId)
                .orElseThrow(() -> new RuntimeException("User không tồn tại"));

        Room room = roomRepository.findById(request.getRoomId())
                .orElseThrow(() -> new RuntimeException("Phòng không tồn tại"));

        if (room.getStatus() != RoomStatus.AVAILABLE) {
            throw new RuntimeException("Phòng này đã có người thuê hoặc đang bảo trì!");
        }

        // ✅ SỬA LOGIC: Hỗ trợ cả Chủ nhà và Khách thuê tạo hợp đồng
        Tenant tenant;
        if (currentUser.getRole() == Role.LANDLORD) {
            // Nếu người tạo là Chủ trọ, phải tìm Khách thuê qua email (hoặc username) gửi lên từ request
            if (request.getTenantEmail() == null || request.getTenantEmail().isEmpty()) {
                throw new RuntimeException("Chủ nhà phải cung cấp email của khách thuê!");
            }
            User foundTenant = userRepository.findByEmail(request.getTenantEmail())
                    .orElseThrow(() -> new RuntimeException("Không tìm thấy khách thuê với email này."));
            if (foundTenant.getRole() != Role.TENANT) {
                throw new RuntimeException("Người dùng được gán không phải là khách thuê!");
            }
            tenant = (Tenant) foundTenant;
        } else if (currentUser.getRole() == Role.TENANT) {
            // Nếu người tạo là Khách thuê
            tenant = (Tenant) currentUser;
        } else {
            throw new RuntimeException("Bạn không có quyền tạo hợp đồng!");
        }

        Contract contract = new Contract();
        contract.setTenant(tenant);
        contract.setRoom(room);
        contract.setStartDate(request.getStartDate());
        contract.setEndDate(request.getEndDate());
        contract.setActualPrice(room.getPrice());
        contract.setDepositAmount(request.getDepositAmount());
        contract.setSignMethod(request.getSignMethod());

        // 👇 THÊM DÒNG NÀY: Lưu các điều khoản bổ sung
        contract.setAdditionalTerms(request.getAdditionalTerms());

        contract.setStatus(ContractStatus.PENDING_SIGNATURE);
        contract.setDepositStatus(DepositStatus.UNPAID);

        // 👇 SỬA DÒNG NÀY: Nối thêm additionalTerms vào chuỗi băm để chống sửa đổi trái phép
        String termsForHash = (request.getAdditionalTerms() != null) ? request.getAdditionalTerms() : "";
        String rawData = "CONTRACT-" + room.getId() + "-" + tenant.getId() + "-" + termsForHash + "-" + UUID.randomUUID();

        contract.setContractHash(calculateSHA256(rawData));
        contract.setContentUrl("https://smart-rental-storage.com/contracts/sample.pdf");

        Contract saved = contractRepository.save(contract);
        return mapToResponse(saved);
    }

    // --- 2. Lấy danh sách (Bạn có thể cần thêm hàm getContractsByLandlord sau này) ---
    // --- 2. Lấy danh sách ---
    public List<ContractResponse> getMyContracts(Long userId) {
        // Lấy thông tin user hiện tại
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new RuntimeException("User không tồn tại"));

        List<Contract> contracts;

        // Phân nhánh logic dựa trên Role
        if (user.getRole() == Role.LANDLORD) {
            // Nếu là chủ trọ: Lấy các hợp đồng thuộc các phòng/nhà của họ
            contracts = contractRepository.findContractsByLandlordId(userId);
        } else {
            // Nếu là khách thuê: Lấy các hợp đồng họ đang thuê
            contracts = contractRepository.findByTenantId(userId);
        }

        // Map sang DTO và trả về
        return contracts.stream()
                .map(this::mapToResponse)
                .collect(Collectors.toList());
    }

    public ContractResponse getContractById(Long id) {
        Contract contract = contractRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Không tìm thấy hợp đồng với ID: " + id));
        return mapToResponse(contract);
    }

    // --- 3. Hàm ký hợp đồng ---
    @Transactional
    public ContractResponse signContract(Long id, SignContractRequest request) {
        Contract contract = contractRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Hợp đồng không tồn tại"));

        if (contract.getStatus() == ContractStatus.ACTIVE) {
            throw new RuntimeException("Hợp đồng này đã được ký trước đó!");
        }

        // ✅ CHẶN KÝ NẾU ĐANG CÓ YÊU CẦU ĐỀ XUẤT CHƯA ĐƯỢC DUYỆT
        boolean hasPendingRequest = changeRequestRepository.existsByContractIdAndStatus(id, RequestStatus.PENDING);
        if (hasPendingRequest) {
            throw new RuntimeException("Không thể ký! Đang có đề xuất chỉnh sửa chờ xác nhận từ phía đối tác.");
        }

        // Cập nhật thông tin cơ bản
        contract.setSignDate(LocalDateTime.now());
        contract.setStatus(ContractStatus.ACTIVE);
        contract.setSignMethod(request.getSignMethod());

        // 🔥 XỬ LÝ THEO PHƯƠNG THỨC KÝ 🔥
        if (request.getSignMethod() == ContractSignMethod.BLOCKCHAIN) {
            try {
                String contractHashData = "HASH-" + contract.getId() + "-" + UUID.randomUUID();

                String tenantWallet = "0xAb8483F64d9C6d1EcF9b849Ae677dD3315835cb2";
                String landlordWallet = "0x5B38Da6a701c568545dCfcB03FcB875f56beddC4";

                long priceVal = (contract.getActualPrice() != null) ? contract.getActualPrice().longValue() : 0L;
                long depositVal = (contract.getDepositAmount() != null) ? contract.getDepositAmount().longValue() : 0L;

                BigInteger rentWei = BigInteger.valueOf(priceVal);
                BigInteger depositWei = BigInteger.valueOf(depositVal);

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

    // --- Helper Functions (Không đổi) ---
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
        res.setActualPrice(contract.getActualPrice());
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
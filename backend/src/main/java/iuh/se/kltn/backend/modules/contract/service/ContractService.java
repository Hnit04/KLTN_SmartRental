package iuh.se.kltn.backend.modules.contract.service;

import iuh.se.kltn.backend.common.enums.Role;
import iuh.se.kltn.backend.modules.contract.dto.request.ContractRequest;
import iuh.se.kltn.backend.modules.contract.dto.request.SignContractRequest;
import iuh.se.kltn.backend.modules.contract.dto.response.ContractResponse;
import iuh.se.kltn.backend.modules.contract.entity.Contract;
import iuh.se.kltn.backend.modules.contract.entity.ContractChangeRequest; // ✅ BỔ SUNG IMPORT
import iuh.se.kltn.backend.modules.contract.enums.ContractStatus;
import iuh.se.kltn.backend.modules.contract.enums.ContractSignMethod;
import iuh.se.kltn.backend.modules.contract.enums.DepositStatus;
import iuh.se.kltn.backend.modules.contract.enums.RequestStatus;
import iuh.se.kltn.backend.modules.contract.enums.RequestType; // ✅ BỔ SUNG IMPORT
import iuh.se.kltn.backend.modules.contract.repository.ContractChangeRequestRepository;
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

        Tenant tenant;
        boolean isTenantCreating = false;

        if (currentUser.getRole() == Role.LANDLORD) {
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
            tenant = (Tenant) currentUser;
            isTenantCreating = true;
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
        contract.setStatus(ContractStatus.PENDING_SIGNATURE);
        contract.setDepositStatus(DepositStatus.UNPAID);

        // ✅ LOGIC MỚI XỬ LÝ ĐIỀU KHOẢN
        String defaultTerms = room.getDefaultTerms() != null ? room.getDefaultTerms() : "";
        if (isTenantCreating) {
            // Nếu Khách thuê tạo: Hợp đồng gốc tạm thời chỉ giữ nội quy của Chủ trọ
            contract.setAdditionalTerms(defaultTerms);
        } else {
            // Nếu Chủ trọ tạo: Lấy thẳng nội dung từ form (vì chủ trọ có quyền quyết định cuối)
            contract.setAdditionalTerms(request.getAdditionalTerms());
        }

        String termsForHash = contract.getAdditionalTerms() != null ? contract.getAdditionalTerms() : "";
        String rawData = "CONTRACT-" + room.getId() + "-" + tenant.getId() + "-" + termsForHash + "-" + UUID.randomUUID();
        contract.setContractHash(calculateSHA256(rawData));
        contract.setContentUrl("https://smart-rental-storage.com/contracts/sample.pdf");

        Contract saved = contractRepository.save(contract);

        // ✅ Cập nhật trạng thái phòng thành Đang giữ chỗ
        if (room != null) {
            room.setStatus(RoomStatus.RESERVED);
            roomRepository.save(room);
        }

        // ✅ TỰ ĐỘNG TẠO ĐỀ XUẤT CHỈNH SỬA NẾU LÀ KHÁCH THUÊ TẠO HỢP ĐỒNG
        if (isTenantCreating) {
            String proposedTerms = request.getAdditionalTerms() != null ? request.getAdditionalTerms() : "";
            // Nếu văn bản khách gửi lên khác với nội quy gốc
            if (!proposedTerms.trim().equals(defaultTerms.trim())) {
                ContractChangeRequest changeReq = new ContractChangeRequest();
                changeReq.setContract(saved);
                changeReq.setType(RequestType.CHANGE_TERMS);
                changeReq.setOldValue(defaultTerms);
                changeReq.setNewValue(proposedTerms);
                changeReq.setReason("Khách thuê đề xuất các thỏa thuận riêng khi đăng ký thuê phòng.");
                changeReq.setStatus(RequestStatus.PENDING);
                changeReq.setRequestedByRole("TENANT");
                changeRequestRepository.save(changeReq);
            }
        }

        return mapToResponse(saved);
    }

    // --- 2. Lấy danh sách ---
    public List<ContractResponse> getMyContracts(Long userId) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new RuntimeException("User không tồn tại"));

        List<Contract> contracts;
        if (user.getRole() == Role.LANDLORD) {
            contracts = contractRepository.findContractsByLandlordId(userId);
        } else {
            contracts = contractRepository.findByTenantId(userId);
        }
        return contracts.stream().map(this::mapToResponse).collect(Collectors.toList());
    }

    // --- Admin: Lấy tất cả hợp đồng ---
    public List<ContractResponse> getAllContracts() {
        return contractRepository.findAll().stream().map(this::mapToResponse).collect(Collectors.toList());
    }

    // --- Admin: Xác minh tính toàn vẹn hợp đồng (Level 2 + 3) ---
    public java.util.Map<String, Object> verifyContract(Long id) {
        Contract contract = contractRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Hợp đồng không tồn tại"));

        java.util.Map<String, Object> result = new java.util.LinkedHashMap<>();
        result.put("contractId", id);

        boolean hasBlockchain = contract.getSmartContractAddress() != null
                && !contract.getSmartContractAddress().isEmpty();

        if (hasBlockchain) {
            // === LEVEL 3: ĐỌC TỪ BLOCKCHAIN VÀ SO SÁNH ===
            try {
                java.util.Map<String, Object> onChain = blockchainService.readContractData(contract.getSmartContractAddress());

                java.util.List<java.util.Map<String, Object>> comparisons = new java.util.ArrayList<>();

                // So sánh rentAmount (ÁP DỤNG ADDENDUM PATTERN)
                java.math.BigInteger onChainRent = (java.math.BigInteger) onChain.get("rentAmount");
                long dbRent = contract.getActualPrice() != null ? contract.getActualPrice().longValue() : 0;
                java.util.Map<String, Object> rentComp = createComparison("rentAmount", String.valueOf(dbRent), onChainRent.toString());
                
                // 🔍 Addendum Pattern: Nếu giá lệch, kiểm tra có Phụ lục hợp pháp không
                if (!Boolean.TRUE.equals(rentComp.get("match"))) {
                    java.util.List<ContractChangeRequest> rentAddendums = changeRequestRepository
                            .findByContractIdAndStatusAndType(id, RequestStatus.ACCEPTED, RequestType.RENT_INCREASE);
                    if (!rentAddendums.isEmpty()) {
                        ContractChangeRequest latestAddendum = rentAddendums.get(rentAddendums.size() - 1);
                        rentComp.put("match", true); // Lệch hợp pháp
                        rentComp.put("modified", true);
                        rentComp.put("addendum", "Phụ lục #" + latestAddendum.getId() 
                                + " (Duyệt ngày " + latestAddendum.getRequestDate().toLocalDate() + ")"
                                + " | Gốc: " + latestAddendum.getOldValue() + " → Mới: " + latestAddendum.getNewValue());
                    }
                }
                comparisons.add(rentComp);

                // So sánh depositAmount
                java.math.BigInteger onChainDeposit = (java.math.BigInteger) onChain.get("depositAmount");
                long dbDeposit = contract.getDepositAmount() != null ? contract.getDepositAmount().longValue() : 0;
                comparisons.add(createComparison("depositAmount", String.valueOf(dbDeposit), onChainDeposit.toString()));

                // So sánh contractHash
                String onChainHash = (String) onChain.get("contractHash");
                String dbHash = contract.getContractHash() != null ? contract.getContractHash() : "";
                comparisons.add(createComparison("contractHash", dbHash, onChainHash));

                // So sánh roomName
                String onChainRoom = (String) onChain.get("roomName");
                String dbRoom = contract.getRoom() != null ? contract.getRoom().getName() : "";
                comparisons.add(createComparison("roomName", dbRoom, onChainRoom));

                boolean allMatch = comparisons.stream()
                        .allMatch(c -> Boolean.TRUE.equals(c.get("match")));

                result.put("valid", allMatch);
                result.put("verifyLevel", "BLOCKCHAIN");
                result.put("comparisons", comparisons);
                result.put("smartContractAddress", contract.getSmartContractAddress());

            } catch (Exception e) {
                result.put("valid", false);
                result.put("verifyLevel", "BLOCKCHAIN_ERROR");
                result.put("error", "Không thể đọc dữ liệu từ blockchain: " + e.getMessage());
            }
        } else {
            // === LEVEL 2: CHỈ KIỂM TRA SỰ TỒN TẠI CỦA HASH ===
            boolean hasHash = contract.getContractHash() != null && !contract.getContractHash().isEmpty();
            result.put("valid", hasHash);
            result.put("verifyLevel", "DATABASE");
            result.put("message", hasHash ? "Hash tồn tại trong DB" : "Không tìm thấy hash trong DB");
        }

        return result;
    }

    private java.util.Map<String, Object> createComparison(String field, String dbValue, String onChainValue) {
        java.util.Map<String, Object> comp = new java.util.LinkedHashMap<>();
        comp.put("field", field);
        comp.put("database", dbValue);
        comp.put("onChain", onChainValue);
        comp.put("match", dbValue.equals(onChainValue));
        return comp;
    }

    public ContractResponse getContractById(Long id) {
        Contract contract = contractRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Không tìm thấy hợp đồng với ID: " + id));
        return mapToResponse(contract);
    }
    
    @Transactional
    public ContractResponse updateContractTerms(Long contractId, String newTerms, Long userId) {
        Contract contract = contractRepository.findById(contractId)
                .orElseThrow(() -> new RuntimeException("Hợp đồng không tồn tại"));

        User user = userRepository.findById(userId)
                .orElseThrow(() -> new RuntimeException("User không tồn tại"));
                
        // Chỉ cho phép sửa khi hợp đồng CHƯA CÓ HIỆU LỰC
        if (contract.getStatus() != ContractStatus.PENDING_SIGNATURE) {
            throw new RuntimeException("Chỉ có thể chỉnh sửa điều khoản khi hợp đồng chưa được ký kết hoàn tất.");
        }

        contract.setAdditionalTerms(newTerms);
        
        // CỰC KỲ QUAN TRỌNG: Khi hợp đồng bị sửa nội dung, phải xóa bỏ toàn bộ chữ ký cũ
        contract.setIsTenantSigned(false);
        contract.setIsLandlordSigned(false);

        // Tính toán lại Hash của hợp đồng
        String termsForHash = contract.getAdditionalTerms() != null ? contract.getAdditionalTerms() : "";
        String rawData = "CONTRACT-" + contract.getRoom().getId() + "-" + contract.getTenant().getId() + "-" + termsForHash + "-" + UUID.randomUUID();
        contract.setContractHash(calculateSHA256(rawData));
        
        Contract saved = contractRepository.save(contract);
        return mapToResponse(saved);
    }

    // --- 3. Hàm ký hợp đồng ---
    @Transactional
    public ContractResponse signContract(Long id, SignContractRequest request, Long currentUserId) {
        Contract contract = contractRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Hợp đồng không tồn tại"));

        if (contract.getStatus() == ContractStatus.ACTIVE) {
            throw new RuntimeException("Hợp đồng này đã được ký hoàn tất!");
        }

        boolean hasPendingRequest = changeRequestRepository.existsByContractIdAndStatus(id, RequestStatus.PENDING);
        if (hasPendingRequest) {
            throw new RuntimeException("Không thể ký! Đang có đề xuất chỉnh sửa chờ xác nhận.");
        }

        // Lấy thông tin user đang thao tác
        User currentUser = userRepository.findById(currentUserId)
                .orElseThrow(() -> new RuntimeException("User không tồn tại"));

        // 1. Cập nhật trạng thái ký của từng người
        if (currentUser.getRole() == Role.TENANT) {
            contract.setIsTenantSigned(true);
        } else if (currentUser.getRole() == Role.LANDLORD) {
            contract.setIsLandlordSigned(true);
        }

        // Lưu tạm phương thức ký của người thao tác cuối cùng
        contract.setSignMethod(request.getSignMethod());

        // 2. NẾU CẢ 2 BÊN ĐÃ KÝ -> KÍCH HOẠT HỢP ĐỒNG & DEPLOY BLOCKCHAIN
        if (Boolean.TRUE.equals(contract.getIsTenantSigned()) && Boolean.TRUE.equals(contract.getIsLandlordSigned())) {
            contract.setSignDate(LocalDateTime.now());
            contract.setStatus(ContractStatus.ACTIVE);

            if (request.getSignMethod() == ContractSignMethod.BLOCKCHAIN) {
                try {
                    String contractHashData = "HASH-" + contract.getId() + "-" + UUID.randomUUID();
                    
                    String tenantWallet = contract.getTenant().getWalletAddress();
                    if (tenantWallet == null || tenantWallet.isEmpty()) {
                        tenantWallet = "0xAb8483F64d9C6d1EcF9b849Ae677dD3315835cb2"; // fallback
                    }

                    String landlordWallet = contract.getRoom().getProperty().getLandlord().getWalletAddress();
                    if (landlordWallet == null || landlordWallet.isEmpty()) {
                        landlordWallet = "0x5B38Da6a701c568545dCfcB03FcB875f56beddC4"; // fallback
                    }

                    long priceVal = (contract.getActualPrice() != null) ? contract.getActualPrice().longValue() : 0L;
                    long depositVal = (contract.getDepositAmount() != null) ? contract.getDepositAmount().longValue() : 0L;

                    BigInteger rentWei = BigInteger.valueOf(priceVal);
                    BigInteger depositWei = BigInteger.valueOf(depositVal);

                    String deployedAddress = blockchainService.deployRentalContract(
                            landlordWallet, tenantWallet, (contract.getRoom() != null ? contract.getRoom().getName() : "Unknown"),
                            contractHashData, rentWei, depositWei
                    );

                    contract.setSmartContractAddress(deployedAddress);
                    contract.setContractHash(contractHashData);
                    contract.setDeployTxHash("Deployed on Sepolia via Backend");

                } catch (Exception e) {
                    e.printStackTrace();
                    throw new RuntimeException("Lỗi Deploy Blockchain: " + e.getMessage());
                }
            }

            if (contract.getRoom() != null) {
                contract.getRoom().setStatus(RoomStatus.RENTED);
                roomRepository.save(contract.getRoom());
            }
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
                res.setElecPrice(contract.getRoom().getProperty().getElecPrice());
                res.setWaterPrice(contract.getRoom().getProperty().getWaterPrice());
                res.setInternetPrice(contract.getRoom().getProperty().getInternetPrice());
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
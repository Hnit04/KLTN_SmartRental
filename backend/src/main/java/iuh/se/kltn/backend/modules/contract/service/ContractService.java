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
    
    private final ModelMapper modelMapper;
    
    @Autowired private BlockchainService blockchainService;
    @Autowired private iuh.se.kltn.backend.modules.user.service.ReputationService reputationService;
    @Autowired private iuh.se.kltn.backend.modules.interaction.service.NotificationService notificationService;
    @Autowired private iuh.se.kltn.backend.modules.contract.repository.ContractChangeRequestRepository changeRequestRepository;
    
    @org.springframework.beans.factory.annotation.Value("${blockchain.fallback-landlord-wallet:}")
    private String fallbackLandlordWallet;

    @org.springframework.beans.factory.annotation.Value("${blockchain.fallback-tenant-wallet:}")
    private String fallbackTenantWallet;

    @Autowired
    public ContractService(ModelMapper modelMapper) {
        this.modelMapper = modelMapper;
    }

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

        // ✅ KIỂM TRA: Tenant chỉ được thuê 1 phòng tại 1 thời điểm (Cho phép thuê gối đầu nếu HĐ cũ sắp hết)
        Long tenantIdToCheck = null;
        if (currentUser.getRole() == Role.TENANT) {
            tenantIdToCheck = currentUserId;
        } else if (currentUser.getRole() == Role.LANDLORD && request.getTenantEmail() != null && !request.getTenantEmail().isEmpty()) {
            User foundTenantForCheck = userRepository.findByEmail(request.getTenantEmail()).orElse(null);
            if (foundTenantForCheck != null) {
                tenantIdToCheck = foundTenantForCheck.getId();
            }
        }
        if (tenantIdToCheck != null) {
            List<Contract> existingContracts = contractRepository.findByTenantIdAndStatusIn(
                tenantIdToCheck, java.util.List.of(ContractStatus.ACTIVE, ContractStatus.PENDING_SIGNATURE, ContractStatus.AWAITING_DEPOSIT)
            );
            
            // Lọc các hợp đồng thực sự bị xung đột thời gian (Ngày bắt đầu mới phải sau hoặc bằng ngày kết thúc của HĐ cũ)
            java.time.LocalDate requestedStart = request.getStartDate();
            existingContracts = existingContracts.stream().filter(c -> 
                c.getEndDate() == null || c.getEndDate().isAfter(requestedStart) || c.getEndDate().isEqual(requestedStart)
            ).collect(Collectors.toList());

            if (!existingContracts.isEmpty()) {
                Contract existing = existingContracts.get(0);
                String roomName = existing.getRoom() != null ? existing.getRoom().getName() : "#" + existing.getId();
                String statusLabel = existing.getStatus() == ContractStatus.ACTIVE ? "đang thuê" : "đang chờ ký";
                String endDateStr = existing.getEndDate() != null ? "ngày " + existing.getEndDate() : "vô thời hạn (chưa xác định ngày kết thúc)";
                throw new RuntimeException("Người thuê đã có hợp đồng " + statusLabel + " tại phòng " + roomName + " đến " + endDateStr + ". Hãy chọn ngày bắt đầu hợp đồng mới sau thời điểm này (nếu có)!");
            }
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

        // ✅ CHỤP ẢNH SNAPSHOT DỮ LIỆU ĐỂ GIỮ TÍNH BẤT BIẾN KHI SO SÁNH BLOCKCHAIN (CHỐNG LỖI KHI PROPERTY THAY ĐỔI)
        if (room.getProperty() != null) {
            contract.setElecPriceSnapshot(room.getProperty().getElecPrice());
            contract.setWaterPriceSnapshot(room.getProperty().getWaterPrice());
            contract.setInternetPriceSnapshot(room.getProperty().getInternetPrice());
            if (room.getProperty().getLandlord() != null) {
                contract.setLandlordWalletSnapshot(room.getProperty().getLandlord().getWalletAddress());
            }
        }
        contract.setTenantWalletSnapshot(tenant.getWalletAddress());
        contract.setLatePenaltyPercent(5); // Default 5%

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

        // ✅ THÔNG BÁO CHO CHỦ NHÀ / KHÁCH THUÊ
        User notifyUser = isTenantCreating ? room.getProperty().getLandlord() : tenant;
        if (notifyUser != null) {
            notificationService.createNotification(
                notifyUser,
                isTenantCreating ? "Đề xuất thuê phòng" : "Hợp đồng mới được soạn",
                isTenantCreating ? ("Khách " + tenant.getFullName() + " muốn thuê phòng " + room.getName()) : ("Chủ trọ đã soạn hợp đồng cho phòng " + room.getName()),
                iuh.se.kltn.backend.modules.interaction.enums.NotificationType.CONTRACT_UPDATE,
                saved.getId()
            );
        }

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

        return mapToResponse(saved, currentUserId);
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
        return contracts.stream().map(c -> mapToResponse(c, userId)).collect(Collectors.toList());
    }

    // --- 2b. Lấy phòng hiện tại của người dùng (Chủ phòng HOẶC Thành viên) ---
    public ContractResponse getMyCurrentRoom(Long userId) {
        // Tìm các hợp đồng ACTIVE hoặc PENDING_SIGNATURE mà user là Tenant hoặc Member
        List<Contract> contracts = contractRepository.findCurrentContractsByUserId(
            userId, 
            java.util.List.of(ContractStatus.ACTIVE, ContractStatus.PENDING_SIGNATURE, ContractStatus.AWAITING_DEPOSIT)
        );

        if (contracts.isEmpty()) {
            return null;
        }

        // Ưu tiên trả về hợp đồng ACTIVE nếu có nhiều hơn 1 (thực tế ràng buộc là 1 người 1 phòng)
        Contract contract = contracts.stream()
                .filter(c -> c.getStatus() == ContractStatus.ACTIVE)
                .findFirst()
                .orElse(contracts.get(0));

        return mapToResponse(contract, userId);
    }

    // --- 2c. Lấy TẤT CẢ lịch sử thuê của người dùng ---
    public List<ContractResponse> getRentalHistory(Long userId) {
        List<Contract> contracts = contractRepository.findAllRentalHistoryByUserId(userId);
        return contracts.stream()
                .map(c -> mapToResponse(c, userId))
                .collect(Collectors.toList());
    }

    // --- Admin: Lấy tất cả hợp đồng ---
    public List<ContractResponse> getAllContracts() {
        return contractRepository.findAll().stream().map(c -> mapToResponse(c, null)).collect(Collectors.toList());
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

                long EXCHANGE_RATE = 80_000_000L;
                java.math.BigInteger WEI_MULT = java.math.BigInteger.TEN.pow(18);

                // So sánh rentAmount (ÁP DỤNG ADDENDUM PATTERN)
                java.math.BigInteger onChainRent = (java.math.BigInteger) onChain.get("rentAmount");
                long dbRent = contract.getActualPrice() != null ? contract.getActualPrice().longValue() : 0;
                java.math.BigInteger dbRentWei = java.math.BigInteger.valueOf(dbRent).multiply(WEI_MULT).divide(java.math.BigInteger.valueOf(EXCHANGE_RATE));
                java.util.Map<String, Object> rentComp = createComparison("rentAmount", dbRentWei.toString(), onChainRent.toString());
                
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
                java.math.BigInteger dbDepositWei = java.math.BigInteger.valueOf(dbDeposit).multiply(WEI_MULT).divide(java.math.BigInteger.valueOf(EXCHANGE_RATE));
                comparisons.add(createComparison("depositAmount", dbDepositWei.toString(), onChainDeposit.toString()));

                // So sánh contractHash
                String onChainHash = (String) onChain.get("contractHash");
                String dbHash = contract.getContractHash() != null ? contract.getContractHash() : "";
                comparisons.add(createComparison("contractHash", dbHash, onChainHash));

                // So sánh roomName
                String onChainRoom = (String) onChain.get("roomName");
                String dbRoom = contract.getRoom() != null ? contract.getRoom().getName() : "";
                comparisons.add(createComparison("roomName", dbRoom, onChainRoom));

                // So sánh elecPrice
                java.math.BigInteger onChainElec = (java.math.BigInteger) onChain.get("elecPrice");
                long dbElec = contract.getElecPriceSnapshot() != null ? contract.getElecPriceSnapshot().longValue() : 
                              (contract.getRoom() != null && contract.getRoom().getProperty() != null && contract.getRoom().getProperty().getElecPrice() != null 
                              ? contract.getRoom().getProperty().getElecPrice().longValue() : 0L);
                java.math.BigInteger dbElecWei = java.math.BigInteger.valueOf(dbElec).multiply(WEI_MULT).divide(java.math.BigInteger.valueOf(EXCHANGE_RATE));
                comparisons.add(createComparison("elecPrice", dbElecWei.toString(), onChainElec.toString()));

                // So sánh waterPrice
                java.math.BigInteger onChainWater = (java.math.BigInteger) onChain.get("waterPrice");
                long dbWater = contract.getWaterPriceSnapshot() != null ? contract.getWaterPriceSnapshot().longValue() : 
                               (contract.getRoom() != null && contract.getRoom().getProperty() != null && contract.getRoom().getProperty().getWaterPrice() != null 
                               ? contract.getRoom().getProperty().getWaterPrice().longValue() : 0L);
                java.math.BigInteger dbWaterWei = java.math.BigInteger.valueOf(dbWater).multiply(WEI_MULT).divide(java.math.BigInteger.valueOf(EXCHANGE_RATE));
                comparisons.add(createComparison("waterPrice", dbWaterWei.toString(), onChainWater.toString()));

                // So sánh internetPrice
                java.math.BigInteger onChainInternet = (java.math.BigInteger) onChain.get("internetPrice");
                long dbInternet = contract.getInternetPriceSnapshot() != null ? contract.getInternetPriceSnapshot().longValue() : 
                               (contract.getRoom() != null && contract.getRoom().getProperty() != null && contract.getRoom().getProperty().getInternetPrice() != null 
                               ? contract.getRoom().getProperty().getInternetPrice().longValue() : 0L);
                java.math.BigInteger dbInternetWei = java.math.BigInteger.valueOf(dbInternet).multiply(WEI_MULT).divide(java.math.BigInteger.valueOf(EXCHANGE_RATE));
                comparisons.add(createComparison("internetPrice", dbInternetWei.toString(), onChainInternet.toString()));

                // So sánh startDate
                java.math.BigInteger onChainStartDate = (java.math.BigInteger) onChain.get("startDate");
                long dbStartDate = contract.getStartDate() != null ? contract.getStartDate().atStartOfDay().toEpochSecond(java.time.ZoneOffset.UTC) : 0L;
                comparisons.add(createComparison("startDate", String.valueOf(dbStartDate), onChainStartDate.toString()));

                // So sánh endDate
                java.math.BigInteger onChainEndDate = (java.math.BigInteger) onChain.get("endDate");
                long dbEndDate = contract.getEndDate() != null ? contract.getEndDate().atStartOfDay().toEpochSecond(java.time.ZoneOffset.UTC) : 0L;
                comparisons.add(createComparison("endDate", String.valueOf(dbEndDate), onChainEndDate.toString()));

                // So sánh latePenaltyPercent
                java.math.BigInteger onChainLatePenaltyPercent = (java.math.BigInteger) onChain.get("latePenaltyPercent");
                long dbLatePenaltyPercent = contract.getLatePenaltyPercent() != null ? contract.getLatePenaltyPercent().longValue() : 5L;
                comparisons.add(createComparison("latePenaltyPercent", String.valueOf(dbLatePenaltyPercent), onChainLatePenaltyPercent.toString()));

                // So sánh landlordAddress
                String onChainLandlord = (String) onChain.get("landlordAddress");
                String realLandlord = contract.getLandlordWalletSnapshot() != null && !contract.getLandlordWalletSnapshot().isEmpty() ? contract.getLandlordWalletSnapshot().toLowerCase() : 
                        (contract.getRoom() != null && contract.getRoom().getProperty() != null && contract.getRoom().getProperty().getLandlord() != null
                        && contract.getRoom().getProperty().getLandlord().getWalletAddress() != null && !contract.getRoom().getProperty().getLandlord().getWalletAddress().isEmpty()
                        ? contract.getRoom().getProperty().getLandlord().getWalletAddress().toLowerCase() : fallbackLandlordWallet.toLowerCase());
                comparisons.add(createComparison("landlordAddress", realLandlord, onChainLandlord));

                // So sánh tenantAddress
                String onChainTenant = (String) onChain.get("tenantAddress");
                String realTenant = contract.getTenantWalletSnapshot() != null && !contract.getTenantWalletSnapshot().isEmpty() ? contract.getTenantWalletSnapshot().toLowerCase() : 
                        (contract.getTenant() != null && contract.getTenant().getWalletAddress() != null && !contract.getTenant().getWalletAddress().isEmpty()
                        ? contract.getTenant().getWalletAddress().toLowerCase() : fallbackTenantWallet.toLowerCase());
                comparisons.add(createComparison("tenantAddress", realTenant, onChainTenant));

                boolean allMatch = comparisons.stream()
                        .allMatch(c -> Boolean.TRUE.equals(c.get("match")));

                result.put("valid", allMatch);
                result.put("verifyLevel", "BLOCKCHAIN");
                result.put("comparisons", comparisons);
                result.put("smartContractAddress", contract.getSmartContractAddress());
                result.put("unpaidBillCount", onChain.get("unpaidBillCount"));

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
        return mapToResponse(contract, null);
    }
    
    @Transactional
    public ContractResponse updateContractTerms(Long contractId, String newTerms, Long userId) {
        Contract contract = contractRepository.findById(contractId)
                .orElseThrow(() -> new RuntimeException("Hợp đồng không tồn tại"));

        userRepository.findById(userId)
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
        
        // ✅ THÔNG BÁO CHO BÊN CÒN LẠI
        User notifyUser = (userId.equals(contract.getTenant().getId())) 
                ? contract.getRoom().getProperty().getLandlord() : contract.getTenant();
        notificationService.createNotification(
            notifyUser,
            "Hợp đồng bị sửa đổi điều khoản",
            "Nội dung hợp đồng phòng " + contract.getRoom().getName() + " vừa bị thay đổi. Vui lòng kiểm tra và ký lại.",
            iuh.se.kltn.backend.modules.interaction.enums.NotificationType.CONTRACT_UPDATE,
            contract.getId()
        );

        return mapToResponse(saved, userId);
    }

    // --- 3. Hàm ký hợp đồng ---
    @Transactional
    public ContractResponse signContract(Long id, SignContractRequest request, Long currentUserId) {
        Contract contract = contractRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Hợp đồng không tồn tại"));

        // Lấy thông tin user đang thao tác
        User currentUser = userRepository.findById(currentUserId)
                .orElseThrow(() -> new RuntimeException("User không tồn tại"));

        // Nếu đã ở trạng thái nâng cao (ACTIVE hoặc AWAITING_DEPOSIT)
        if (contract.getStatus() == ContractStatus.ACTIVE || contract.getStatus() == ContractStatus.AWAITING_DEPOSIT) {
            // Nếu chính user này đã ký rồi, thì trả về thành công luôn (Idempotent)
            if ((currentUser.getRole() == Role.TENANT && Boolean.TRUE.equals(contract.getIsTenantSigned())) ||
                (currentUser.getRole() == Role.LANDLORD && Boolean.TRUE.equals(contract.getIsLandlordSigned()))) {
                return mapToResponse(contract, currentUserId);
            }
            throw new RuntimeException("Hợp đồng này đã được ký hoàn tất hoặc đang chờ nạp cọc!");
        }

        boolean hasPendingRequest = changeRequestRepository.existsByContractIdAndStatus(id, RequestStatus.PENDING);
        if (hasPendingRequest) {
            throw new RuntimeException("Không thể ký! Đang có đề xuất chỉnh sửa chờ xác nhận.");
        }

        // 1. Cập nhật trạng thái ký của từng người
        if (currentUser.getRole() == Role.TENANT) {
            contract.setIsTenantSigned(true);
        } else if (currentUser.getRole() == Role.LANDLORD) {
            contract.setIsLandlordSigned(true);
        }

        // Lưu tạm phương thức ký của người thao tác cuối cùng
        contract.setSignMethod(request.getSignMethod());

        // 2. NẾU CẢ 2 BÊN ĐÃ KÝ -> CHUYỂN SANG CHỜ ĐẶT CỌC
        if (Boolean.TRUE.equals(contract.getIsTenantSigned()) && Boolean.TRUE.equals(contract.getIsLandlordSigned())) {
            contract.setSignDate(LocalDateTime.now());
            contract.setStatus(ContractStatus.AWAITING_DEPOSIT);
            contract.setDepositStatus(DepositStatus.UNPAID); 

            // (Bỏ qua việc cộng điểm ở đây, sẽ cộng khi tiền cọc được xác nhận)

            if (request.getSignMethod() == ContractSignMethod.BLOCKCHAIN && (contract.getSmartContractAddress() == null || contract.getSmartContractAddress().isEmpty())) {
                if (blockchainService.getPrivateKey() == null || blockchainService.getPrivateKey().isEmpty()) {
                    throw new RuntimeException("Cấu hình Blockchain (Private Key) đang trống! Không thể triển khai hợp đồng. Vui lòng liên hệ Admin.");
                }
                try {
                    String contractHashData = "HASH-" + contract.getId() + "-" + UUID.randomUUID();
                    
                    String tenantWallet = contract.getTenantWalletSnapshot() != null ? contract.getTenantWalletSnapshot() : contract.getTenant().getWalletAddress();
                    if (tenantWallet == null || tenantWallet.isEmpty()) {
                        tenantWallet = fallbackTenantWallet; // fallback
                    }

                    String landlordWallet = contract.getLandlordWalletSnapshot() != null ? contract.getLandlordWalletSnapshot() : contract.getRoom().getProperty().getLandlord().getWalletAddress();
                    if (landlordWallet == null || landlordWallet.isEmpty()) {
                        landlordWallet = fallbackLandlordWallet; // fallback
                    }

                    long priceVal = (contract.getActualPrice() != null) ? contract.getActualPrice().longValue() : 0L;
                    long depositVal = (contract.getDepositAmount() != null) ? contract.getDepositAmount().longValue() : 0L;
                    long elecVal = contract.getElecPriceSnapshot() != null ? contract.getElecPriceSnapshot().longValue() : 
                                   (contract.getRoom() != null && contract.getRoom().getProperty() != null && contract.getRoom().getProperty().getElecPrice() != null ? contract.getRoom().getProperty().getElecPrice().longValue() : 0L);
                    long waterVal = contract.getWaterPriceSnapshot() != null ? contract.getWaterPriceSnapshot().longValue() : 
                                    (contract.getRoom() != null && contract.getRoom().getProperty() != null && contract.getRoom().getProperty().getWaterPrice() != null ? contract.getRoom().getProperty().getWaterPrice().longValue() : 0L);
                    
                    long internetVal = contract.getInternetPriceSnapshot() != null ? contract.getInternetPriceSnapshot().longValue() : 
                                    (contract.getRoom() != null && contract.getRoom().getProperty() != null && contract.getRoom().getProperty().getInternetPrice() != null ? contract.getRoom().getProperty().getInternetPrice().longValue() : 0L);
                    long startDateVal = contract.getStartDate() != null ? contract.getStartDate().atStartOfDay().toEpochSecond(java.time.ZoneOffset.UTC) : 0L;
                    long endDateVal = contract.getEndDate() != null ? contract.getEndDate().atStartOfDay().toEpochSecond(java.time.ZoneOffset.UTC) : 0L;
                    long penaltyVal = contract.getLatePenaltyPercent() != null ? contract.getLatePenaltyPercent().longValue() : 5L;

                    long EXCHANGE_RATE = 80_000_000L;
                    BigInteger WEI_MULT = BigInteger.TEN.pow(18);

                    BigInteger rentWei = BigInteger.valueOf(priceVal).multiply(WEI_MULT).divide(BigInteger.valueOf(EXCHANGE_RATE));
                    BigInteger depositWei = BigInteger.valueOf(depositVal).multiply(WEI_MULT).divide(BigInteger.valueOf(EXCHANGE_RATE));
                    BigInteger elecWei = BigInteger.valueOf(elecVal).multiply(WEI_MULT).divide(BigInteger.valueOf(EXCHANGE_RATE));
                    BigInteger waterWei = BigInteger.valueOf(waterVal).multiply(WEI_MULT).divide(BigInteger.valueOf(EXCHANGE_RATE));
                    BigInteger internetWei = BigInteger.valueOf(internetVal).multiply(WEI_MULT).divide(BigInteger.valueOf(EXCHANGE_RATE));
                    BigInteger startWei = BigInteger.valueOf(startDateVal);
                    BigInteger endWei = BigInteger.valueOf(endDateVal);
                    BigInteger penaltyWei = BigInteger.valueOf(penaltyVal);

                    String deployedAddress = blockchainService.deployRentalContract(
                            landlordWallet, tenantWallet, (contract.getRoom() != null ? contract.getRoom().getName() : "Unknown"),
                            contractHashData, rentWei, depositWei, elecWei, waterWei, internetWei, startWei, endWei, penaltyWei
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

        // ✅ THÔNG BÁO KHI CÓ NGƯỜI KÝ
        User notifyUser = (currentUserId.equals(contract.getTenant().getId()))
                ? contract.getRoom().getProperty().getLandlord() : contract.getTenant();
        notificationService.createNotification(
            notifyUser,
            "Bên kia đã ký hợp đồng",
            currentUser.getFullName() + " đã thực hiện ký hợp đồng cho phòng " + contract.getRoom().getName(),
            iuh.se.kltn.backend.modules.interaction.enums.NotificationType.CONTRACT_UPDATE,
            contract.getId()
        );

        return mapToResponse(savedContract, currentUserId);
    }

    // --- Helper Functions ---
    private ContractResponse mapToResponse(Contract contract, Long currentUserId) {
        ContractResponse res = modelMapper.map(contract, ContractResponse.class);
        
        if (contract.getTenant() != null) {
            res.setTenantId(contract.getTenant().getId());
        }
        if (contract.getRoom() != null && contract.getRoom().getProperty() != null && contract.getRoom().getProperty().getLandlord() != null) {
            res.setLandlordId(contract.getRoom().getProperty().getLandlord().getId());
        }
        
        // Xác định vai trò
        if (currentUserId != null) {
            if (contract.getTenant() != null && contract.getTenant().getId().equals(currentUserId)) {
                res.setUserRole("CHỦ PHÒNG");
            } else {
                res.setUserRole("THÀNH VIÊN");
            }
        }
        if (contract.getRoom() != null) {
            res.setRoomId(contract.getRoom().getId());
            res.setRoomName(contract.getRoom().getName());
            res.setMaxOccupants(contract.getRoom().getMaxOccupants());
            if (contract.getRoom().getProperty() != null) {
                res.setPropertyAddress(contract.getRoom().getProperty().getAddress());
                if (contract.getRoom().getProperty().getLandlord() != null) {
                    res.setLandlordName(contract.getRoom().getProperty().getLandlord().getFullName());
                    res.setLandlordWalletAddress(contract.getRoom().getProperty().getLandlord().getWalletAddress());
                    res.setLandlordBankName(contract.getRoom().getProperty().getLandlord().getBankName());
                    res.setLandlordBankAccountNumber(contract.getRoom().getProperty().getLandlord().getBankAccountNumber());
                    res.setLandlordBankAccountHolder(contract.getRoom().getProperty().getLandlord().getBankAccountHolder());
                    res.setLandlordBankQrUrl(contract.getRoom().getProperty().getLandlord().getBankQrUrl());
                }
                res.setElecPrice(contract.getRoom().getProperty().getElecPrice());
                res.setWaterPrice(contract.getRoom().getProperty().getWaterPrice());
                res.setInternetPrice(contract.getRoom().getProperty().getInternetPrice());
            }
        }
        if (contract.getTenant() != null) {
            res.setTenantName(contract.getTenant().getFullName());
            res.setTenantPhone(contract.getTenant().getPhoneNumber());
            res.setTenantCccd(contract.getTenant().getCccdNumber());
            res.setTenantWalletAddress(contract.getTenant().getWalletAddress());
            res.setTenantBankName(contract.getTenant().getBankName());
            res.setTenantBankAccountNumber(contract.getTenant().getBankAccountNumber());
            res.setTenantBankAccountHolder(contract.getTenant().getBankAccountHolder());
            res.setTenantBankQrUrl(contract.getTenant().getBankQrUrl());
        }
        res.setActualPrice(contract.getActualPrice());
        return res;
    }

    // --- Xác nhận hoàn cọc ---
    @Transactional
    public ContractResponse confirmDepositRefund(Long contractId, Long currentUserId) {
        Contract contract = contractRepository.findById(contractId)
                .orElseThrow(() -> new RuntimeException("Hợp đồng không tồn tại"));

        User currentUser = userRepository.findById(currentUserId)
                .orElseThrow(() -> new RuntimeException("User không tồn tại"));

        // Chỉ Chủ trọ mới được xác nhận hoàn cọc
        if (currentUser.getRole() != iuh.se.kltn.backend.common.enums.Role.LANDLORD) {
            throw new RuntimeException("Chỉ Chủ trọ mới có quyền xác nhận hoàn cọc!");
        }

        // Chỉ cho phép khi hợp đồng đã kết thúc
        if (contract.getStatus() != ContractStatus.EXPIRED 
                && contract.getStatus() != ContractStatus.TERMINATED_EARLY) {
            throw new RuntimeException("Chỉ có thể hoàn cọc khi hợp đồng đã kết thúc!");
        }

        contract.setDepositStatus(DepositStatus.REFUNDED);

        // 🔗 Kết thúc hợp đồng trên Blockchain (hoàn cọc full, deduction = 0)
        try {
            if (contract.getSmartContractAddress() != null && !contract.getSmartContractAddress().isEmpty()) {
                blockchainService.endContractOnChain(contract.getSmartContractAddress(), 0L);
                System.out.println("✅ Đã kết thúc hợp đồng trên Blockchain (hoàn cọc full)");
            }
        } catch (Exception e) {
            System.err.println("⚠️ Lỗi kết thúc hợp đồng trên Blockchain: " + e.getMessage());
        }

        Contract saved = contractRepository.save(contract);
        return mapToResponse(saved, currentUserId);
    }
    
    // --- Xác nhận đặt cọc Web3 ---
    @Transactional
    public ContractResponse confirmWeb3Deposit(Long contractId, String txHash, Long userId) {
        Contract contract = contractRepository.findById(contractId)
                .orElseThrow(() -> new RuntimeException("Hợp đồng không tồn tại"));
        
        if (contract.getStatus() != ContractStatus.AWAITING_DEPOSIT) {
            throw new RuntimeException("Hợp đồng này không trong trạng thái chờ nạp cọc.");
        }

        // 🔍 Xác minh giao dịch thật trên Blockchain
        if (!blockchainService.verifyTransaction(txHash)) {
            throw new RuntimeException("Giao dịch nạp cọc không hợp lệ hoặc chưa được xác nhận trên Blockchain!");
        }

        // Kích hoạt hợp đồng
        contract.setStatus(ContractStatus.ACTIVE);
        contract.setDepositStatus(DepositStatus.DEPOSITED);
        contract.setDepositTxHash(txHash);
        
        if (contract.getRoom() != null) {
            contract.getRoom().setStatus(RoomStatus.RENTED);
            roomRepository.save(contract.getRoom());
        }

        // Cộng điểm uy tín
        reputationService.processPoints(contract.getTenant(), iuh.se.kltn.backend.modules.user.enums.ReputationAction.CONTRACT_SIGNED, 5, "Nạp cọc và kích hoạt hợp đồng thành công (#" + contract.getId() + ")");
        reputationService.processPoints(contract.getRoom().getProperty().getLandlord(), iuh.se.kltn.backend.modules.user.enums.ReputationAction.CONTRACT_SIGNED, 5, "Hợp đồng đã được bên thuê nạp cọc thành công (#" + contract.getId() + ")");

        // Thông báo cho chủ nhà
        notificationService.createNotification(
            contract.getRoom().getProperty().getLandlord(),
            "Khách thuê đã nạp cọc Web3",
            "Hợp đồng phòng " + contract.getRoom().getName() + " đã chính thức có hiệu lực sau khi hệ thống xác nhận tiền cọc.",
            iuh.se.kltn.backend.modules.interaction.enums.NotificationType.CONTRACT_UPDATE,
            contract.getId()
        );

        return mapToResponse(contractRepository.save(contract), userId);
    }

    // --- Xác nhận đặt cọc Truyền thống (Chủ nhà xác nhận tay) ---
    @Transactional
    public ContractResponse confirmTraditionalDeposit(Long contractId, Long landlordId) {
        Contract contract = contractRepository.findById(contractId)
                .orElseThrow(() -> new RuntimeException("Hợp đồng không tồn tại"));
        
        if (!contract.getRoom().getProperty().getLandlord().getId().equals(landlordId)) {
            throw new RuntimeException("Bạn không phải chủ nhà của hợp đồng này!");
        }

        if (contract.getStatus() != ContractStatus.AWAITING_DEPOSIT) {
            throw new RuntimeException("Hợp đồng này không trong trạng thái chờ nạp cọc.");
        }

        // Kích hoạt hợp đồng
        contract.setStatus(ContractStatus.ACTIVE);
        contract.setDepositStatus(DepositStatus.DEPOSITED);
        
        if (contract.getRoom() != null) {
            contract.getRoom().setStatus(RoomStatus.RENTED);
            roomRepository.save(contract.getRoom());
        }

        // Cộng điểm uy tín
        reputationService.processPoints(contract.getTenant(), iuh.se.kltn.backend.modules.user.enums.ReputationAction.CONTRACT_SIGNED, 5, "Hợp đồng đã kích hoạt sau khi Chủ trọ nhận được tiền cọc (#" + contract.getId() + ")");
        reputationService.processPoints(contract.getRoom().getProperty().getLandlord(), iuh.se.kltn.backend.modules.user.enums.ReputationAction.CONTRACT_SIGNED, 5, "Xác nhận nhận tiền cọc thành công (#" + contract.getId() + ")");

        // Thông báo cho khách thuê
        notificationService.createNotification(
            contract.getTenant(),
            "Chủ trọ đã xác nhận tiền cọc",
            "Hợp đồng phòng " + contract.getRoom().getName() + " đã chính thức có hiệu lực.",
            iuh.se.kltn.backend.modules.interaction.enums.NotificationType.CONTRACT_UPDATE,
            contract.getId()
        );

        return mapToResponse(contractRepository.save(contract), landlordId);
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
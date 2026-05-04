package iuh.se.kltn.backend.modules.contract.service;

import iuh.se.kltn.backend.modules.contract.dto.request.ChangeRequestDTO;
import iuh.se.kltn.backend.modules.contract.entity.Contract;
import iuh.se.kltn.backend.modules.contract.entity.ContractChangeRequest;
import iuh.se.kltn.backend.modules.contract.enums.ContractSignMethod;
import iuh.se.kltn.backend.modules.contract.enums.ContractStatus;
import iuh.se.kltn.backend.modules.contract.enums.RequestStatus;
import iuh.se.kltn.backend.modules.contract.repository.ContractChangeRequestRepository;
import iuh.se.kltn.backend.modules.contract.repository.ContractRepository;
import iuh.se.kltn.backend.modules.user.entity.User;
import iuh.se.kltn.backend.modules.user.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.util.List;

@Service
@RequiredArgsConstructor
public class ContractChangeService {

    private final ContractChangeRequestRepository requestRepository;
    private final ContractRepository contractRepository;
    // ✅ BỔ SUNG: Khai báo UserRepository để lấy Role
    private final UserRepository userRepository;
    private final iuh.se.kltn.backend.modules.user.service.ReputationService reputationService;
    private final iuh.se.kltn.backend.modules.interaction.service.NotificationService notificationService;

    // 1. Gửi yêu cầu (Dành cho Tenant hoặc Landlord tùy logic)
    @Transactional
    public ContractChangeRequest createChangeRequest(Long contractId, ChangeRequestDTO dto, Long userId) {

        // ✅ BỔ SUNG: Tìm User đang thao tác để biết họ là Chủ trọ hay Khách thuê
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new RuntimeException("Người dùng không tồn tại"));

        Contract contract = contractRepository.findById(contractId)
                .orElseThrow(() -> new RuntimeException("Hợp đồng không tồn tại"));

        // Nếu chỉ cho phép đề xuất khi chưa ký
        if (contract.getStatus() != ContractStatus.PENDING_SIGNATURE && contract.getStatus() != ContractStatus.ACTIVE) {
            throw new RuntimeException("Không thể chỉnh sửa hợp đồng ở trạng thái hiện tại!");
        }

        if (requestRepository.existsByContractIdAndStatus(contractId, RequestStatus.PENDING)) {
            throw new RuntimeException("Đang có một yêu cầu chờ xử lý. Vui lòng đợi phản hồi.");
        }

        ContractChangeRequest req = new ContractChangeRequest();
        req.setContract(contract);
        req.setType(dto.getType());
        req.setNewValue(dto.getNewValue());
        req.setReason(dto.getReason());
        req.setStatus(RequestStatus.PENDING);

        // ✅ THÊM DÒNG NÀY: Lưu lại Role của người tạo yêu cầu (LANDLORD hoặc TENANT)
        req.setRequestedByRole(user.getRole().name());

        // ═══════════════════════════════════════════════════════════════
        // 🛡️ RÀNG BUỘC NGHIỆP VỤ (Business Constraints)
        // ═══════════════════════════════════════════════════════════════
        switch (dto.getType()) {
            case RENT_INCREASE:
                try {
                    double newPrice = Double.parseDouble(dto.getNewValue());
                    if (newPrice <= 0) {
                        throw new RuntimeException("Giá thuê mới phải lớn hơn 0 VNĐ!");
                    }
                } catch (NumberFormatException e) {
                    throw new RuntimeException("Giá thuê mới không hợp lệ (phải là số)!");
                }
                req.setOldValue(contract.getActualPrice() != null ? String.valueOf(contract.getActualPrice()) : "0");
                break;
            case EXTENSION:
                try {
                    LocalDate newEnd = LocalDate.parse(dto.getNewValue());
                    if (contract.getEndDate() != null && !newEnd.isAfter(contract.getEndDate())) {
                        throw new RuntimeException("Ngày gia hạn phải sau ngày kết thúc hiện tại (" + contract.getEndDate() + ")!");
                    }
                    if (contractRepository.existsFutureContract(contract.getRoom().getId(), contract.getEndDate())) {
                        throw new RuntimeException("Bạn không thể gia hạn vì phòng đã được khách khác đặt cọc cho kỳ tiếp theo do quá thời hạn ưu tiên gia hạn.");
                    }
                } catch (java.time.format.DateTimeParseException e) {
                    throw new RuntimeException("Ngày gia hạn không hợp lệ!");
                }
                req.setOldValue(contract.getEndDate() != null ? contract.getEndDate().toString() : "Chưa có ngày kết thúc");
                break;
            case TERMINATION:
                try {
                    LocalDate termDate = LocalDate.parse(dto.getNewValue());
                    if (contract.getStartDate() != null && termDate.isBefore(contract.getStartDate())) {
                        throw new RuntimeException("Ngày chấm dứt không thể trước ngày bắt đầu hợp đồng (" + contract.getStartDate() + ")!");
                    }
                    if (contract.getEndDate() != null && termDate.isAfter(contract.getEndDate())) {
                        throw new RuntimeException("Ngày chấm dứt không thể sau ngày kết thúc hợp đồng (" + contract.getEndDate() + "). Hãy dùng chức năng Gia hạn nếu muốn kéo dài!");
                    }
                } catch (java.time.format.DateTimeParseException e) {
                    throw new RuntimeException("Ngày chấm dứt không hợp lệ!");
                }
                req.setOldValue(contract.getEndDate() != null ? contract.getEndDate().toString() : "Chưa có ngày kết thúc");
                break;
            case CHANGE_TERMS:
                req.setOldValue(contract.getAdditionalTerms() != null ? contract.getAdditionalTerms() : "");
                break;
            case CHANGE_SIGN_METHOD:
                if (contract.getStatus() == ContractStatus.ACTIVE) {
                    throw new RuntimeException("Không thể đổi phương thức ký khi hợp đồng đã có hiệu lực!");
                }
                req.setOldValue(contract.getSignMethod().name());
                break;
            default:
                req.setOldValue("");
        }

        ContractChangeRequest saved = requestRepository.save(req);

        // ✅ THÔNG BÁO CHO BÊN CÒN LẠI
        User notifyUser = "TENANT".equals(user.getRole().name())
                ? contract.getRoom().getProperty().getLandlord() : contract.getTenant();
        notificationService.createNotification(
                notifyUser,
                "Yêu cầu thay đổi hợp đồng",
                user.getFullName() + " đã gửi đề xuất thay đổi cho hợp đồng phòng " + contract.getRoom().getName(),
                iuh.se.kltn.backend.modules.interaction.enums.NotificationType.CONTRACT_UPDATE,
                contract.getId()
        );

        return saved;
    }

    // 2. Lấy danh sách yêu cầu
    public List<ContractChangeRequest> getRequestsByContract(Long contractId) {
        return requestRepository.findByContractIdOrderByRequestDateDesc(contractId);
    }

    // 3. Phê duyệt yêu cầu (Dành cho người nhận yêu cầu)
    @Transactional
    public ContractChangeRequest approveRequest(Long requestId) {
        ContractChangeRequest req = requestRepository.findById(requestId)
                .orElseThrow(() -> new RuntimeException("Yêu cầu không tồn tại"));

        if (req.getStatus() != RequestStatus.PENDING) {
            throw new RuntimeException("Yêu cầu này đã được xử lý!");
        }

        Contract contract = req.getContract();

        try {
            switch (req.getType()) {
                case RENT_INCREASE:
                    contract.setActualPrice(Double.parseDouble(req.getNewValue()));
                    break;
                case EXTENSION:
                    contract.setEndDate(LocalDate.parse(req.getNewValue()));
                    break;
                case TERMINATION:
                    LocalDate proposedDate = LocalDate.parse(req.getNewValue());
                    contract.setEndDate(proposedDate);
                    
                    if (contract.getStatus() == ContractStatus.ACTIVE) {
                        // 💰 Trả phòng sớm → Phạt cọc (Chủ nhà giữ lại tiền cọc)
                        contract.setDepositStatus(iuh.se.kltn.backend.modules.contract.enums.DepositStatus.PENALIZED);
                        
                        // Nếu ngày chấm dứt <= hôm nay -> Hợp đồng hiệu lực chấm dứt, nhả phòng
                        if (!proposedDate.isAfter(LocalDate.now())) {
                            contract.setStatus(ContractStatus.TERMINATED_EARLY);
                            iuh.se.kltn.backend.modules.property.entity.Room room = contract.getRoom();
                            if (room != null && room.getStatus() != iuh.se.kltn.backend.modules.property.enums.RoomStatus.AVAILABLE) {
                                // 🛡️ Kiểm tra Pre-booking trước khi nhả phòng
                                boolean hasOtherLive = contractRepository.existsOtherLiveContract(room.getId(), contract.getId());
                                if (hasOtherLive) {
                                    room.setStatus(iuh.se.kltn.backend.modules.property.enums.RoomStatus.RESERVED);
                                } else {
                                    room.setStatus(iuh.se.kltn.backend.modules.property.enums.RoomStatus.AVAILABLE);
                                }
                            }
                        }

                        // Trừ điểm uy tín bên yêu cầu chấm dứt
                        iuh.se.kltn.backend.modules.user.entity.User violator = "TENANT".equals(req.getRequestedByRole()) 
                                ? contract.getTenant() 
                                : contract.getRoom().getProperty().getLandlord();
                        
                        reputationService.processPoints(violator, iuh.se.kltn.backend.modules.user.enums.ReputationAction.EARLY_TERMINATION, -15, "Hủy hợp đồng trước thời hạn không có lý do chính đáng (#" + contract.getId() + ")");
                        // Nếu ngày chấm dứt ở tương lai -> Chỉ lùi endDate, Scheduler sẽ nhả phòng khi đến hạn.
                    } else if (contract.getStatus() == ContractStatus.PENDING_SIGNATURE) {
                        // 💰 Hủy trước khi ký → Hoàn cọc (nếu đã đặt cọc)
                        contract.setDepositStatus(iuh.se.kltn.backend.modules.contract.enums.DepositStatus.REFUNDED);
                        contract.setStatus(ContractStatus.EXPIRED);
                        iuh.se.kltn.backend.modules.property.entity.Room room = contract.getRoom();
                        if (room != null && room.getStatus() != iuh.se.kltn.backend.modules.property.enums.RoomStatus.AVAILABLE) {
                            // 🛡️ Kiểm tra Pre-booking trước khi nhả phòng
                            boolean hasOtherLive = contractRepository.existsOtherLiveContract(room.getId(), contract.getId());
                            if (hasOtherLive) {
                                room.setStatus(iuh.se.kltn.backend.modules.property.enums.RoomStatus.RESERVED);
                            } else {
                                room.setStatus(iuh.se.kltn.backend.modules.property.enums.RoomStatus.AVAILABLE);
                            }
                        }
                    }
                    break;
                case CHANGE_SIGN_METHOD:
                    contract.setSignMethod(ContractSignMethod.valueOf(req.getNewValue()));
                    contract.setIsTenantSigned(false);
                    contract.setIsLandlordSigned(false);
                    break;
                case CHANGE_TERMS:
                    contract.setAdditionalTerms(req.getNewValue());
                    if (contract.getStatus() == ContractStatus.PENDING_SIGNATURE) {
                        contract.setIsTenantSigned(false);
                        contract.setIsLandlordSigned(false);
                    }
                    break;
                case RENT_INCREASE:
                    contract.setActualPrice(Double.parseDouble(req.getNewValue()));
                    if (contract.getStatus() == ContractStatus.PENDING_SIGNATURE) {
                        contract.setIsTenantSigned(false);
                        contract.setIsLandlordSigned(false);
                    }
                    break;
            }
        } catch (Exception e) {
            throw new RuntimeException("Lỗi định dạng dữ liệu (newValue không hợp lệ cho loại thay đổi này).");
        }

        contractRepository.save(contract);
        req.setStatus(RequestStatus.ACCEPTED);
        ContractChangeRequest saved = requestRepository.save(req);

        // ✅ THÔNG BÁO CHO NGƯỜI YÊU CẦU
        User notifyUser = "TENANT".equals(req.getRequestedByRole()) ? contract.getTenant() : contract.getRoom().getProperty().getLandlord();
        notificationService.createNotification(
                notifyUser,
                "Yêu cầu được chấp nhận",
                "Chủ trọ đã đồng ý với đề xuất của bạn cho hợp đồng phòng " + contract.getRoom().getName(),
                iuh.se.kltn.backend.modules.interaction.enums.NotificationType.CONTRACT_UPDATE,
                contract.getId()
        );

        return saved;
    }

    // 4. Từ chối yêu cầu
    @Transactional
    public ContractChangeRequest rejectRequest(Long requestId) {
        ContractChangeRequest req = requestRepository.findById(requestId)
                .orElseThrow(() -> new RuntimeException("Yêu cầu không tồn tại"));

        if (req.getStatus() != RequestStatus.PENDING) {
            throw new RuntimeException("Yêu cầu này đã được xử lý!");
        }

        req.setStatus(RequestStatus.REJECTED);
        ContractChangeRequest saved = requestRepository.save(req);

        // ✅ THÔNG BÁO CHO NGƯỜI YÊU CẦU
        User notifyUser = "TENANT".equals(req.getRequestedByRole()) ? req.getContract().getTenant() : req.getContract().getRoom().getProperty().getLandlord();
        notificationService.createNotification(
                notifyUser,
                "Yêu cầu bị từ chối",
                "Đề xuất thay đổi của bạn cho hợp đồng phòng " + req.getContract().getRoom().getName() + " không được chấp thuận.",
                iuh.se.kltn.backend.modules.interaction.enums.NotificationType.CONTRACT_UPDATE,
                req.getContract().getId()
        );

        return saved;
    }
}
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

        // Tự động gán giá trị cũ (oldValue) dựa trên loại Enum
        switch (dto.getType()) {
            case RENT_INCREASE:
                req.setOldValue(contract.getActualPrice() != null ? String.valueOf(contract.getActualPrice()) : "0");
                break;
            case EXTENSION:
                req.setOldValue(contract.getEndDate() != null ? contract.getEndDate().toString() : "Chưa có ngày kết thúc");
                break;
            case TERMINATION:
                req.setOldValue(contract.getEndDate() != null ? contract.getEndDate().toString() : "Chưa có ngày kết thúc");
                break;
            case CHANGE_TERMS:
                req.setOldValue(contract.getAdditionalTerms() != null ? contract.getAdditionalTerms() : "");
                break;
            case CHANGE_SIGN_METHOD:
                req.setOldValue(contract.getSignMethod().name());
                break;
            default:
                req.setOldValue("");
        }

        return requestRepository.save(req);
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
                    contract.setEndDate(LocalDate.parse(req.getNewValue()));
                    if (contract.getStatus() == ContractStatus.ACTIVE) {
                        contract.setStatus(ContractStatus.TERMINATED_EARLY);
                    }
                    break;
                case CHANGE_SIGN_METHOD: // ✅ THÊM ĐOẠN NÀY
                    contract.setSignMethod(ContractSignMethod.valueOf(req.getNewValue()));
                    contract.setIsTenantSigned(false);
                    contract.setIsLandlordSigned(false);
                    break;
                case CHANGE_TERMS:
                    contract.setAdditionalTerms(req.getNewValue());
                    break;
            }
        } catch (Exception e) {
            throw new RuntimeException("Lỗi định dạng dữ liệu (newValue không hợp lệ cho loại thay đổi này).");
        }

        contractRepository.save(contract);
        req.setStatus(RequestStatus.ACCEPTED);
        return requestRepository.save(req);
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
        return requestRepository.save(req);
    }
}
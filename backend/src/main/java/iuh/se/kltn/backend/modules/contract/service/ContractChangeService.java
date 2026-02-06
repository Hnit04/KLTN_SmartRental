package iuh.se.kltn.backend.modules.contract.service;

import iuh.se.kltn.backend.modules.contract.entity.Contract;
import iuh.se.kltn.backend.modules.contract.entity.ContractChangeRequest;
import iuh.se.kltn.backend.modules.contract.enums.ContractStatus;
import iuh.se.kltn.backend.modules.contract.enums.RequestStatus;
import iuh.se.kltn.backend.modules.contract.enums.RequestType;
import iuh.se.kltn.backend.modules.contract.repository.ContractChangeRequestRepository; // Tạo repo này nếu chưa có
import iuh.se.kltn.backend.modules.contract.repository.ContractRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class ContractChangeService {

    private final ContractChangeRequestRepository requestRepository;
    private final ContractRepository contractRepository;

    @Transactional
    public void createChangeRequest(Long contractId, String content) {
        Contract contract = contractRepository.findById(contractId)
                .orElseThrow(() -> new RuntimeException("Hợp đồng không tồn tại"));

        if (contract.getStatus() != ContractStatus.PENDING_SIGNATURE) {
            throw new RuntimeException("Chỉ được yêu cầu chỉnh sửa khi hợp đồng chưa ký!");
        }

        ContractChangeRequest req = new ContractChangeRequest();
        req.setContract(contract);
        req.setType(RequestType.CHANGE_TERMS); // Giả sử bạn có enum này
        req.setNewValue(content); // Nội dung muốn sửa
        req.setReason("Người thuê yêu cầu thay đổi điều khoản");
        req.setStatus(RequestStatus.PENDING);

        requestRepository.save(req);
    }
}
package iuh.se.kltn.backend.modules.contract.repository;

import iuh.se.kltn.backend.modules.contract.entity.ResidentRequest;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface ResidentRequestRepository extends JpaRepository<ResidentRequest, Long> {
    List<ResidentRequest> findByContractId(Long contractId);
    List<ResidentRequest> findByInviteeId(Long inviteeId);
    
    // Kiểm tra xem đã có yêu cầu PENDING nào cho người này trong hợp đồng này chưa
    boolean existsByContractIdAndInviteeIdAndStatus(Long contractId, Long inviteeId, iuh.se.kltn.backend.modules.contract.enums.RequestStatus status);

    boolean existsByContractIdAndInviteeIdAndRequestTypeAndStatus(
        Long contractId, Long inviteeId, 
        iuh.se.kltn.backend.modules.contract.enums.ResidentRequestType requestType, 
        iuh.se.kltn.backend.modules.contract.enums.RequestStatus status
    );
}
package iuh.se.kltn.backend.modules.contract.repository;

import iuh.se.kltn.backend.modules.contract.entity.ContractChangeRequest;
import iuh.se.kltn.backend.modules.contract.enums.RequestStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface ContractChangeRequestRepository extends JpaRepository<ContractChangeRequest, Long> {

    List<ContractChangeRequest> findByContractIdOrderByRequestDateDesc(Long contractId);

    List<ContractChangeRequest> findByContractIdAndStatus(Long contractId, RequestStatus status);

    boolean existsByContractIdAndStatus(Long contractId, RequestStatus status);
    
    List<ContractChangeRequest> findByContractIdAndStatusAndType(
            Long contractId, RequestStatus status, 
            iuh.se.kltn.backend.modules.contract.enums.RequestType type);

    List<ContractChangeRequest> findAllByStatusAndExpiryDateBefore(RequestStatus status, java.time.LocalDateTime now);

    List<ContractChangeRequest> findAllByStatusAndReminderSentFalseAndExpiryDateBefore(RequestStatus status, java.time.LocalDateTime threshold);
}
package iuh.se.kltn.backend.modules.contract.repository;

import iuh.se.kltn.backend.modules.contract.entity.ResidentRequest;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface ResidentRequestRepository extends JpaRepository<ResidentRequest, Long> {
    List<ResidentRequest> findByContractId(Long contractId);
}
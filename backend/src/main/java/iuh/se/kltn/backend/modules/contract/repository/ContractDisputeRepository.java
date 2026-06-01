package iuh.se.kltn.backend.modules.contract.repository;

import iuh.se.kltn.backend.modules.contract.entity.ContractDispute;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface ContractDisputeRepository extends JpaRepository<ContractDispute, Long> {
    List<ContractDispute> findByContractIdOrderByCreatedAtDesc(Long contractId);
    Optional<ContractDispute> findByContractIdAndStatus(Long contractId, String status);
}

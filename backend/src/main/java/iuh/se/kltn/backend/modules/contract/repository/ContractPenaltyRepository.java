package iuh.se.kltn.backend.modules.contract.repository;

import iuh.se.kltn.backend.modules.contract.entity.ContractPenalty;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface ContractPenaltyRepository extends JpaRepository<ContractPenalty, Long> {
    List<ContractPenalty> findByContractIdOrderByAppliedAtDesc(Long contractId);
}

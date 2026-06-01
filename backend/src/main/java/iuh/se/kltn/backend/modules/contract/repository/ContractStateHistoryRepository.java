package iuh.se.kltn.backend.modules.contract.repository;

import iuh.se.kltn.backend.modules.contract.entity.ContractStateHistory;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface ContractStateHistoryRepository extends JpaRepository<ContractStateHistory, Long> {
    List<ContractStateHistory> findByContractIdOrderByCreatedAtAsc(Long contractId);
}

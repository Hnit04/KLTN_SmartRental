package iuh.se.kltn.backend.modules.contract.repository;

import iuh.se.kltn.backend.modules.contract.entity.ContractSignature;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface ContractSignatureRepository extends JpaRepository<ContractSignature, Long> {
    Optional<ContractSignature> findByContractIdAndSignerRole(Long contractId, String signerRole);
    List<ContractSignature> findByContractIdOrderByCreatedAtAsc(Long contractId);
    boolean existsByContractIdAndNonce(Long contractId, Long nonce);
}

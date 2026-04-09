package iuh.se.kltn.backend.modules.contract.repository;

import iuh.se.kltn.backend.modules.contract.entity.ContractMember;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface ContractMemberRepository extends JpaRepository<ContractMember, Long> {
    List<ContractMember> findByContractIdAndLeftDateIsNull(Long contractId);
    boolean existsByContractIdAndUserIdAndLeftDateIsNull(Long contractId, Long userId);
    long countByContractIdAndLeftDateIsNull(Long contractId);

    // Giữ lại để truy vết lịch sử nếu cần
    List<ContractMember> findByContractId(Long contractId);
    boolean existsByContractIdAndUserId(Long contractId, Long userId);
}

package iuh.se.kltn.backend.modules.contract.repository;

import iuh.se.kltn.backend.modules.contract.entity.Contract;
import iuh.se.kltn.backend.modules.contract.enums.ContractStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface ContractRepository extends JpaRepository<Contract, Long> {

    List<Contract> findByTenantId(Long tenantId);

    Optional<Contract> findTopByRoomIdOrderByStartDateDesc(Long roomId);

    boolean existsByRoomIdAndStatus(Long roomId, ContractStatus status);
    List<Contract> findByRoom_Property_Landlord_IdAndStatus(Long landlordId, ContractStatus status);
}

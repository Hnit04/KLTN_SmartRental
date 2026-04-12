package iuh.se.kltn.backend.modules.contract.repository;

import iuh.se.kltn.backend.modules.contract.entity.Contract;
import iuh.se.kltn.backend.modules.contract.enums.ContractStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

@Repository
public interface ContractRepository extends JpaRepository<Contract, Long> {

    List<Contract> findByTenantId(Long tenantId);

    Optional<Contract> findTopByRoomIdOrderByStartDateDesc(Long roomId);
    @Query("SELECT c FROM Contract c WHERE c.room.property.landlord.id = :landlordId")
    List<Contract> findContractsByLandlordId(@Param("landlordId") Long landlordId);
    boolean existsByRoomIdAndStatus(Long roomId, ContractStatus status);
    List<Contract> findByRoom_Property_Landlord_IdAndStatus(Long landlordId, ContractStatus status);

    List<Contract> findByStatusAndCreatedAtBefore(ContractStatus status, LocalDateTime time);
    
    // Tìm hợp đồng ACTIVE đã hết hạn
    List<Contract> findByStatusAndEndDateBefore(ContractStatus status, java.time.LocalDate endDate);

    // ✅ Kiểm tra tenant đã có hợp đồng ACTIVE hoặc PENDING_SIGNATURE chưa
    List<Contract> findByTenantIdAndStatusIn(Long tenantId, java.util.Collection<ContractStatus> statuses);

    // ✅ Lấy hợp đồng ACTIVE hiện tại của tenant
    java.util.Optional<Contract> findFirstByTenantIdAndStatus(Long tenantId, ContractStatus status);

    // ✅ Tìm hợp đồng hiện tại (Tenant HOẶC Member)
    @Query("SELECT c FROM Contract c " +
           "LEFT JOIN c.members m " +
           "WHERE (c.tenant.id = :userId OR m.user.id = :userId) " +
           "AND c.status IN :statuses")
    List<Contract> findCurrentContractsByUserId(@Param("userId") Long userId, @Param("statuses") java.util.Collection<ContractStatus> statuses);

    // ✅ Tìm TẤT CẢ hợp đồng từng tham gia (Lịch sử thuê)
    @Query("SELECT DISTINCT c FROM Contract c " +
           "LEFT JOIN c.members m " +
           "WHERE c.tenant.id = :userId OR m.user.id = :userId " +
           "ORDER BY c.startDate DESC")
    List<Contract> findAllRentalHistoryByUserId(@Param("userId") Long userId);

    // ✅ Tìm hợp đồng sắp hết hạn của chủ trọ
    List<Contract> findByRoom_Property_Landlord_IdAndStatusAndEndDateBetween(Long landlordId, ContractStatus status, java.time.LocalDate start, java.time.LocalDate end);
}

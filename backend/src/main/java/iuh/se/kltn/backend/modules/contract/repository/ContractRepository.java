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
    @Query("SELECT c FROM Contract c WHERE c.room.property.landlord.id = :landlordId ORDER BY c.createdAt DESC")
    List<Contract> findContractsByLandlordId(@Param("landlordId") Long landlordId);
    boolean existsByRoomIdAndStatus(Long roomId, ContractStatus status);
    List<Contract> findByRoom_Property_Landlord_IdAndStatus(Long landlordId, ContractStatus status);

    // ✅ Lấy hợp đồng ACTIVE hiện tại của một phòng
    Optional<Contract> findFirstByRoomIdAndStatusOrderByEndDateDesc(Long roomId, ContractStatus status);

    // ✅ Kiểm tra xem phòng có hợp đồng nào trong tương lai không
    @Query("SELECT COUNT(c) > 0 FROM Contract c WHERE c.room.id = :roomId AND c.status IN ('ACTIVE', 'AWAITING_DEPOSIT', 'PENDING_SIGNATURE') AND c.startDate >= :date")
    boolean existsFutureContract(@Param("roomId") Long roomId, @Param("date") LocalDate date);

    // ✅ Kiểm tra phòng còn bất kỳ hợp đồng "sống" nào không (dùng trước khi nhả phòng)
    @Query("SELECT COUNT(c) > 0 FROM Contract c WHERE c.room.id = :roomId AND c.id <> :excludeContractId AND c.status IN ('ACTIVE', 'AWAITING_DEPOSIT', 'PENDING_SIGNATURE')")
    boolean existsOtherLiveContract(@Param("roomId") Long roomId, @Param("excludeContractId") Long excludeContractId);

    // ✅ Lấy hợp đồng ACTIVE hiện tại (startDate <= today), tránh lấy nhầm Pre-booking
    @Query("SELECT c FROM Contract c WHERE c.room.id = :roomId AND c.status = 'ACTIVE' AND c.startDate <= :today ORDER BY c.endDate DESC")
    java.util.Optional<Contract> findCurrentActiveContractByRoomId(@Param("roomId") Long roomId, @Param("today") LocalDate today);

    @Query("SELECT DISTINCT c FROM Contract c " +
           "LEFT JOIN c.bills b " +
           "WHERE c.room.property.landlord.id = :landlordId " +
           "AND (c.status = 'ACTIVE' " +
           "  OR (c.status IN ('EXPIRED', 'TERMINATED_EARLY', 'CANCELLED') " +
           "      AND b.status IN ('UNPAID', 'PENDING', 'LATE'))) " +
           "ORDER BY c.createdAt DESC")
    List<Contract> findBillingContractsByLandlordId(@Param("landlordId") Long landlordId);

    List<Contract> findByStatusAndCreatedAtBefore(ContractStatus status, LocalDateTime time);
    List<Contract> findByStatusAndSignDateBefore(ContractStatus status, LocalDateTime time);
    
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
    List<Contract> findByRoom_Property_Landlord_IdAndStatusAndEndDateBetween(Long landlordId, ContractStatus status, LocalDate start, LocalDate end);

    @Query("SELECT COUNT(DISTINCT c) FROM Contract c " +
           "WHERE c.room.property.landlord.id = :landlordId " +
           "AND c.status NOT IN ('CANCELLED', 'PENDING_SIGNATURE', 'AWAITING_DEPOSIT') " +
           "AND c.startDate <= :endOfMonth " +
           "AND (c.endDate IS NULL OR c.endDate >= :startOfMonth)")
    long countActiveDuringPeriod(@Param("landlordId") Long landlordId, 
                                @Param("startOfMonth") LocalDate startOfMonth, 
                                @Param("endOfMonth") LocalDate endOfMonth);

    // ✅ Lịch sử thuê phòng (tất cả hợp đồng từng ký cho phòng này)
    List<Contract> findByRoomIdOrderByStartDateDesc(Long roomId);

    @Query("SELECT c FROM Contract c WHERE c.signMethod = 'WEB3' AND c.depositStatus = 'PAID' AND c.endDate < :threshold AND c.status IN ('ACTIVE', 'EXPIRED', 'TERMINATED_EARLY')")
    List<Contract> findStalledWeb3Settlements(@Param("threshold") LocalDate threshold);

    @Query("SELECT c FROM Contract c WHERE c.signMethod = 'WEB3' AND c.depositStatus = 'PAID' AND c.endDate < :threshold AND c.settlementReminderSent = false AND c.status IN ('ACTIVE', 'EXPIRED', 'TERMINATED_EARLY')")
    List<Contract> findSettlementRemindersNeeded(@Param("threshold") LocalDate threshold);
}

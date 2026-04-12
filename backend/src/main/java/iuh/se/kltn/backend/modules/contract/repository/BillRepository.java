package iuh.se.kltn.backend.modules.contract.repository;

import iuh.se.kltn.backend.modules.contract.dto.response.MonthlyRevenueResponse;
import iuh.se.kltn.backend.modules.contract.entity.Bill;
import iuh.se.kltn.backend.modules.contract.enums.BillStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.Collection;
import java.util.List;
import java.util.Optional;

@Repository
public interface BillRepository extends JpaRepository<Bill, Long> {
    List<Bill> findByContractId(Long contractId);

    // Tìm các hóa đơn chưa thanh toán của một hợp đồng
    List<Bill> findByContractIdAndStatus(Long contractId, BillStatus status);

    Optional<Bill> findByContractIdAndMonthAndYear(Long contractId, Integer month, Integer year);

    @Query("SELECT COALESCE(SUM(b.totalAmount), 0) " +
           "FROM Bill b " +
           "WHERE b.contract.room.property.landlord.id = :landlordId " +
           "AND b.month = :month " +
           "AND b.year = :year " +
           "AND b.status = :status")
    Double calculateTotalRevenueForMonthAndLandlord(
            @Param("landlordId") Long landlordId,
            @Param("month") int month,
            @Param("year") int year,
            @Param("status") BillStatus status
    );

    @Query("SELECT COALESCE(SUM(b.totalAmount), 0) " +
           "FROM Bill b " +
           "JOIN b.contract c " +
           "JOIN c.room r " +
           "JOIN r.property p " +
           "WHERE p.landlord.id = :landlordId " +
           "AND b.status = 'LATE'")
    Double sumOverdueAmountByLandlord(@Param("landlordId") Long landlordId);

    @Query("SELECT COUNT(b) " +
           "FROM Bill b " +
           "JOIN b.contract c " +
           "JOIN c.room r " +
           "JOIN r.property p " +
           "WHERE p.landlord.id = :landlordId " +
           "AND b.status = 'LATE'")
    Long countOverdueBillsByLandlord(@Param("landlordId") Long landlordId);

    @Query("SELECT new iuh.se.kltn.backend.modules.contract.dto.response.MonthlyRevenueResponse(" +
           "b.year, b.month, COALESCE(SUM(b.totalAmount-b.discountAmount), 0)) " +
           "FROM Bill b " +
           "JOIN b.contract c " +
           "JOIN c.room r " +
           "JOIN r.property p " +
           "WHERE p.landlord.id = :landlordId " +
           "AND ((b.year = :currentYear AND b.month <= :currentMonth) " +
           "OR (b.year = :prevYear AND b.month >= :startMonthLastYear)) " +
           "AND b.status = 'PAID' " +
           "GROUP BY b.year, b.month " +
           "ORDER BY b.year DESC, b.month DESC")
    List<MonthlyRevenueResponse> findRevenueLast6Months(
            @Param("landlordId") Long landlordId,
            @Param("currentYear") int currentYear,
            @Param("currentMonth") int currentMonth,
            @Param("prevYear") int prevYear,
            @Param("startMonthLastYear") int startMonthLastYear
    );

    List<Bill> findAllByContract_Room_Property_Landlord_IdAndYear(Long landlordId, int year);

    List<Bill> findByContractIdInAndStatus(Collection<Long> contractIds, BillStatus status);
}
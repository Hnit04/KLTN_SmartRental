package iuh.se.kltn.backend.modules.contract.repository;

import iuh.se.kltn.backend.modules.contract.entity.Bill;
import iuh.se.kltn.backend.modules.contract.enums.BillStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface BillRepository extends JpaRepository<Bill, Long> {
    List<Bill> findByContractId(Long contractId);

    // Tìm các hóa đơn chưa thanh toán của một hợp đồng
    List<Bill> findByContractIdAndStatus(Long contractId, BillStatus status);
}
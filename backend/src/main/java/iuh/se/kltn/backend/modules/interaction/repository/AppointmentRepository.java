package iuh.se.kltn.backend.modules.interaction.repository;

import iuh.se.kltn.backend.modules.interaction.entity.Appointment;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface AppointmentRepository extends JpaRepository<Appointment, Long> {

    // Tìm tất cả lịch hẹn của một người thuê trọ (Tenant)
    List<Appointment> findByTenantId(Long tenantId);

    // Tìm tất cả lịch hẹn của một chủ trọ (Landlord) để hiển thị thông báo/danh sách quản lý
    List<Appointment> findByLandlordId(Long landlordId);

    // Tìm lịch hẹn theo phòng (Room)
    List<Appointment> findByRoomId(Long roomId);

    // Truy vấn nâng cao: Tìm các lịch hẹn đang chờ xác nhận (PENDING) của một chủ trọ
    @Query("SELECT a FROM Appointment a WHERE a.landlord.id = :landlordId AND a.status = 'PENDING'")
    List<Appointment> findPendingAppointmentsByLandlord(@Param("landlordId") Long landlordId);
}
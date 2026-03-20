package iuh.se.kltn.backend.modules.interaction.repository;

import iuh.se.kltn.backend.modules.interaction.entity.Appointment;
import iuh.se.kltn.backend.modules.interaction.enums.AppointmentStatus;
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
//    @Query("SELECT a FROM Appointment a WHERE a.landlord.id = :landlordId AND a.status = 'PENDING'")
    List<Appointment> findByLandlordIdAndStatus(Long landlordId, AppointmentStatus status);
    @Query("SELECT a FROM Appointment a " +
            "JOIN FETCH a.tenant " +   // Lấy luôn thông tin Tenant
            "JOIN FETCH a.landlord " + // Lấy luôn thông tin Landlord
            "JOIN FETCH a.room " +     // Lấy luôn thông tin Room
            "WHERE a.status = :status " +
            "AND a.reminderSent = :reminderSent " +
            "AND a.meetTime > :now " +
            "AND a.meetTime <= :threshold")
    List<Appointment> findUpcomingAppointments(
            @Param("now") java.time.LocalDateTime now,
            @Param("threshold") java.time.LocalDateTime threshold,
            @Param("status") iuh.se.kltn.backend.modules.interaction.enums.AppointmentStatus status,
            @Param("reminderSent") boolean reminderSent
    );
}
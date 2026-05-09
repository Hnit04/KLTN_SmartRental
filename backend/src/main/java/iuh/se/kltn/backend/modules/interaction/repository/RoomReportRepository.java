package iuh.se.kltn.backend.modules.interaction.repository;

import iuh.se.kltn.backend.modules.interaction.entity.RoomReport;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.LocalDateTime;

public interface RoomReportRepository extends JpaRepository<RoomReport, Long> {
    
    @Query("SELECT COUNT(r) > 0 FROM RoomReport r WHERE r.reporter.id = :reporterId AND r.room.id = :roomId")
    boolean existsByReporterAndRoom(@Param("reporterId") Long reporterId, @Param("roomId") Long roomId);

    @Query("SELECT COUNT(r) FROM RoomReport r WHERE r.reporter.id = :reporterId AND r.createdAt >= :startOfDay")
    long countReportsByUserToday(@Param("reporterId") Long reporterId, @Param("startOfDay") LocalDateTime startOfDay);
}

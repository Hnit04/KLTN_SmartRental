package iuh.se.kltn.backend.modules.interaction.repository;

import iuh.se.kltn.backend.modules.interaction.entity.Notification;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;
import java.util.List;

@Repository
public interface NotificationRepository extends JpaRepository<Notification, Long> {
    // Lấy danh sách thông báo (không phân trang - legacy)
    List<Notification> findByUserIdOrderByCreatedAtDesc(Long userId);

    // Lấy danh sách thông báo có phân trang
    List<Notification> findByUserIdOrderByCreatedAtDesc(Long userId, Pageable pageable);

    // Đếm số thông báo chưa đọc
    long countByUserIdAndIsReadFalse(Long userId);

    // Đánh dấu tất cả là đã đọc
    @Modifying
    @Query("UPDATE Notification n SET n.isRead = true WHERE n.user.id = :userId")
    void markAllAsReadByUserId(Long userId);
}
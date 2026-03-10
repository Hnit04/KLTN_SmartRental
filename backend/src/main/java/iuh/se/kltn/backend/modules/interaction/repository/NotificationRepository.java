package iuh.se.kltn.backend.modules.interaction.repository;

import iuh.se.kltn.backend.modules.interaction.entity.Notification;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;
import java.util.List;

@Repository
public interface NotificationRepository extends JpaRepository<Notification, Long> {
    // Lấy danh sách thông báo của 1 user, sắp xếp mới nhất lên đầu
    List<Notification> findByUserIdOrderByCreatedAtDesc(Long userId);

    // Đếm số thông báo chưa đọc
    long countByUserIdAndIsReadFalse(Long userId);

    // Đánh dấu tất cả là đã đọc
    @Modifying
    @Query("UPDATE Notification n SET n.isRead = true WHERE n.user.id = :userId")
    void markAllAsReadByUserId(Long userId);
}
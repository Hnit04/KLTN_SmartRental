package iuh.se.kltn.backend.modules.interaction.service;

import iuh.se.kltn.backend.modules.interaction.dto.response.NotificationResponse;
import iuh.se.kltn.backend.modules.interaction.entity.Notification;
import iuh.se.kltn.backend.modules.interaction.repository.NotificationRepository;
import iuh.se.kltn.backend.modules.user.entity.User;
import iuh.se.kltn.backend.modules.user.repository.UserRepository;
import jakarta.transaction.Transactional;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class NotificationService {
    private final NotificationRepository notificationRepo;
    private final UserRepository userRepo;

    public List<NotificationResponse> getMyNotifications(String username) {
        User user = userRepo.findByUsername(username)
                .orElseThrow(() -> new RuntimeException("User not found"));

        return notificationRepo.findByUserIdOrderByCreatedAtDesc(user.getId())
                .stream()
                .map(n -> new NotificationResponse(
                        n.getId(), n.getTitle(), n.getMessage(),
                        n.getType(), n.getReferenceId(), n.isRead(), n.getCreatedAt()
                )).collect(Collectors.toList());
    }

    @Transactional
    public void markAsRead(Long id, String username) {
        Notification notification = notificationRepo.findById(id)
                .orElseThrow(() -> new RuntimeException("Notification not found"));

        if (!notification.getUser().getUsername().equals(username)) {
            throw new RuntimeException("Không có quyền truy cập");
        }

        notification.setRead(true);
        notificationRepo.save(notification);
    }

    @Transactional
    public void markAllAsRead(String username) {
        User user = userRepo.findByUsername(username)
                .orElseThrow(() -> new RuntimeException("User not found"));
        notificationRepo.markAllAsReadByUserId(user.getId());
    }
    @Transactional
    public void createNotification(User user, String title, String message, iuh.se.kltn.backend.modules.interaction.enums.NotificationType type, Long referenceId) {
        Notification notification = new Notification();
        notification.setUser(user);
        notification.setTitle(title);
        notification.setMessage(message);
        notification.setType(type);
        notification.setReferenceId(referenceId);
        notification.setRead(false);

        notificationRepo.save(notification);
    }
}
package iuh.se.kltn.backend.modules.user.service;

import iuh.se.kltn.backend.modules.user.entity.User;
import iuh.se.kltn.backend.modules.user.repository.UserRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;

@Component
public class UserLockTask {

    @Autowired
    private UserRepository userRepository;

    @Scheduled(fixedRate = 60000)
    @net.javacrumbs.shedlock.spring.annotation.SchedulerLock(name = "auto_unlock_users", lockAtMostFor = "1m", lockAtLeastFor = "50s")
    @Transactional
    public void autoUnlockUsers() {
        LocalDateTime now = LocalDateTime.now();
        
        // Tìm các user đang bị khóa và đã quá hạn lockUntil
        List<User> expiredLockedUsers = userRepository
            .findByIsLockedTrueAndLockUntilBefore(now);

        if (!expiredLockedUsers.isEmpty()) {
            for (User user : expiredLockedUsers) {
                user.setIsLocked(false);
                user.setLockUntil(null);
                user.setLockReason(null);
                // System.out.println("Auto unlocked user: " + user.getUsername());
                userRepository.save(user);
            }

        }
    }
}
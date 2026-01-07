package iuh.se.kltn.backend.modules.user.service;

import iuh.se.kltn.backend.common.exception.ResourceNotFoundException; // Sử dụng lại Exception của bạn
import iuh.se.kltn.backend.modules.user.entity.RefreshToken;
import iuh.se.kltn.backend.modules.user.entity.User;
import iuh.se.kltn.backend.modules.user.repository.RefreshTokenRepository;
import iuh.se.kltn.backend.modules.user.repository.UserRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.Optional;
import java.util.UUID;

@Service
public class RefreshTokenService {
    @Value("${jwt.refreshExpiration}")
    private Long refreshTokenDurationMs;

    @Autowired
    private RefreshTokenRepository refreshTokenRepository;

    @Autowired
    private UserRepository userRepository;

    public Optional<RefreshToken> findByToken(String token) {
        return refreshTokenRepository.findByToken(token);
    }

    @Transactional // Quan trọng: Đảm bảo xóa cũ -> tạo mới thành công cả 2 hoặc rollback
    public RefreshToken createRefreshToken(Long userId) {
        // Tìm User an toàn, ném lỗi nếu không thấy thay vì dùng .get() gây NullPointer
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new ResourceNotFoundException("User", "id", userId));

        // Xóa token cũ của user này (nếu logic là 1 thiết bị login 1 lần)
        refreshTokenRepository.deleteByUser(user);

        // Tạo token mới
        RefreshToken refreshToken = new RefreshToken();
        refreshToken.setUser(user);
        refreshToken.setExpiryDate(Instant.now().plusMillis(refreshTokenDurationMs));
        refreshToken.setToken(UUID.randomUUID().toString());

        return refreshTokenRepository.save(refreshToken);
    }

    public RefreshToken verifyExpiration(RefreshToken token) {
        if (token.getExpiryDate().compareTo(Instant.now()) < 0) {
            refreshTokenRepository.delete(token);
            throw new RuntimeException("Refresh token đã hết hạn. Vui lòng đăng nhập lại!");
        }
        return token;
    }

    @Transactional
    public int deleteByUserId(Long userId) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new ResourceNotFoundException("User", "id", userId));
        return refreshTokenRepository.deleteByUser(user);
    }
}
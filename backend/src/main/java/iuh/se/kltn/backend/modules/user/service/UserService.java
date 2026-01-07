package iuh.se.kltn.backend.modules.user.service;

import iuh.se.kltn.backend.common.exception.ResourceNotFoundException;
import iuh.se.kltn.backend.modules.user.dto.response.UserProfileResponse;
import iuh.se.kltn.backend.modules.user.entity.User;
import iuh.se.kltn.backend.modules.user.repository.UserRepository;
import org.modelmapper.ModelMapper;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

@Service
public class UserService {

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private ModelMapper modelMapper;

    // Lấy thông tin user hiện tại (Dựa vào ID trong Token)
    public UserProfileResponse getUserProfile(Long userId) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new ResourceNotFoundException("User", "id", userId));

        // Convert từ Entity sang DTO để giấu pass
        return modelMapper.map(user, UserProfileResponse.class);
    }

    // Cập nhật ví MetaMask
    public void updateWalletAddress(Long userId, String walletAddress) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new ResourceNotFoundException("User", "id", userId));

        // Kiểm tra xem ví này có ai dùng chưa
        if (userRepository.existsByWalletAddress(walletAddress)) {
            throw new RuntimeException("Ví này đã được liên kết với tài khoản khác!");
        }

        user.setWalletAddress(walletAddress);
        userRepository.save(user);
    }
}
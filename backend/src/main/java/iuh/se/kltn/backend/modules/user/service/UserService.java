package iuh.se.kltn.backend.modules.user.service;

import iuh.se.kltn.backend.common.exception.ResourceNotFoundException;
import iuh.se.kltn.backend.modules.user.dto.request.UpdateProfileRequest;
import iuh.se.kltn.backend.modules.user.dto.response.UserProfileResponse;
import iuh.se.kltn.backend.modules.user.entity.Landlord;
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

    public UserProfileResponse getUserProfile(Long userId) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new ResourceNotFoundException("User", "id", userId));
        UserProfileResponse response = modelMapper.map(user, UserProfileResponse.class);
        if (user instanceof Landlord) {
            response.setBusinessLicenseUrl(((Landlord) user).getBusinessLicenseUrl());
        }
        return response;
    }
    public UserProfileResponse updateUserProfile(Long userId, UpdateProfileRequest request) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new ResourceNotFoundException("User", "id", userId));
        if (request.getFullName() != null) user.setFullName(request.getFullName());
        if (request.getPhoneNumber() != null) user.setPhoneNumber(request.getPhoneNumber());
        if (request.getCccdNumber() != null) user.setCccdNumber(request.getCccdNumber());
        if (request.getZaloPhone() != null) user.setZaloPhone(request.getZaloPhone());
        if (request.getCurrentAddress() != null) user.setCurrentAddress(request.getCurrentAddress());
        if (request.getDateOfBirth() != null) user.setDateOfBirth(request.getDateOfBirth());

        User updatedUser = userRepository.save(user);
        return modelMapper.map(updatedUser, UserProfileResponse.class);
    }
    public void updateWalletAddress(Long userId, String walletAddress) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new ResourceNotFoundException("User", "id", userId));
        userRepository.findByWalletAddress(walletAddress).ifPresent(existingUser -> {
            if (!existingUser.getId().equals(userId)) {
                throw new RuntimeException("Ví này đã được liên kết với tài khoản khác!");
            }
        });

        user.setWalletAddress(walletAddress);
        userRepository.save(user);
    }
    public void updateAvatar(Long userId, String avatarUrl) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new RuntimeException("User not found"));

        user.setAvatarUrl(avatarUrl);
        userRepository.save(user);
    }
}
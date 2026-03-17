package iuh.se.kltn.backend.modules.user.service;

import iuh.se.kltn.backend.common.enums.Role;
import iuh.se.kltn.backend.common.exception.ResourceNotFoundException;
import iuh.se.kltn.backend.modules.user.dto.request.UpdateProfileRequest;
import iuh.se.kltn.backend.modules.user.dto.response.UserProfileResponse;
import iuh.se.kltn.backend.modules.user.entity.Landlord;
import iuh.se.kltn.backend.modules.user.entity.User;
import iuh.se.kltn.backend.modules.user.enums.KYCStatus;
import iuh.se.kltn.backend.modules.user.repository.UserRepository;
import org.modelmapper.ModelMapper;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.util.List;

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

        if (hasText(request.getFullName())) user.setFullName(request.getFullName());

        if (hasText(request.getPhoneNumber())) user.setPhoneNumber(request.getPhoneNumber());

        if (hasText(request.getZaloPhone())) user.setZaloPhone(request.getZaloPhone());

        if (hasText(request.getCurrentAddress())) user.setCurrentAddress(request.getCurrentAddress());

        if (request.getDateOfBirth() != null) user.setDateOfBirth(request.getDateOfBirth());

        if (hasText(request.getCccdNumber())) {
            boolean isVerified = user.getKycStatus() != null && user.getKycStatus() == KYCStatus.VERIFIED;
            if (!isVerified) {
                user.setCccdNumber(request.getCccdNumber());
            }
        }

        User updatedUser = userRepository.save(user);
        return modelMapper.map(updatedUser, UserProfileResponse.class);
    }

    private boolean hasText(String str) {
        return str != null && !str.trim().isEmpty();
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

    public void submitKYC(Long userId, String cccdNumber, String frontUrl, String backUrl, boolean isAutoVerified) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new RuntimeException("User not found"));

        user.setCccdNumber(cccdNumber);
        user.setCccdFrontUrl(frontUrl);
        user.setCccdBackUrl(backUrl);

        if (isAutoVerified) {
            user.setKycStatus(KYCStatus.VERIFIED);
            user.setReputationScore(user.getReputationScore() + 20);
        } else {
            user.setKycStatus(KYCStatus.PENDING);
        }
        userRepository.save(user);
    }

    public List<UserProfileResponse> getAllByRole(Role role) {
        List<User> users = userRepository.findAllByRole(role);
        return users.stream()
                .map(user -> modelMapper.map(user, UserProfileResponse.class))
                .toList();
    }
}
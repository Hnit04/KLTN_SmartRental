package iuh.se.kltn.backend.modules.user.service;

import iuh.se.kltn.backend.common.enums.Role;
import iuh.se.kltn.backend.common.exception.ResourceNotFoundException;
import iuh.se.kltn.backend.common.service.CloudinaryService;
import iuh.se.kltn.backend.modules.user.dto.request.UpdateProfileRequest;
import iuh.se.kltn.backend.modules.user.dto.response.UserProfileResponse;
import iuh.se.kltn.backend.modules.user.entity.Landlord;
import iuh.se.kltn.backend.modules.user.entity.User;
import iuh.se.kltn.backend.modules.user.enums.KYCStatus;
import iuh.se.kltn.backend.modules.user.repository.UserRepository;
import jakarta.persistence.EntityManager;
import jakarta.persistence.PersistenceContext;
import org.springframework.transaction.annotation.Transactional;
import org.modelmapper.ModelMapper;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.data.domain.PageRequest;

import java.time.LocalDateTime;
import java.util.List;

@Service
public class UserService {

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private ReputationService reputationService;

    @Autowired
    private ModelMapper modelMapper;

    @PersistenceContext
    private EntityManager entityManager;



    public UserProfileResponse getUserProfile(Long userId) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new ResourceNotFoundException("User", "id", userId));
        UserProfileResponse response = modelMapper.map(user, UserProfileResponse.class);

        if (user instanceof Landlord) {
            response.setBusinessLicenseUrl(((Landlord) user).getBusinessLicenseUrl());
        }
        return response;
    }

    public UserProfileResponse findByUsername(String username){
        User user= userRepository.findByUsername(username)
                .orElseThrow(()-> new ResourceNotFoundException("User","id", username));
        return modelMapper.map(user, UserProfileResponse.class);
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
            boolean canEditCccd = user.getKycStatus() == KYCStatus.NONE || user.getKycStatus() == KYCStatus.REJECTED;
            if (canEditCccd) {
                user.setCccdNumber(request.getCccdNumber());
            }
        }

        // 💰 Thông tin ngân hàng
        if (hasText(request.getBankName())) user.setBankName(request.getBankName());
        if (hasText(request.getBankAccountNumber())) user.setBankAccountNumber(request.getBankAccountNumber());
        if (hasText(request.getBankAccountHolder())) user.setBankAccountHolder(request.getBankAccountHolder());
        if (hasText(request.getBankQrUrl())) user.setBankQrUrl(request.getBankQrUrl());

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
        
        reputationService.processPoints(user, iuh.se.kltn.backend.modules.user.enums.ReputationAction.WALLET_LINKED, 5, "Liên kết ví Blockchain hợp lệ");
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
        
        // Luôn tăng số lượt thử nếu có gọi logic OCR
        // (Trong Controller đã check canUseOCR nên ở đây chỉ cần tăng nếu có tham số là auto)
        user.setKycAttempts(user.getKycAttempts() + 1);

        if (isAutoVerified) {
            user.setKycStatus(KYCStatus.VERIFIED);
            userRepository.save(user); 
            reputationService.processPoints(user, iuh.se.kltn.backend.modules.user.enums.ReputationAction.EKYC_VERIFIED, 10, "Hoàn thành xác thực danh tính điện tử (eKYC)");
        } else {
            user.setKycStatus(KYCStatus.PENDING);
            userRepository.save(user);
        }
    }

    public List<UserProfileResponse> getAllByRole(Role role) {
        List<User> users = userRepository.findAllByRole(role);
        return users.stream()
                .map(user -> modelMapper.map(user, UserProfileResponse.class))
                .toList();
    }

    public List<UserProfileResponse> getTopLandlords(int limit) {
        List<User> topLandlords = userRepository.findTopUsersByRole(Role.LANDLORD, PageRequest.of(0, limit));
        return topLandlords.stream()
                .map(user -> modelMapper.map(user, UserProfileResponse.class))
                .toList();
    }

    @Transactional
    public void unlockUser(Long userId) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new ResourceNotFoundException("User", "id", userId));

        user.setIsLocked(false);
        user.setLockUntil(null);
        user.setLockReason(null);
        userRepository.saveAndFlush(user);
    }

    @Transactional
    public void lockUserTemporary(Long userId, int durationDays, List<String> reason) {
        User user = userRepository.findById(userId).orElseThrow();
        user.setIsLocked(true);
        user.setLockedAt(LocalDateTime.now());
        user.setLockUntil(LocalDateTime.now().plusDays(durationDays));
        user.setLockReason(reason);
        userRepository.saveAndFlush(user);
    }

    @Autowired
    private CloudinaryService cloudinaryService;

    public List<UserProfileResponse> getPendingKYCUsers() {
        return userRepository.findByKycStatus(KYCStatus.PENDING).stream()
                .map(user -> {
                    UserProfileResponse resp = modelMapper.map(user, UserProfileResponse.class);
                    if (user.getCccdFrontUrl() != null) {
                        resp.setCccdFrontUrl(cloudinaryService.generateSignedUrl(cloudinaryService.extractPublicId(user.getCccdFrontUrl())));
                    }
                    if (user.getCccdBackUrl() != null) {
                        resp.setCccdBackUrl(cloudinaryService.generateSignedUrl(cloudinaryService.extractPublicId(user.getCccdBackUrl())));
                    }
                    return resp;
                })
                .toList();
    }

    @Transactional
    public void verifyKYCAdmin(Long userId, String cccdNumber) throws Exception {
        User user = userRepository.findById(userId).orElseThrow();
        String front = user.getCccdFrontUrl();
        String back = user.getCccdBackUrl();

        if (cccdNumber != null && !cccdNumber.isEmpty()) {
            user.setCccdNumber(cccdNumber);
        }

        user.setKycStatus(KYCStatus.VERIFIED);
        user.setCccdFrontUrl(null);
        user.setCccdBackUrl(null);
        userRepository.save(user);

        cloudinaryService.deleteImage(front);
        cloudinaryService.deleteImage(back);
        reputationService.processPoints(user, iuh.se.kltn.backend.modules.user.enums.ReputationAction.EKYC_VERIFIED, 10, "Admin đã phê duyệt định danh thủ công");
    }

    @Transactional
    public void rejectKYCAdmin(Long userId, String reason) throws Exception {
        User user = userRepository.findById(userId).orElseThrow();
        String front = user.getCccdFrontUrl();
        String back = user.getCccdBackUrl();

        user.setKycStatus(KYCStatus.REJECTED);
        user.setKycNote(reason);
        user.setCccdFrontUrl(null);
        user.setCccdBackUrl(null);
        userRepository.save(user);

        cloudinaryService.deleteImage(front);
        cloudinaryService.deleteImage(back);
    }
}
package iuh.se.kltn.backend.modules.user.controller;

import iuh.se.kltn.backend.common.enums.Role;
import iuh.se.kltn.backend.common.security.UserPrincipal;
import iuh.se.kltn.backend.common.service.OcrService;
import iuh.se.kltn.backend.modules.user.dto.request.UpdateProfileRequest;
import iuh.se.kltn.backend.modules.user.dto.response.UserProfileResponse;
import iuh.se.kltn.backend.modules.user.service.UserService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;
import iuh.se.kltn.backend.common.service.CloudinaryService;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.util.List;

@RestController
@RequestMapping("/api/users")
public class UserController {

    @Autowired
    private UserService userService;

    @Autowired
    private CloudinaryService cloudinaryService;

    @Autowired
    private OcrService ocrService;

    @GetMapping("/me")
    public ResponseEntity<UserProfileResponse> getCurrentUser(@AuthenticationPrincipal UserPrincipal currentUser) {
        UserProfileResponse userProfile = userService.getUserProfile(currentUser.getId());
        return ResponseEntity.ok(userProfile);
    }

    @PutMapping("/profile")
    public ResponseEntity<UserProfileResponse> updateProfile(
            @AuthenticationPrincipal UserPrincipal currentUser,
            @RequestBody UpdateProfileRequest request) {

        UserProfileResponse response = userService.updateUserProfile(currentUser.getId(), request);
        return ResponseEntity.ok(response);
    }

    @PutMapping("/wallet")
    public ResponseEntity<?> updateWallet(@AuthenticationPrincipal UserPrincipal currentUser,
                                          @RequestParam String address) {
        userService.updateWalletAddress(currentUser.getId(), address);
        return ResponseEntity.ok("Cập nhật ví thành công!");
    }

    @PostMapping(value = "/avatar", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<?> uploadAvatar(
            @AuthenticationPrincipal UserPrincipal currentUser,
            @RequestParam("file") MultipartFile file) {

        try {
            if (file.isEmpty()) {
                return ResponseEntity.badRequest().body("File không được để trống");
            }

            // ✅ SỬA LỖI TẠI ĐÂY: Dùng hàm uploadAvatar đã định nghĩa trong CloudinaryService
            String avatarUrl = cloudinaryService.uploadAvatar(file);

            userService.updateAvatar(currentUser.getId(), avatarUrl);

            return ResponseEntity.ok(avatarUrl);

        } catch (IOException e) {
            return ResponseEntity.internalServerError().body("Lỗi upload ảnh: " + e.getMessage());
        }
    }

    @PostMapping(value = "/kyc", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<?> submitKYC(
            @AuthenticationPrincipal UserPrincipal currentUser,
            @RequestParam("cccdNumber") String cccdNumber,
            @RequestParam("frontImage") MultipartFile frontImage,
            @RequestParam("backImage") MultipartFile backImage) {

        try {
            System.out.println("Đang gửi ảnh sang FPT.AI...");
            String extractedId = ocrService.extractIdNumber(frontImage);
            System.out.println("AI đọc được: " + extractedId);
            System.out.println("User nhập: " + cccdNumber);

            boolean isAutoVerified = false;
            if (extractedId != null && extractedId.equals(cccdNumber)) {
                isAutoVerified = true;
            }

            // ✅ SỬA LỖI TẠI ĐÂY: Truyền thêm tham số folderName ("smart-rental/kyc")
            String frontUrl = cloudinaryService.uploadImage(frontImage, "smart-rental/kyc");
            String backUrl = cloudinaryService.uploadImage(backImage, "smart-rental/kyc");

            userService.submitKYC(currentUser.getId(), cccdNumber, frontUrl, backUrl, isAutoVerified);

            if (isAutoVerified) {
                return ResponseEntity.ok("Xác thực danh tính thành công! (Duyệt tự động)");
            } else {
                return ResponseEntity.ok("Hồ sơ đã gửi. Hệ thống đang chờ Admin duyệt thủ công (Do ảnh mờ hoặc không khớp).");
            }

        } catch (Exception e) {
            return ResponseEntity.internalServerError().body("Lỗi xử lý: " + e.getMessage());
        }
    }

    @GetMapping("/by-role")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<List<UserProfileResponse>> getUsersByRole(
            @RequestParam Role role,
            @AuthenticationPrincipal UserPrincipal currentUser) {
        List<UserProfileResponse> users = userService.getAllByRole(role);
        return ResponseEntity.ok(users);
    }
}
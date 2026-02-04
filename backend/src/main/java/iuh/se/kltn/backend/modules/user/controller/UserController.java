package iuh.se.kltn.backend.modules.user.controller;

import iuh.se.kltn.backend.common.security.UserPrincipal;
import iuh.se.kltn.backend.modules.user.dto.request.UpdateProfileRequest;
import iuh.se.kltn.backend.modules.user.dto.response.UserProfileResponse;
import iuh.se.kltn.backend.modules.user.service.UserService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;
import iuh.se.kltn.backend.common.service.CloudinaryService;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;

@RestController
@RequestMapping("/api/users")
public class UserController {

    @Autowired
    private UserService userService;

    @Autowired
    private CloudinaryService cloudinaryService;

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

            // 1. Upload lên Cloudinary
            String avatarUrl = cloudinaryService.uploadImage(file);

            // 2. Lưu URL vào Database (Bạn cần thêm hàm updateAvatar trong UserService)
            userService.updateAvatar(currentUser.getId(), avatarUrl);

            // 3. Trả về URL cho Frontend hiển thị ngay
            return ResponseEntity.ok(avatarUrl);

        } catch (IOException e) {
            return ResponseEntity.internalServerError().body("Lỗi upload ảnh: " + e.getMessage());
        }
    }
}
package iuh.se.kltn.backend.modules.user.controller;

import iuh.se.kltn.backend.common.security.UserPrincipal;
import iuh.se.kltn.backend.modules.user.dto.response.UserProfileResponse;
import iuh.se.kltn.backend.modules.user.service.UserService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/users")
public class UserController {

    @Autowired
    private UserService userService;

    @GetMapping("/me")
    public ResponseEntity<UserProfileResponse> getCurrentUser(@AuthenticationPrincipal UserPrincipal currentUser) {
        UserProfileResponse userProfile = userService.getUserProfile(currentUser.getId());
        return ResponseEntity.ok(userProfile);
    }

    @PutMapping("/wallet")
    public ResponseEntity<?> updateWallet(@AuthenticationPrincipal UserPrincipal currentUser,
                                          @RequestParam String address) {
        userService.updateWalletAddress(currentUser.getId(), address);
        return ResponseEntity.ok("Cập nhật ví thành công!");
    }
}
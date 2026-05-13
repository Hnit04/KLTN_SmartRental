package iuh.se.kltn.backend.modules.user.controller;

import iuh.se.kltn.backend.common.security.UserPrincipal;
import iuh.se.kltn.backend.modules.user.dto.request.*;
import iuh.se.kltn.backend.modules.user.dto.response.LoginResponseGoogle;
import iuh.se.kltn.backend.modules.user.entity.User;
import iuh.se.kltn.backend.modules.user.service.AuthService;
import jakarta.validation.Valid;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.Map;

@RestController
@RequestMapping("/api/auth")
@Validated
public class AuthController {

    @Autowired
    private AuthService authService;

    @PostMapping("/register")
    public ResponseEntity<?> register(@Valid @RequestBody UserRegisterRequest request) {
        try {
            User user = authService.register(request);

            Map<String, Object> response = new HashMap<>();
            response.put("status", "PENDING_VERIFICATION");
            response.put("message", "Ma xac thuc da duoc gui den " + user.getEmail());
            response.put("email", user.getEmail());

            return ResponseEntity.status(HttpStatus.CREATED).body(response);
        } catch (RuntimeException e) {
            return ResponseEntity.status(HttpStatus.CONFLICT).body(e.getMessage());
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body("Loi he thong: " + e.getMessage());
        }
    }

    @GetMapping("/verify-otp")
    public ResponseEntity<?> verifyOtp(
            @RequestParam("email") @NotBlank @Email String email,
            @RequestParam("code") @NotBlank @Size(min = 6, max = 6) String code) {
        try {
            String message = authService.verifyOtp(email, code);

            String htmlResponse = "<html><body style='text-align:center;font-family:Arial;padding-top:50px;'>" +
                    "<h2 style='color:#4CAF50;'>Xac thuc thanh cong!</h2>" +
                    "<p>" + message + "</p>" +
                    "<a href='http://localhost:5173/login' style='color:#2196F3;'>Di toi trang dang nhap</a>" +
                    "</body></html>";

            return ResponseEntity.ok().contentType(MediaType.valueOf("text/html;charset=UTF-8")).body(htmlResponse);
        } catch (RuntimeException e) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body("Loi xac thuc: " + e.getMessage());
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body("Loi he thong.");
        }
    }

    @PostMapping("/resend-otp")
    public ResponseEntity<?> resendOtp(@Valid @RequestBody EmailOnlyRequest request) {
        String email = request.getEmail();
        try {
            authService.resendOtp(email);
            return ResponseEntity.ok("Ma xac thuc moi da duoc gui den " + email);
        } catch (RuntimeException e) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(e.getMessage());
        }
    }

    @PostMapping("/forgot-password")
    public ResponseEntity<?> forgotPassword(@Valid @RequestBody EmailOnlyRequest request) {
        String email = request.getEmail();
        try {
            authService.initiateForgotPassword(email);
            return ResponseEntity.ok("Ma khoi phuc da duoc gui den email cua ban.");
        } catch (RuntimeException e) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(e.getMessage());
        }
    }

    @PostMapping("/reset-password")
    public ResponseEntity<?> resetPassword(@Valid @RequestBody ResetPasswordRequest request) {
        try {
            authService.resetPassword(request.getEmail(), request.getCode(), request.getNewPassword());
            return ResponseEntity.ok("Doi mat khau thanh cong!");
        } catch (RuntimeException e) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(e.getMessage());
        }
    }

    @PostMapping("/login")
    public ResponseEntity<?> login(@Valid @RequestBody LoginRequest request) {
        try {
            if (request.getPassword() == null) {
                return ResponseEntity.ok(authService.loginWithGoogle(request.getUsername()));
            }
            return ResponseEntity.ok(authService.login(request));
        } catch (Exception e) {
            return ResponseEntity.status(401).body("Sai thong tin dang nhap: " + e.getMessage());
        }
    }

    @PostMapping("/refresh-token")
    public ResponseEntity<?> refreshToken(@Valid @RequestBody TokenRefreshRequest request) {
        try {
            return ResponseEntity.ok(authService.refreshToken(request));
        } catch (Exception e) {
            return ResponseEntity.status(403).body("Loi lam moi token: " + e.getMessage());
        }
    }

    @PostMapping("/google")
    public ResponseEntity<?> googleLogin(@Valid @RequestBody GoogleLoginRequest request) {
        try {
            LoginResponseGoogle response = authService.googleLogin(request);
            return ResponseEntity.ok(response);
        } catch (RuntimeException e) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(Map.of("error", e.getMessage()));
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(Map.of("error", "Loi he thong khi xac thuc Google: " + e.getMessage()));
        }
    }

    @PostMapping("/change-password")
    public ResponseEntity<?> changePassword(
            @Valid @RequestBody ChangePasswordRequest request,
            @AuthenticationPrincipal UserPrincipal userPrincipal) {

        try {
            if (userPrincipal == null) {
                return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                        .body("Vui long dang nhap de thuc hien thao tac nay!");
            }

            authService.changePassword(
                    userPrincipal.getId(),
                    request.getOldPassword(),
                    request.getNewPassword(),
                    request.getConfirmNewPassword()
            );

            return ResponseEntity.ok("Doi mat khau thanh cong!");

        } catch (RuntimeException e) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(e.getMessage());
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body("Loi he thong: " + e.getMessage());
        }
    }
}

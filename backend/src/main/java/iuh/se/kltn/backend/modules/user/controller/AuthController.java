package iuh.se.kltn.backend.modules.user.controller;

import iuh.se.kltn.backend.modules.user.dto.request.LoginRequest;
import iuh.se.kltn.backend.modules.user.dto.request.TokenRefreshRequest;
import iuh.se.kltn.backend.modules.user.dto.request.UserRegisterRequest;
import iuh.se.kltn.backend.modules.user.dto.request.VerifyOtpRequest;
import iuh.se.kltn.backend.modules.user.entity.User;
import iuh.se.kltn.backend.modules.user.service.AuthService;
import iuh.se.kltn.backend.modules.user.service.EmailService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.Map;

@RestController
@RequestMapping("/api/auth")
public class AuthController {

    @Autowired
    private AuthService authService;

    @Autowired
    private EmailService emailService;

    // API Đăng ký
    @PostMapping("/register")
    public ResponseEntity<?> register(@RequestBody UserRegisterRequest request) {
        try {
            User user = authService.register(request);

            Map<String, Object> response = new HashMap<>();
            response.put("status", "PENDING_VERIFICATION");
            response.put("message", "Mã xác thực đã được gửi đến " + user.getEmail());
            response.put("email", user.getEmail());

            return ResponseEntity.status(HttpStatus.CREATED).body(response);
        } catch (RuntimeException e) {
            return ResponseEntity.status(HttpStatus.CONFLICT).body(e.getMessage());
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body("Lỗi hệ thống: " + e.getMessage());
        }
    }
    // Sửa lại đoạn này trong AuthController.java
    @GetMapping("/verify-otp") // Đổi sang GetMapping để click được từ trình duyệt
    public ResponseEntity<?> verifyOtp(@RequestParam("email") String email, @RequestParam("code") String code) {
        try {
            // Gọi service với 2 tham số String trực tiếp
            String message = authService.verifyOtp(email, code);

            // Trả về HTML để trình duyệt hiển thị thông báo đẹp thay vì trả về JSON
            String htmlResponse = "<html><body style='text-align:center;font-family:Arial;padding-top:50px;'>" +
                    "<h2 style='color:#4CAF50;'>Xác thực thành công!</h2>" +
                    "<p>" + message + "</p>" +
                    "<a href='http://localhost:5173/login' style='color:#2196F3;'>Đi tới trang đăng nhập</a>" +
                    "</body></html>";

            return ResponseEntity.ok().contentType(MediaType.valueOf("text/html;charset=UTF-8")).body(htmlResponse);
        } catch (RuntimeException e) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body("Lỗi xác thực: " + e.getMessage());
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body("Lỗi hệ thống.");
        }
    }
    @PostMapping("/resend-otp")
    public ResponseEntity<?> resendOtp(@RequestBody Map<String, String> body) {
        String email = body.get("email");
        try {
            authService.resendOtp(email);
            return ResponseEntity.ok("Mã xác thực mới đã được gửi đến " + email);
        } catch (RuntimeException e) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(e.getMessage());
        }
    }


    // API Đăng nhập
    @PostMapping("/login")
    public ResponseEntity<?> login(@RequestBody LoginRequest request) {
        try {
            return ResponseEntity.ok(authService.login(request));
        } catch (Exception e) {
            return ResponseEntity.status(401).body("Sai thông tin đăng nhập: " + e.getMessage());
        }
    }
    @PostMapping("/refresh-token")
    public ResponseEntity<?> refreshToken(@RequestBody TokenRefreshRequest request) {
        try {
            return ResponseEntity.ok(authService.refreshToken(request));
        } catch (Exception e) {
            return ResponseEntity.status(403).body("Lỗi làm mới token: " + e.getMessage());
        }
    }
}
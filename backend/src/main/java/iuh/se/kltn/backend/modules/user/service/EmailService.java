package iuh.se.kltn.backend.modules.user.service;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.*;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;
import java.util.*;
@Service
public class EmailService {

    @Value("${brevo.api.key}")
    private String apiKey;

    @Value("${brevo.sender.email}")
    private String senderEmail;


    public void sendVerificationCode(String toEmail, String code) {
        RestTemplate restTemplate = new RestTemplate();
        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_JSON);
        headers.set("api-key", apiKey.trim());

        // Tạo link xác thực
        String verifyLink = "http://localhost:8080/api/auth/verify-otp?email=" + toEmail + "&code=" + code;
        Map<String, Object> body = new HashMap<>();
        body.put("sender", Map.of("name", "SmartRental", "email", senderEmail));
        body.put("to", List.of(Map.of("email", toEmail)));
        body.put("subject", "Xác thực tài khoản SmartRental");

        // Nội dung HTML có nút bấm (Button)
        String htmlContent =
                "<html>" +
                        "<body style='font-family: Arial, sans-serif; background-color: #f4f6f8; padding: 20px;'>" +

                        "<div style='max-width: 500px; margin: auto; background: white; padding: 24px; border-radius: 10px; text-align: center;'>" +

                        "<h2 style='color: #333;'>Chào mừng đến với SmartRental 🎉</h2>" +

                        "<p style='color: #555;'>Cảm ơn bạn đã đăng ký tài khoản.</p>" +

                        "<p style='color: #555;'>Bạn có thể xác thực bằng 2 cách:</p>" +

                        // ===== BUTTON VERIFY =====
                        "<a href='" + verifyLink + "' style='" +
                        "background-color: #4CAF50; color: white; padding: 12px 24px; " +
                        "text-decoration: none; border-radius: 6px; display: inline-block; " +
                        "font-weight: bold; margin: 16px 0;'>Xác thực tài khoản</a>" +

                        "<p style='color: #888;'>Hoặc nhập mã OTP bên dưới:</p>" +

                        // ===== OTP CODE =====
                        "<div style='font-size: 28px; letter-spacing: 6px; font-weight: bold; color: #4CAF50; margin: 16px 0;'>" +  code +
                        "</div>" +

                        "<p style='color: #999;'>Mã OTP có hiệu lực trong 5 phút.</p>" +

                        // ===== FALLBACK LINK =====
                        "<p style='font-size: 12px; color: #aaa; margin-top: 20px;'>Nếu nút không hoạt động, hãy copy link:</p>" +
                        "<p style='word-break: break-all; font-size: 12px; color: #555;'>" +
                        verifyLink +
                        "</p>" +

                        "</div>" +
                        "</body>" +
                        "</html>";

        body.put("htmlContent", htmlContent);

        HttpEntity<Map<String, Object>> entity = new HttpEntity<>(body, headers);

        try {
            String BREVO_API_URL = "https://api.brevo.com/v3/smtp/email";
            restTemplate.postForEntity(BREVO_API_URL, entity, String.class);
        } catch (Exception e) {
            System.err.println("LỖI GỬI MAIL: " + e.getMessage());
            throw new RuntimeException("Không thể gửi email xác thực.");
        }
    }
}
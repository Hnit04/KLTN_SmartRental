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

    public void sendForgotPasswordEmail(String toEmail, String code) {
        RestTemplate restTemplate = new RestTemplate();
        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_JSON);
        headers.set("api-key", apiKey.trim());

        // Link trỏ về trang đổi mật khẩu trên Frontend (React/Vite)
        // Lưu ý: Đổi port 5173 thành port bạn đang chạy Frontend nếu khác
        String resetLink = "http://localhost:5173/reset-password?email=" + toEmail + "&code=" + code;

        Map<String, Object> body = new HashMap<>();
        body.put("sender", Map.of("name", "SmartRental", "email", senderEmail));
        body.put("to", List.of(Map.of("email", toEmail)));
        body.put("subject", "[SmartRental] Khôi phục mật khẩu của bạn");

        // Nội dung HTML chuyên nghiệp
        String htmlContent =
                "<html>" +
                        "<head><meta charset='UTF-8'></head>" +
                        "<body style='font-family: Arial, sans-serif; line-height: 1.6; color: #333;'>" +
                        "  <div style='max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #ddd; border-radius: 10px;'>" +
                        "    <h2 style='color: #2563eb; text-align: center;'>Khôi phục mật khẩu</h2>" +
                        "    <p>Chào bạn,</p>" +
                        "    <p>Chúng tôi nhận được yêu cầu đặt lại mật khẩu cho tài khoản liên kết với email này. Vui lòng sử dụng mã xác thực dưới đây:</p>" +
                        "    <div style='text-align: center; margin: 30px 0;'>" +
                        "      <span style='font-size: 32px; font-weight: bold; letter-spacing: 5px; color: #1e293b; background: #f1f5f9; padding: 10px 20px; border-radius: 5px; border: 1px dashed #cbd5e1;'>" +
                        code +
                        "      </span>" +
                        "    </div>" +
                        "    <p>Hoặc bạn có thể nhấn trực tiếp vào nút bên dưới để tiến hành đổi mật khẩu mới:</p>" +
                        "    <div style='text-align: center; margin: 30px 0;'>" +
                        "      <a href='" + resetLink + "' style='background-color: #2563eb; color: white; padding: 15px 25px; text-decoration: none; border-radius: 5px; font-weight: bold; display: inline-block;'>Đổi mật khẩu ngay</a>" +
                        "    </div>" +
                        "    <p style='font-size: 13px; color: #64748b;'>Link này và mã xác thực sẽ hết hạn sau 10 phút.</p>" +
                        "    <hr style='border: 0; border-top: 1px solid #eee; margin: 20px 0;'>" +
                        "    <p style='font-size: 12px; color: #94a3b8; text-align: center;'>Nếu bạn không yêu cầu thay đổi này, vui lòng bỏ qua email này hoặc liên hệ hỗ trợ.</p>" +
                        "  </div>" +
                        "</body>" +
                        "</html>";

        body.put("htmlContent", htmlContent);

        HttpEntity<Map<String, Object>> entity = new HttpEntity<>(body, headers);

        try {
            String BREVO_API_URL = "https://api.brevo.com/v3/smtp/email";
            restTemplate.postForEntity(BREVO_API_URL, entity, String.class);
            System.out.println("Gửi mail reset password thành công tới: " + toEmail);
        } catch (Exception e) {
            System.err.println("LỖI GỬI MAIL RESET PASSWORD: " + e.getMessage());
            throw new RuntimeException("Không thể gửi email khôi phục mật khẩu. Vui lòng thử lại sau.");
        }
    }
}
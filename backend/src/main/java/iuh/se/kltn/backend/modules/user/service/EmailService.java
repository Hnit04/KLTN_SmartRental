package iuh.se.kltn.backend.modules.user.service;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.*;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;

import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
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
    public void sendSecurityAlert(String toEmail) {
        RestTemplate restTemplate = new RestTemplate();
        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_JSON);
        headers.set("api-key", apiKey.trim());


        String resetLink = "http://localhost:5173/reset-password?email=" + toEmail;

        Map<String, Object> body = new HashMap<>();
        body.put("sender", Map.of("name", "SmartRental", "email", senderEmail));
        body.put("to", List.of(Map.of("email", toEmail)));
        body.put("subject", "[SmartRental] Khôi phục mật khẩu của bạn");

        String htmlContent =
                "<html>" +
                        "<body style='font-family: Arial, sans-serif; background-color: #f9fafb; padding: 20px;'>" +
                        "<div style='max-width: 550px; margin: auto; background: white; padding: 30px; border-radius: 12px; border: 1px solid #e5e7eb;'>" +
                        "<h2 style='color: #1f2937; text-align: center;'>Thông báo bảo mật 🛡️</h2>" +

                        "<p style='color: #4b5563; line-height: 1.6;'>" +
                        "Chào bạn, hệ thống ghi nhận bạn vừa đăng nhập vào <b>SmartRental</b> bằng Tên đăng nhập là: "+ toEmail+" mật khẩu mặc định (1111)." +
                        "</p>" +

                        "<div style='background-color: #fffbeb; border-left: 4px solid #f59e0b; padding: 15px; margin: 20px 0;'>" +
                        "<p style='color: #92400e; margin: 0; font-size: 14px;'>" +
                        "<b>Lưu ý:</b> Để đảm bảo an toàn cho tài khoản và các giao dịch thuê phòng, bạn vui lòng thay đổi mật khẩu ngay lập tức." +
                        "</p>" +
                        "</div>" +

                        "<div style='text-align: center; margin: 30px 0;'>" +
                        "<a href='" + resetLink + "' style='" +
                        "background-color: #2563eb; color: white; padding: 14px 28px; " +
                        "text-decoration: none; border-radius: 8px; display: inline-block; " +
                        "font-weight: bold; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.1);'>" +
                        "Cập nhật mật khẩu ngay</a>" +
                        "</div>" +

                        "<hr style='border: 0; border-top: 1px solid #f3f4f6; margin: 20px 0;'>" +

                        "<p style='font-size: 12px; color: #9ca3af; text-align: center;'>" +
                        "Nếu bạn không thực hiện đăng nhập này, vui lòng liên hệ hỗ trợ kỹ thuật.<br>" +
                        "© 2026 SmartRental Team." +
                        "</p>" +
                        "</div>" +
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
    public void sendAppointmentReminder(String toEmail, String name, String room, String time, String partner) {
        Map<String, Object> body = new HashMap<>();
        body.put("sender", Map.of("name", "SmartRental", "email", senderEmail));
        body.put("to", List.of(Map.of("email", toEmail)));
        body.put("subject", "[SmartRental] Nhắc nhở lịch hẹn sắp tới");
        LocalDateTime dateTime = LocalDateTime.parse(time);
        DateTimeFormatter displayFormatter = DateTimeFormatter.ofPattern("HH:mm - EEEE, dd/MM/yyyy", Locale.of("vi", "VN"));
        String formattedTime = dateTime.format(displayFormatter);

        String html = String.format(
                """
                <div style="font-family: Arial, sans-serif; background-color: #f4f6f8; padding: 20px;">
                    <div style="max-width: 600px; margin: auto; background: #ffffff; border-radius: 10px; padding: 20px; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">
                        <h2 style="color: #2c7be5; text-align: center;"> Nhắc nhở lịch hẹn</h2>
                        <p style="font-size: 16px; color: #333;">
                            Chào <b>%s</b>,
                        </p>
                        <p style="font-size: 15px; color: #555;">
                            Bạn có một lịch xem phòng sắp diễn ra với thông tin chi tiết như sau:
                        </p>
                        <div style="background: #f1f5ff; padding: 15px; border-radius: 8px; margin: 15px 0;">
                            <p style="margin: 5px 0;"><b>Phòng:</b> %s</p>
                            <p style="margin: 5px 0;"><b>Thời gian:</b> %s</p>
                            <p style="margin: 5px 0;"><b>Người gặp:</b> %s</p>
                        </div>
                        <p style="font-size: 15px; color: #555;">
                            Vui lòng sắp xếp thời gian để có mặt đúng giờ.
                        </p>

                        <p style="margin-top: 25px; font-size: 13px; color: #999; text-align: center;">
                            Đây là email tự động, vui lòng không trả lời.
                        </p>
                    </div>
                </div>
                """,
                name, room, formattedTime, partner
        );
        body.put("htmlContent", html);

        HttpEntity<Map<String, Object>> entity = new HttpEntity<>(body, createHeaders());
        new RestTemplate().postForEntity("https://api.brevo.com/v3/smtp/email", entity, String.class);
    }

    public void sendReputationAlert(String toEmail, String name, String type, String points, String reason, int total) {
        Map<String, Object> body = new HashMap<>();
        body.put("sender", Map.of("name", "SmartRental", "email", senderEmail));
        body.put("to", List.of(Map.of("email", toEmail)));
        body.put("subject", "[SmartRental] Thông báo thay đổi điểm uy tín");

        String color = type.equals("cộng") ? "#10b981" : "#ef4444";
        String icon = type.equals("cộng") ? "⭐" : "⚠️";

        String html = String.format(
                """
                <div style="font-family: Arial, sans-serif; padding: 20px; background: #f8fafc;">
                    <div style="max-width: 500px; margin: auto; background: white; border-radius: 12px; padding: 30px; box-shadow: 0 4px 12px rgba(0,0,0,0.05); border: 1px solid #e2e8f0;">
                        <div style="text-align: center; font-size: 40px;">%s</div>
                        <h2 style="color: #1e293b; text-align: center; margin-top: 10px;">Điểm uy tín thay đổi</h2>
                        <p>Chào <b>%s</b>,</p>
                        <p>Hệ thống vừa thực hiện %s điểm uy tín của bạn:</p>
                        <div style="background: #f1f5f9; padding: 20px; border-radius: 8px; text-align: center; margin: 20px 0;">
                            <span style="font-size: 24px; font-weight: bold; color: %s;">%s %s điểm</span>
                            <br/>
                            <span style="color: #64748b; font-size: 14px;">Lý do: %s</span>
                        </div>
                        <p style="text-align: center; font-weight: bold; color: #1e293b;">
                            Tổng điểm hiện tại: <span style="font-size: 20px;">%d/100</span>
                        </p>
                        <hr style="border: 0; border-top: 1px solid #e2e8f0; margin: 25px 0;">
                        <p style="font-size: 12px; color: #94a3b8; text-align: center;">
                            Điểm uy tín cao giúp bạn dễ dàng thuê phòng và nhận được nhiều ưu đãi hơn. 
                            Hãy duy trì phản hồi nhanh và tuân thủ các cam kết hợp đồng.
                        </p>
                    </div>
                </div>
                """,
                icon, name, type, color, type.equals("cộng") ? "+" : "-", points, reason, total
        );
        body.put("htmlContent", html);
        try {
            HttpEntity<Map<String, Object>> entity = new HttpEntity<>(body, createHeaders());
            new RestTemplate().postForEntity("https://api.brevo.com/v3/smtp/email", entity, String.class);
        } catch (Exception e) {
            System.err.println("Lỗi gửi mail uy tín: " + e.getMessage());
        }
    }

    public void sendContractChangeRequestAlert(String toEmail, String name, String partnerName, String roomName, String type, String expiry) {
        Map<String, Object> body = new HashMap<>();
        body.put("sender", Map.of("name", "SmartRental", "email", senderEmail));
        body.put("to", List.of(Map.of("email", toEmail)));
        body.put("subject", "[SmartRental] Đề xuất chỉnh sửa hợp đồng mới");

        String html = String.format(
                """
                <div style="font-family: Arial, sans-serif; padding: 20px; background: #f8fafc;">
                    <div style="max-width: 550px; margin: auto; background: white; border-radius: 12px; padding: 30px; box-shadow: 0 4px 12px rgba(0,0,0,0.05); border: 1px solid #e2e8f0;">
                        <h2 style="color: #2563eb; margin-bottom: 20px;">📝 Đề xuất mới</h2>
                        <p>Chào <b>%s</b>,</p>
                        <p>Bạn vừa nhận được một đề xuất <b>%s</b> cho hợp đồng phòng <b>%s</b> từ <b>%s</b>.</p>
                        
                        <div style="background: #fffbeb; border-left: 4px solid #f59e0b; padding: 15px; margin: 20px 0;">
                            <p style="color: #92400e; margin: 0;">
                                <b>Thời hạn phản hồi:</b> Trước %s
                            </p>
                            <p style="font-size: 13px; color: #b45309; margin-top: 5px;">
                                Lưu ý: Nếu quá thời hạn này mà không phản hồi, đề xuất sẽ tự động bị hủy và bạn có thể bị trừ điểm uy tín.
                            </p>
                        </div>

                        <div style="text-align: center; margin: 30px 0;">
                            <a href="http://localhost:5173/dashboard/contracts" style="background: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 8px; font-weight: bold;">Xem và Phản hồi ngay</a>
                        </div>

                        <p style="font-size: 13px; color: #64748b;">
                            Cảm ơn bạn đã sử dụng SmartRental.
                        </p>
                    </div>
                </div>
                """,
                name, type, roomName, partnerName, expiry
        );
        body.put("htmlContent", html);
        try {
            HttpEntity<Map<String, Object>> entity = new HttpEntity<>(body, createHeaders());
            new RestTemplate().postForEntity("https://api.brevo.com/v3/smtp/email", entity, String.class);
        } catch (Exception e) {
            System.err.println("Lỗi gửi mail đề xuất: " + e.getMessage());
        }
    }
    
    public void sendSettlementReminder(String toEmail, String name, String roomName, String tenantName, String deadline) {
        Map<String, Object> body = new HashMap<>();
        body.put("sender", Map.of("name", "SmartRental", "email", senderEmail));
        body.put("to", List.of(Map.of("email", toEmail)));
        body.put("subject", "[SmartRental] Nhắc nhở quyết toán hợp đồng sắp hết hạn");

        String html = String.format(
                """
                <div style="font-family: Arial, sans-serif; padding: 20px; background: #fffcf0;">
                    <div style="max-width: 550px; margin: auto; background: white; border-radius: 12px; padding: 30px; box-shadow: 0 4px 12px rgba(0,0,0,0.05); border: 1px solid #fef3c7;">
                        <h2 style="color: #d97706; margin-bottom: 20px;">⚠️ Nhắc nhở quyết toán</h2>
                        <p>Chào <b>%s</b>,</p>
                        <p>Hợp đồng phòng <b>%s</b> với khách <b>%s</b> đã kết thúc được một thời gian nhưng hệ thống chưa ghi nhận thao tác quyết toán cọc từ bạn.</p>
                        
                        <div style="background: #fffbeb; border-left: 4px solid #f59e0b; padding: 15px; margin: 20px 0;">
                            <p style="color: #92400e; margin: 0;">
                                <b>Hạn chót tự động hoàn cọc:</b> %s
                            </p>
                            <p style="font-size: 13px; color: #b45309; margin-top: 5px;">
                                <b>Lưu ý:</b> Nếu bạn không thực hiện quyết toán trước thời hạn này, hệ thống sẽ <b>tự động hoàn 100%% cọc</b> cho khách thuê và bạn sẽ bị <b>trừ 20 điểm uy tín</b>.
                            </p>
                        </div>

                        <div style="text-align: center; margin: 30px 0;">
                            <a href="http://localhost:5173/dashboard/contracts" style="background: #d97706; color: white; padding: 12px 24px; text-decoration: none; border-radius: 8px; font-weight: bold;">Quyết toán ngay</a>
                        </div>

                        <p style="font-size: 13px; color: #64748b;">
                            Vui lòng kiểm tra lại các hóa đơn và đề xuất khấu trừ (nếu có) để đảm bảo quyền lợi của mình.
                        </p>
                    </div>
                </div>
                """,
                name, roomName, tenantName, deadline
        );
        body.put("htmlContent", html);
        try {
            HttpEntity<Map<String, Object>> entity = new HttpEntity<>(body, createHeaders());
            new RestTemplate().postForEntity("https://api.brevo.com/v3/smtp/email", entity, String.class);
        } catch (Exception e) {
            System.err.println("Lỗi gửi mail nhắc nhở quyết toán: " + e.getMessage());
        }
    }

    private HttpHeaders createHeaders() {
        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_JSON);
        headers.set("api-key", apiKey.trim());
        return headers;
    }
}
package iuh.se.kltn.backend.modules.ai.service;

import dev.langchain4j.model.chat.ChatLanguageModel;
import dev.langchain4j.data.message.AiMessage;
import dev.langchain4j.data.message.ImageContent;
import dev.langchain4j.data.message.TextContent;
import dev.langchain4j.data.message.UserMessage;
import dev.langchain4j.model.output.Response;
import iuh.se.kltn.backend.modules.ai.dto.ModerationResult;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import com.fasterxml.jackson.databind.ObjectMapper;
import java.util.List;
import java.util.ArrayList;

@Service
public class ModerationService {

    @Autowired
    private ChatLanguageModel geminiChatModel;

    @Autowired
    private ObjectMapper objectMapper;

    /**
     * Kiểm tra nội dung văn bản có an toàn không và chấm điểm an toàn (0-100).
     * 
     * @param type "Khu trọ" hoặc "Phòng trọ"
     * @param text Nội dung cần kiểm tra
     * @param imageUrls Danh sách URL ảnh (nếu có)
     * @return ModerationResult chứa kết quả kiểm tra và điểm số
     */
    public ModerationResult checkContent(String type, String text, List<String> imageUrls) {
        if (text == null || text.trim().isEmpty()) {
            return new ModerationResult(true, 100, "Nội dung trống");
        }

        String tieuChiDiemCao = type.equals("Khu trọ") 
                ? "- Mô tả rõ ràng về toàn nhà, tiện ích chung, địa chỉ. LƯU Ý: ĐÂY LÀ KHU TRỌ NÊN KHÔNG BẮT BUỘC CÓ GIÁ THUÊ PHÒNG (Tuyệt đối không trừ điểm nếu thiếu thông tin giá thuê phòng)." 
                : "- Mô tả rõ ràng về phòng, diện tích, giá thuê cụ thể. "
                + "LƯU Ý QUAN TRỌNG: "
                + "(1) Chi phí phụ (điện, nước, internet) được quản lý ở cấp KHU TRỌ chứ KHÔNG PHẢI ở phòng → TUYỆT ĐỐI KHÔNG trừ điểm nếu phòng thiếu thông tin chi phí phụ. "
                + "(2) Quy trình liên hệ/xem phòng do HỆ THỐNG APP xử lý (đặt lịch hẹn online) → KHÔNG trừ điểm nếu thiếu thông tin liên hệ hay quy trình xem phòng.";

        String prompt = String.format(
                "Bạn là chuyên gia kiểm duyệt nội dung cho mạng xã hội bất động sản. " +
                        "Nhiệm vụ: Đánh giá xem nội dung sau có hữu ích cho người tìm phòng trọ hay không. " +
                        "Các trường hợp tính điểm thấp (score < 50, isSafe = false):\n" +
                        "1. Nội dung bậy bạ, rác (ví dụ: 'asdasd', '123123', gõ phím vô nghĩa).\n" +
                        "2. Nội dung không liên quan đến thuê phòng (ví dụ: quảng cáo game, tin tức chính trị).\n" +
                        "3. Chửi thề, xúc phạm, lừa đảo, số điện thoại ảo.\n\n" +
                        "Các trường hợp điểm cao (score >= 80, isSafe = true):\n" +
                        "%s\n\n" +
                        "Yêu cầu trả về JSON duy nhất: {\"isSafe\": boolean, \"score\": int, \"reason\": \"string\"}. " +
                        "Chỉ trả về JSON. Không giải thích thêm. Ở mục reason, hãy ghi rõ nếu phát hiện lỗi từ chữ hoặc từ ảnh.\n\n" +
                        "Loại bài đăng: %s\n" +
                        "Nội dung cần kiểm duyệt: \"%s\"",
                tieuChiDiemCao, type, text);

        try {
            System.out.println("--- AI MODERATION DEBUG ---");
            System.out.println("PROMPT: " + prompt);
            
            UserMessage userMessage;
            if (imageUrls != null && !imageUrls.isEmpty()) {
                System.out.println("CHECKING " + imageUrls.size() + " IMAGES...");
                List<dev.langchain4j.data.message.Content> contents = new ArrayList<>();
                contents.add(TextContent.from(prompt));
                for (String url : imageUrls) {
                    // Giới hạn số lượng ảnh
                    if (contents.size() > 4) break; 
                    try {
                        contents.add(ImageContent.from(url));
                    } catch (Exception e) {
                        System.err.println("Invalid image URL: " + url);
                    }
                }
                userMessage = UserMessage.from(contents);
            } else {
                userMessage = UserMessage.from(prompt);
            }

            Response<AiMessage> aiResponse = geminiChatModel.generate(userMessage);
            String response = aiResponse.content().text();
            
            System.out.println("RESPONSE: " + response);
            System.out.println("---------------------------");

            // Tìm block JSON trong trường hợp AI trả về text thừa
            int start = response.indexOf("{");
            int end = response.lastIndexOf("}");

            if (start != -1 && end != -1 && end > start) {
                String potentialJson = response.substring(start, end + 1);
                return objectMapper.readValue(potentialJson, ModerationResult.class);
            }

            // Fallback: xóa backticks nếu không tìm thấy {} hợp lệ
            String cleaned = response.replaceAll("```json|```", "").trim();
            return objectMapper.readValue(cleaned, ModerationResult.class);
        } catch (Exception e) {
            System.err.println("Lỗi gọi Moderation AI: " + e.getMessage());
            // Dự phòng nếu AI lỗi
            return new ModerationResult(true, 50, "Không thể phân tích bằng AI, cần Admin kiểm tra lại");
        }
    }

    /**
     * Hàm Overload cũ (không truyền type -> Gán mặc định là Phòng trọ)
     */
    public ModerationResult checkContent(String text) {
        return checkContent("Phòng trọ", text, null);
    }
    
    public ModerationResult checkContent(String type, String text) {
        return checkContent(type, text, null);
    }

    /**
     * Hàm cũ để tương thích ngược (nếu cần)
     */
    public boolean isSafe(String text) {
        return checkContent(text).isSafe();
    }
}

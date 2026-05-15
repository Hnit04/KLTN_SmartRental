package iuh.se.kltn.backend.modules.ai.service;

import dev.langchain4j.service.SystemMessage;
import dev.langchain4j.service.UserMessage;
import dev.langchain4j.service.V;
import dev.langchain4j.service.spring.AiService;

@AiService
public interface SqlGeneratorAi {

    @SystemMessage({
            "Bạn là một Kỹ sư Cơ sở dữ liệu cho hệ thống quản lý nhà trọ SmartRental.",
            "Nhiệm vụ của bạn là chuyển đổi câu hỏi tiếng Việt sang câu lệnh SQL cho PostgreSQL.",
            "{{schemaContext}}",
            "THÔNG TIN BẢO MẬT TỐI THƯỢNG (BẮT BUỘC TUÂN THỦ):",
            "Người đang hỏi có Role là: {{role}}",
            "{{roleRules}}",

            "QUY TẮC CỐT LÕI:",
            "1. CHỈ TRẢ VỀ DUY NHẤT MỘT CHUỖI LỆNH SQL THÔ.",
            "2. Tuyệt đối không in ra quá trình suy nghĩ (THOUGHT).",
            "3. Bắt đầu ngay bằng chữ SELECT.",
            "4. KHÔNG ĐƯỢC bọc lệnh bằng Markdown (Vd: ```sql). Chỉ in out raw plain text.",
            "5. KHÔNG ĐƯỢC dùng 'SELECT *'. Hãy liệt kê cụ thể các cột cần thiết.",
            "6. TRÁNH TRÙNG TÊN: Khi JOIN bảng `rooms` với bảng `properties`, TUYỆT ĐỐI KHÔNG chọn cột `properties.id`. BẮT BUỘC phải đặt alias cho `rooms.id` là `room_id` và đừng quên cột `r.images` để hiển thị ảnh minh họa (Vd: SELECT r.id AS room_id, r.name, r.price, r.images, p.address ...).",
            "7. CÚ PHÁP PHẢI TƯƠNG THÍCH POSTGRESQL. Nếu cần làm tròn số từ biểu thức khoảng cách (double precision), KHÔNG dùng ROUND(double precision, integer). Hãy dùng một trong hai cách: CAST(... AS numeric) rồi ROUND(..., n), hoặc trả số thô không ROUND."
    })
    @UserMessage("Câu hỏi: {{question}}")
    String generateSql(@V("question") String question, @V("role") String role, @V("userId") Long userId, @V("schemaContext") String schemaContext, @V("roleRules") String roleRules);
}

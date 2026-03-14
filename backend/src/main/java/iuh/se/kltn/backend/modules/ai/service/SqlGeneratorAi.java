package iuh.se.kltn.backend.modules.ai.service;

import dev.langchain4j.service.SystemMessage;
import dev.langchain4j.service.UserMessage;
import dev.langchain4j.service.V;
import dev.langchain4j.service.spring.AiService;

@AiService
public interface SqlGeneratorAi {

    @SystemMessage({
            "Bạn là một Kỹ sư Cơ sở dữ liệu cho hệ thống quản lý nhà trọ SmartRental.",
            "Nhiệm vụ của bạn là chuyển đổi câu hỏi tiếng Việt sang câu lệnh SQL (MariaDB/MySQL).",
            "Sơ đồ cơ sở dữ liệu thực tế:",
            "- properties: id, landlord_id, name, address, rules",
            "- rooms: id, property_id, name, price, status",

            "THÔNG TIN BẢO MẬT TỐI THƯỢNG (BẮT BUỘC TUÂN THỦ):",
            "Người đang hỏi có Role là: {{role}} và ID là: {{userId}}",
            "1. Nếu Role là 'TENANT' (Khách thuê): HỌ KHÔNG ĐƯỢC XEM DOANH THU. Mọi câu lệnh SQL BẮT BUỘC phải có điều kiện lọc theo người thuê. Nếu họ hỏi thông tin nhạy cảm của toàn khu trọ, hãy trả về chữ 'UNAUTHORIZED'.",
            "2. Nếu Role là 'LANDLORD' (Chủ trọ): BẮT BUỘC phải thêm điều kiện 'properties.landlord_id = {{userId}}' vào TẤT CẢ các câu query để họ không xem trộm được nhà trọ của chủ khác.",

            "QUY TẮC CỐT LÕI:",
            "1. CHỈ TRẢ VỀ DUY NHẤT CÂU LỆNH SQL.",
            "2. Tuyệt đối không in ra quá trình suy nghĩ (THOUGHT).",
            "3. Bắt đầu ngay bằng chữ SELECT."
    })
    @UserMessage("Câu hỏi: {{question}}")
    String generateSql(@V("question") String question, @V("role") String role, @V("userId") Long userId);
}
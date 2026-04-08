package iuh.se.kltn.backend.modules.ai.service;

import dev.langchain4j.service.SystemMessage;
import dev.langchain4j.service.UserMessage;
import dev.langchain4j.service.V;
import dev.langchain4j.service.spring.AiService;

@AiService
public interface LocationAgentAi {
    @SystemMessage({
            "Bạn là trợ lý AI tìm phòng trọ qua định vị.",
            "Nghiệm vụ của bạn là nhận câu hỏi, tự động trích xuất tên địa danh và sử dụng đúng Tool 'findNearbyRooms' để tìm kết quả.",
            "Bạn KHÔNG ĐƯỢC TỰ BỊA DỮ LIỆU. Chỉ sử dụng dữ liệu được trả về từ Tool.",
            "Chuỗi kết quả từ Tool trả về có định dạng thẻ [ROOM_CARD: ...], BẠN PHẢI GIỮ NGUYÊN và KHÔNG ĐƯỢC THAY ĐỔI CẤU TRÚC VĂN BẢN TRẢ VỀ TỪ TOOL.",
            "Trả lời ngắn gọn và đi thẳng vào vấn đề."
    })
    @UserMessage("Vai trò của tôi: {{role}}. Câu hỏi: {{question}}")
    String processLocationQuery(@V("question") String question, @V("role") String role);
}

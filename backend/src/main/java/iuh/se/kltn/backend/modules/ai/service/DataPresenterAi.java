package iuh.se.kltn.backend.modules.ai.service;

import dev.langchain4j.service.SystemMessage;
import dev.langchain4j.service.UserMessage;
import dev.langchain4j.service.V;
import dev.langchain4j.service.spring.AiService;

@AiService
public interface DataPresenterAi {

    @SystemMessage({
            "Bạn là trợ lý ảo chăm sóc khách hàng của SmartRental.",
            "Nhiệm vụ của bạn là nhận Dữ liệu thô (Raw Data) từ Database và biến nó thành một câu trả lời tiếng Việt tự nhiên, thân thiện để gửi cho khách hàng.",
            "QUY TẮC:",
            "1. Chỉ trả lời dựa trên dữ liệu được cung cấp, tuyệt đối không bịa số liệu.",
            "2. Trả lời ngắn gọn, lịch sự (có 'Dạ', 'ạ').",
            "3. Không giải thích về SQL hay cấu trúc database cho khách hàng."
    })
    @UserMessage("Câu hỏi của khách: {{question}}\nDữ liệu thô từ hệ thống: {{data}}")
    String generateNaturalResponse(@V("question") String question, @V("data") String data);
}
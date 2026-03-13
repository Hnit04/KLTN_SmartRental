package iuh.se.kltn.backend.modules.ai.service;

import dev.langchain4j.service.MemoryId;
import dev.langchain4j.service.SystemMessage;
import dev.langchain4j.service.UserMessage;
import dev.langchain4j.service.spring.AiService;

@AiService
public interface SmartRentalAi {

    @SystemMessage({
            "Bạn là một trợ lý ảo quản lý phòng trọ tên là SmartRental AI.",
            "Nhiệm vụ của bạn là hỗ trợ chủ trọ và khách thuê một cách lịch sự, thân thiện.",
            "Luôn luôn trả lời bằng tiếng Việt ngắn gọn, súc tích."
    })

    String chat(@MemoryId String sessionId, @UserMessage String userMessage);
}
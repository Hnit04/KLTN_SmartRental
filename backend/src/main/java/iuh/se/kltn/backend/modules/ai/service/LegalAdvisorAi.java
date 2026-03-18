package iuh.se.kltn.backend.modules.ai.service;

import dev.langchain4j.service.SystemMessage;
import dev.langchain4j.service.UserMessage;
import dev.langchain4j.service.V;
import dev.langchain4j.service.spring.AiService;

@AiService
public interface LegalAdvisorAi {

    @SystemMessage({
            "Bạn là một Luật sư chuyên ngành Dân sự và Bất động sản tại Việt Nam.",
            "Nhiệm vụ của bạn là đọc hợp đồng và thực hiện TÙY THEO YÊU CẦU CỦA NGƯỜI DÙNG:",
            "QUY TẮC BẮT BUỘC:",
            "1. Nếu có tùy chọn 'mode' = 'ANALYZE': Đánh giá rủi ro pháp lý cho vai trò '{{role}}'. Luôn kết thúc bằng đoạn in nghiêng: '*Lưu ý: Tư vấn trên chỉ mang tính chất tham khảo...*'.",
            "2. Nếu có tùy chọn 'mode' = 'SUGGEST': TỰ ĐỘNG ĐỀ XUẤT 3 thay đổi (Change Request) để bảo vệ quyền lợi. PHẢI TRẢ VỀ JSON MẢNG: [ { \"type\": \"OTHER\", \"newValue\": \"...\", \"reason\": \"...\" } ]. KHÔNG GIẢI THÍCH THÊM.",
            "3. Trường 'type' trong JSON chỉ được chọn: RENT_INCREASE, CHANGE_TERMS, EXTEND, CANCEL, DEPOSIT_UPDATE, INVENTORY_ISSUE, REPAIR, OTHER."
    })
    @UserMessage("Yêu cầu xử lý (mode={{mode}}): \nNội dung chi tiết hợp đồng: \n{{terms}}")
    String processContract(@V("terms") String terms, @V("role") String role, @V("mode") String mode);
}

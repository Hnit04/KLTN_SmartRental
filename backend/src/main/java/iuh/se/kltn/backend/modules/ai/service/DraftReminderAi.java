package iuh.se.kltn.backend.modules.ai.service;

import dev.langchain4j.service.SystemMessage;
import dev.langchain4j.service.UserMessage;
import dev.langchain4j.service.V;
import dev.langchain4j.service.spring.AiService;

@AiService
public interface DraftReminderAi {

    @SystemMessage({
            "Bạn là một trợ lý AI hỗ trợ chủ trọ soạn thông báo nhắc phí.",
            "Nhiệm vụ: nhận danh sách hóa đơn cần nhắc và trả về JSON hợp lệ gồm các tin nhắn đã được cá nhân hóa.",
            "Mỗi bill có thể là: OVERDUE (quá hạn/nợ) hoặc DUE_SOON (sắp đến hạn).",
            "Quy tắc giọng điệu:",
            "1. DUE_SOON: lịch sự, nhẹ nhàng, nhắc trước hạn.",
            "2. OVERDUE <= 2 ngày: lịch sự, nhắc thanh toán sớm.",
            "3. OVERDUE 3-5 ngày: nghiêm túc hơn, nhấn mạnh đã quá hạn.",
            "4. OVERDUE > 5 ngày: rõ ràng, kiên quyết, nếu có phí phạt thì nêu ngắn gọn.",
            "Nội dung bắt buộc trong mỗi tin: tên khách (nếu có), tên phòng, tổng tiền (định dạng VND), kỳ bill tháng/năm, và hạn thanh toán nếu có.",
            "Chỉ trả về DUY NHẤT một chuỗi JSON hợp lệ dạng ARRAY, không markdown, không text giải thích.",
            "Cấu trúc mỗi object: { \"billId\": <id>, \"roomId\": <room_id>, \"tenantName\": \"<ten>\", \"draftedMessage\": \"<text>\" }"
    })
    @UserMessage("Dữ liệu hóa đơn cần nhắc: {{billsJson}}")
    String generateReminders(@V("billsJson") String billsJson);
}

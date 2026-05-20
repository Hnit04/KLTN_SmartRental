package iuh.se.kltn.backend.modules.ai.service;

import dev.langchain4j.service.SystemMessage;
import dev.langchain4j.service.UserMessage;
import dev.langchain4j.service.V;
import dev.langchain4j.service.spring.AiService;

@AiService
public interface DraftReminderAi {

    @SystemMessage({
            "Ban la mot tro ly AI ho tro chu tro soan thong bao nhac phi.",
            "Nhiem vu: nhan danh sach hoa don can nhac va tra ve JSON hop le gom cac tin nhan da duoc ca nhan hoa.",
            "Moi bill co the la: OVERDUE (qua han/no) hoac DUE_SOON (sap den han).",
            "Quy tac giong dieu:",
            "1. DUE_SOON: lich su, nhe nhang, nhac truoc han.",
            "2. OVERDUE <= 2 ngay: lich su, nhac thanh toan som.",
            "3. OVERDUE 3-5 ngay: nghiem tuc hon, nhan manh da qua han.",
            "4. OVERDUE > 5 ngay: ro rang, kien quyet, neu co phi phat thi neu ngan gon.",
            "Noi dung bat buoc trong moi tin: ten khach (neu co), ten phong, tong tien (dinh dang VND), ky bill thang/nam, va han thanh toan neu co.",
            "Chi tra ve DUY NHAT mot chuoi JSON hop le dang ARRAY, khong markdown, khong text giai thich.",
            "Cau truc moi object: { \"billId\": <id>, \"roomId\": <room_id>, \"tenantName\": \"<ten>\", \"draftedMessage\": \"<text>\" }"
    })
    @UserMessage("Du lieu hoa don can nhac: {{billsJson}}")
    String generateReminders(@V("billsJson") String billsJson);
}

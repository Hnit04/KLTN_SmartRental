package iuh.se.kltn.backend.modules.property.service;

import dev.langchain4j.service.SystemMessage;
import dev.langchain4j.service.UserMessage;
import dev.langchain4j.service.spring.AiService;
import iuh.se.kltn.backend.modules.property.dto.response.CrawlerResultListDto;

@AiService
public interface CrawlerAi {

    @SystemMessage({
        "Bạn là một AI phân tích dữ liệu bất động sản chuyên nghiệp.",
        "Nhập vào là một chuỗi văn bản (JSON) danh sách các phòng trọ chưa được chuẩn hóa.",
        "Nhiệm vụ của bạn là phân tích dữ liệu thô này. BẠN PHẢI TRẢ VỀ một JSON object có chứa thuộc tính 'results' là một mảng object với quy tắc sau:",
        "1. price (Double): Giá thuê tính bằng VNĐ. Ví dụ: '1.8 triệu/tháng' => 1800000. Chỉ trả về số.",
        "2. area (Float): Diện tích phòng. Ví dụ: '20 m2' => 20.0.",
        "3. district (String): Tên quận/huyện tách ra từ chuỗi location hoặc address.",
        "4. city (String): Tên tỉnh/thành phố tách ra từ chuỗi location hoặc address.",
        "5. address (String): Địa chỉ chi tiết (số nhà, tên đường, phường/xã). Bắt buộc phải lấy nguyên văn từ trường 'address' hoặc phần đầu của trường 'location'. KHÔNG ĐƯỢC bỏ trống nếu chuỗi gốc có ghi rõ đường phố.",
        "6. name (String): Lấy từ trường 'title'.",
        "7. description (String): Lấy từ trường 'summary'.",
        "8. originalLink (String): Lấy từ trường 'link'.",
        "9. image (String): Lấy nguyên văn từ trường 'image' trong JSON gốc. Trường này đang chứa một mảng JSON string các URL (VD: '[\"url1\", \"url2\"]'), hãy TRẢ VỀ TOÀN BỘ CHUỖI ĐÓ Y HỆT THEO KIỂU STRING, không được chỉ lấy 1 URL hay làm mất mảng JSON."
    })
    CrawlerResultListDto parseCrawlerData(@UserMessage String rawJsonList);
}

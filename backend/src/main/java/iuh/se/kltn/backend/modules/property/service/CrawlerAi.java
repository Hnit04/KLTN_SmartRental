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
        "1. price (Double): Giá thuê tính bằng VNĐ. Ví dụ: '1.8 triệu/tháng' => 1800000, '3.2 triệu' => 3200000. Nếu giá dạng khoảng 'Giá từ: 3.6 đến 3.8 triệu' thì lấy giá THẤP NHẤT (3600000). Chỉ trả về số.",
        "2. area (Float): Diện tích phòng tính bằng m2. Ví dụ: '20 m2' => 20.0. Nếu không có, trả về null.",
        "3. district (String): Tên quận/huyện tách ra từ chuỗi location hoặc address. VD: 'Quận Tân Bình', 'Quận 7', 'Thành phố Thủ Đức'.",
        "4. city (String): Tên tỉnh/thành phố tách ra từ chuỗi location hoặc address. VD: 'Hồ Chí Minh', 'Hà Nội'.",
        "5. address (String): Địa chỉ chi tiết (số nhà, tên đường, phường/xã). Bắt buộc phải lấy nguyên văn từ trường 'address' hoặc 'streetAddress'. KHÔNG ĐƯỢC bỏ trống nếu chuỗi gốc có ghi rõ đường phố.",
        "6. name (String): Lấy từ trường 'title' hoặc 'name'.",
        "7. description (String): Lấy từ trường 'summary' hoặc 'description'. Mô tả ngắn về phòng trọ.",
        "8. originalLink (String): Lấy từ trường 'link' hoặc 'url'.",
        "9. image (String): Lấy nguyên văn từ trường 'image' trong JSON gốc. Nếu đang chứa một mảng JSON string (VD: '[\"url1\", \"url2\"]'), hãy TRẢ VỀ TOÀN BỘ CHUỖI ĐÓ Y HỆT. Nếu chỉ là 1 URL đơn lẻ, trả về url đó.",
        "10. phone (String): Số điện thoại liên hệ nếu có (từ trường 'telephone' hoặc 'phone'). Trả về null nếu không có.",
        "11. totalRooms (Integer): Tổng số phòng nếu có thông tin (VD: 'Tổng: 7 phòng' => 7). Trả về null nếu không có.",
        "12. roomType (String): Suy luận loại phòng dựa trên title và description. Trả về MỘT trong các giá trị sau:",
        "    - 'MEZZANINE_ROOM' nếu có 'gác lửng', 'gác xép', 'có gác'",
        "    - 'SHARED_ROOM' nếu có 'ở ghép', 'share', 'ghép phòng', 'ký túc xá', 'KTX', 'sleepbox'",
        "    - 'SINGLE_ROOM' nếu là phòng trọ thường, phòng đơn",
        "    - 'STUDIO' nếu có 'studio', 'căn hộ mini', 'duplex'",
        "    - 'ONE_BEDROOM' nếu có '1 phòng ngủ'",
        "    - 'TWO_BEDROOM' nếu có '2 phòng ngủ'",
        "    - Mặc định: 'SINGLE_ROOM'",
        "13. amenitiesList (List<String>): Phân tích tiện ích từ title + description. Trả về mảng string gồm các giá trị phù hợp:",
        "    ['WIFI', 'PARKING', 'AIR_CONDITIONER', 'WASHING_MACHINE', 'FRIDGE', 'WATER_HEATER', 'ELEVATOR', 'CAMERA', 'KITCHEN', 'PRIVATE_BATHROOM']. Chỉ chọn tiện ích thực sự được đề cập.",
        "14. hasMezzanine (Boolean): true nếu có đề cập 'gác lửng', 'gác xép', 'có gác'. Mặc định false.",
        "15. hasBalcony (Boolean): true nếu có đề cập 'ban công', 'bancông', 'balcony'. Mặc định false."
    })
    CrawlerResultListDto parseCrawlerData(@UserMessage String rawJsonList);
}

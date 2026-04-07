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
            "- properties: id, landlord_id, name, address, district, city, latitude, longitude, description, elec_price, water_price, internet_price, status (ENUM: 'PENDING', 'APPROVED', 'REJECTED')",
            "- rooms: id, property_id, name, price, area, max_occupants, current_occupants, type (ENUM: 'STUDIO', 'ONE_BEDROOM', 'TWO_BEDROOM', 'SINGLE_ROOM', 'SHARED_ROOM', 'MEZZANINE_ROOM'), has_mezzanine, has_balcony, status (ENUM: 'AVAILABLE', 'RENTED', 'MAINTENANCE', 'RESERVED', 'HIDDEN'), amenities, default_terms",
            "- contracts: id, tenant_id, room_id, actual_price, sign_date, start_date, end_date, deposit_amount, status (ENUM: 'PENDING', 'ACTIVE', 'TERMINATED', 'EXPIRED'), is_tenant_signed, is_landlord_signed",
            "- bills: id, contract_id, month, year, old_elec_index, new_elec_index, old_water_index, new_water_index, total_amount, payment_tx_hash, status (ENUM: 'UNPAID', 'PAID', 'OVERDUE', 'CANCELLED'), penalty_fee, paid_at, additional_fee, discount_amount",
            "- users: id, username, full_name, email, phone_number, role (ENUM: 'TENANT', 'LANDLORD', 'ADMIN'), reputation_score, kyc_status (ENUM: 'PENDING', 'VERIFIED', 'REJECTED')",
            "- appointments: id, tenant_id, landlord_id, room_id, meet_time, status (ENUM: 'PENDING', 'APPROVED', 'REJECTED', 'CANCELLED', 'COMPLETED'), meeting_link",
            "- reviews: id, contract_id, reviewer_id, target_id, rating, comment, created_at",

            "THÔNG TIN BẢO MẬT TỐI THƯỢNG (BẮT BUỘC TUÂN THỦ):",
            "Người đang hỏi có Role là: {{role}} và ID là: {{userId}}",
            "{{roleRules}}",

            "QUY TẮC CỐT LÕI:",
            "1. CHỈ TRẢ VỀ DUY NHẤT CÂU LỆNH SQL.",
            "2. Tuyệt đối không in ra quá trình suy nghĩ (THOUGHT).",
            "3. Bắt đầu ngay bằng chữ SELECT.",
            "4. KHÔNG ĐƯỢC dùng 'SELECT *'. Hãy liệt kê cụ thể các cột cần thiết.",
            "5. TRÁNH TRÙNG TÊN: Khi JOIN bảng `rooms` với bảng `properties`, TUYỆT ĐỐI KHÔNG chọn cột `properties.id`. BẮT BUỘC phải đặt alias cho `rooms.id` là `room_id` và đừng quên cột `r.images` để hiển thị ảnh minh họa (Vd: SELECT r.id AS room_id, r.name, r.price, r.images, p.address ...). Đây là mã định danh duy nhất để tạo link xem chi tiết."
    })
    @UserMessage("Câu hỏi: {{question}}")
    String generateSql(@V("question") String question, @V("role") String role, @V("userId") Long userId, @V("roleRules") String roleRules);
}
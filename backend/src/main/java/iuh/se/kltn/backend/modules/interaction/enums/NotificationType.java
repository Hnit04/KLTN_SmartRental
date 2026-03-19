package iuh.se.kltn.backend.modules.interaction.enums;

public enum NotificationType {
    SYSTEM,              // Thông báo hệ thống chung
    PAYMENT_REMINDER,    // Nhắc đóng tiền
    CONTRACT_UPDATE,     // Hợp đồng thay đổi / cần ký
    NEW_REVIEW,          // Có đánh giá mới (Chủ trọ nhận)
    APPOINTMENT_UPDATE,  // Lịch hẹn được duyệt / từ chối (Tenant nhận)
    BILL_CREATED,        // Hóa đơn tháng mới được tạo (Tenant nhận)
    ROOM_AVAILABLE       // Phòng vừa trống - gợi ý (Tenant nhận)
}


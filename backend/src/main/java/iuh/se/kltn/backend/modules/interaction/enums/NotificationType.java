package iuh.se.kltn.backend.modules.interaction.enums;

public enum NotificationType {
    SYSTEM,              // Thông báo hệ thống chung
    PAYMENT_REMINDER,    // Nhắc đóng tiền
    CONTRACT_UPDATE,     // Hợp đồng thay đổi / cần ký
    NEW_REVIEW,          // Có đánh giá mới (Chủ trọ nhận)
    APPOINTMENT_UPDATE,  // Lịch hẹn được duyệt / từ chối (Tenant nhận)
    BILL_CREATED,        // Hóa đơn tháng mới được tạo (Tenant nhận)
    ROOM_AVAILABLE,      // Phòng vừa trống - gợi ý (Tenant nhận)
    PROPERTY_APPROVED,   // Khu trọ được duyệt (Chủ trọ nhận)
    PROPERTY_REJECTED,   // Khu trọ bị từ chối (Chủ trọ nhận)
    ROOM_APPROVED,       // Phòng trọ được duyệt (Chủ trọ nhận)
    ROOM_REJECTED,        // Phòng trọ bị từ chối (Chủ trọ nhận)
    ROOM_UPDATED          // Phòng trọ bị ẩn không hiển thị công khai(Chủ trọ nhận)
}


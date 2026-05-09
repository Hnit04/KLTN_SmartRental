package iuh.se.kltn.backend.modules.subscription.enums;

import lombok.Getter;

@Getter
public enum VipTier {
    FREE(0, 1, 3, 3, 3, 0, 0, 0, false),
    SILVER(79000, 3, 10, 8, 8, 0, 5, 5, false),
    GOLD(199000, 10, 30, 15, 15, 2, 20, 15, true),
    PLATINUM(399000, -1, -1, 30, 30, 5, -1, 30, true);

    private final long price;             // Giá /tháng (VND)
    private final int maxProperties;      // Số khu trọ tối đa (-1 = unlimited)
    private final int maxRoomsPerProperty;// Số phòng / khu trọ (-1 = unlimited)
    private final int maxImagesPerProperty;// Số ảnh / khu trọ
    private final int maxImagesPerRoom;   // Số ảnh / phòng
    private final int maxPanoramaPerRoom; // Số ảnh 360° / phòng
    private final int aiDescMonthlyLimit; // Số lần AI tạo mô tả (-1 = unlimited)
    private final int searchBoost;        // Điểm boost tìm kiếm
    private final boolean prioritySupport;// Hỗ trợ ưu tiên

    VipTier(long price, int maxProperties, int maxRoomsPerProperty,
            int maxImagesPerProperty, int maxImagesPerRoom, int maxPanoramaPerRoom,
            int aiDescMonthlyLimit, int searchBoost, boolean prioritySupport) {
        this.price = price;
        this.maxProperties = maxProperties;
        this.maxRoomsPerProperty = maxRoomsPerProperty;
        this.maxImagesPerProperty = maxImagesPerProperty;
        this.maxImagesPerRoom = maxImagesPerRoom;
        this.maxPanoramaPerRoom = maxPanoramaPerRoom;
        this.aiDescMonthlyLimit = aiDescMonthlyLimit;
        this.searchBoost = searchBoost;
        this.prioritySupport = prioritySupport;
    }

    public boolean isUnlimitedProperties() {
        return maxProperties == -1;
    }

    public boolean isUnlimitedRooms() {
        return maxRoomsPerProperty == -1;
    }

    public boolean isUnlimitedAiDesc() {
        return aiDescMonthlyLimit == -1;
    }
}

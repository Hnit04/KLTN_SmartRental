package iuh.se.kltn.backend.modules.subscription.enums;

import lombok.Getter;

@Getter
public enum VipTier {
    FREE(0, 1, 3, 5, 3, 0, 0, false, false, false, false),
    SILVER(79000, 3, 10, 8, 8, 0, 5, false, false, false, false), // Legacy
    GOLD(199000, 5, 20, 15, 15, 2, 15, true, false, true, false), // Hiển thị trên UI là Premium
    PLATINUM(399000, -1, -1, 30, 30, 5, 30, true, true, true, true);

    private final long price;             // Giá /tháng (VND)
    private final int maxProperties;      // Số khu trọ tối đa (-1 = unlimited)
    private final int maxRoomsPerProperty;// Số phòng / khu trọ (-1 = unlimited)
    private final int maxImagesPerProperty;// Số ảnh / khu trọ
    private final int maxImagesPerRoom;   // Số ảnh / phòng
    private final int maxPanoramaPerRoom; // Số ảnh 360° / phòng
    private final int searchBoostWeight;        // Điểm boost tìm kiếm
    private final boolean aiDescriptionEnabled; // AI tạo mô tả
    private final boolean aiPriceSuggestionEnabled; // AI gợi ý giá
    private final boolean advancedDashboardEnabled; // Dashboard nâng cao
    private final boolean autoApproveWhenSafe; // Tự động duyệt khi an toàn

    VipTier(long price, int maxProperties, int maxRoomsPerProperty,
            int maxImagesPerProperty, int maxImagesPerRoom, int maxPanoramaPerRoom,
            int searchBoostWeight, boolean aiDescriptionEnabled, boolean aiPriceSuggestionEnabled,
            boolean advancedDashboardEnabled, boolean autoApproveWhenSafe) {
        this.price = price;
        this.maxProperties = maxProperties;
        this.maxRoomsPerProperty = maxRoomsPerProperty;
        this.maxImagesPerProperty = maxImagesPerProperty;
        this.maxImagesPerRoom = maxImagesPerRoom;
        this.maxPanoramaPerRoom = maxPanoramaPerRoom;
        this.searchBoostWeight = searchBoostWeight;
        this.aiDescriptionEnabled = aiDescriptionEnabled;
        this.aiPriceSuggestionEnabled = aiPriceSuggestionEnabled;
        this.advancedDashboardEnabled = advancedDashboardEnabled;
        this.autoApproveWhenSafe = autoApproveWhenSafe;
    }

    public boolean isUnlimitedProperties() {
        return maxProperties == -1;
    }

    public boolean isUnlimitedRooms() {
        return maxRoomsPerProperty == -1;
    }
}

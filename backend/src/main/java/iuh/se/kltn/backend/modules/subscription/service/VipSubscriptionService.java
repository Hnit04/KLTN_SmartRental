package iuh.se.kltn.backend.modules.subscription.service;

import iuh.se.kltn.backend.modules.interaction.enums.NotificationType;
import iuh.se.kltn.backend.modules.interaction.service.NotificationService;
import iuh.se.kltn.backend.modules.property.repository.PropertyRepository;
import iuh.se.kltn.backend.modules.property.repository.RoomRepository;
import iuh.se.kltn.backend.modules.subscription.entity.VipOrder;
import iuh.se.kltn.backend.modules.subscription.entity.VipSubscription;
import iuh.se.kltn.backend.modules.subscription.enums.OrderStatus;
import iuh.se.kltn.backend.modules.subscription.enums.VipTier;
import iuh.se.kltn.backend.modules.subscription.repository.VipOrderRepository;
import iuh.se.kltn.backend.modules.subscription.repository.VipSubscriptionRepository;
import iuh.se.kltn.backend.modules.user.entity.Landlord;
import iuh.se.kltn.backend.modules.user.repository.UserRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;

@Service
public class VipSubscriptionService {

    @Autowired
    private VipSubscriptionRepository subscriptionRepo;
    @Autowired
    private VipOrderRepository orderRepo;
    @Autowired
    private PropertyRepository propertyRepo;
    @Autowired
    private RoomRepository roomRepo;
    @Autowired
    private UserRepository userRepo;
    @Autowired
    private NotificationService notificationService;

    @Value("${sepay.platform.bank-name:MB}")
    private String platformBankName;
    @Value("${sepay.platform.account-number:0326829327}")
    private String platformAccountNumber;
    @Value("${sepay.platform.account-name:TRAN CONG TINH}")
    private String platformAccountName;
    @Value("${sepay.mock.amount-override:true}")
    private boolean mockAmountOverride;

    // ─── CORE: Lấy tier hiện tại ───
    public VipTier getCurrentTier(Long landlordId) {
        return subscriptionRepo.findByLandlordId(landlordId)
                .map(VipSubscription::getEffectiveTier)
                .orElse(VipTier.FREE);
    }

    public VipSubscription getOrCreateSubscription(Long landlordId) {
        return subscriptionRepo.findByLandlordId(landlordId)
                .orElseGet(() -> {
                    Landlord landlord = (Landlord) userRepo.findById(landlordId)
                            .orElseThrow(() -> new RuntimeException("Landlord không tồn tại"));
                    VipSubscription sub = new VipSubscription();
                    sub.setLandlord(landlord);
                    sub.setTier(VipTier.FREE);
                    return subscriptionRepo.save(sub);
                });
    }

    // ─── Thông tin gói hiện tại ───
    public Map<String, Object> getMyPlan(Long landlordId) {
        VipSubscription sub = getOrCreateSubscription(landlordId);
        VipTier tier = sub.getEffectiveTier();
        long propertyCount = propertyRepo.countByLandlordId(landlordId);

        return Map.of(
                "tier", tier.name(),
                "price", tier.getPrice(),
                "startDate", sub.getStartDate() != null ? sub.getStartDate().toString() : "",
                "endDate", sub.getEndDate() != null ? sub.getEndDate().toString() : "",
                "isActive", sub.isActive(),
                "currentPropertyCount", propertyCount,
                "maxProperties", tier.getMaxProperties(),
                "searchBoost", tier.getSearchBoost()
        );
    }

    // ─── Danh sách gói VIP (public) ───
    public List<Map<String, Object>> getAllPlans() {
        return List.of(
                buildPlanInfo(VipTier.FREE),
                buildPlanInfo(VipTier.SILVER),
                buildPlanInfo(VipTier.GOLD),
                buildPlanInfo(VipTier.PLATINUM)
        );
    }

    private Map<String, Object> buildPlanInfo(VipTier tier) {
        return Map.ofEntries(
                Map.entry("tier", tier.name()),
                Map.entry("price", tier.getPrice()),
                Map.entry("maxProperties", tier.getMaxProperties()),
                Map.entry("maxRoomsPerProperty", tier.getMaxRoomsPerProperty()),
                Map.entry("maxImagesPerProperty", tier.getMaxImagesPerProperty()),
                Map.entry("maxImagesPerRoom", tier.getMaxImagesPerRoom()),
                Map.entry("maxPanoramaPerRoom", tier.getMaxPanoramaPerRoom()),
                Map.entry("aiDescMonthlyLimit", tier.getAiDescMonthlyLimit()),
                Map.entry("searchBoost", tier.getSearchBoost()),
                Map.entry("prioritySupport", tier.isPrioritySupport())
        );
    }

    // ─── TẠO ĐƠN HÀNG MUA VIP ───
    @Transactional
    public Map<String, Object> createPurchaseOrder(Long landlordId, VipTier tier) {
        if (tier == VipTier.FREE) {
            throw new RuntimeException("Không cần mua gói FREE");
        }

        Landlord landlord = (Landlord) userRepo.findById(landlordId)
                .orElseThrow(() -> new RuntimeException("Landlord không tồn tại"));

        VipOrder order = new VipOrder();
        order.setLandlord(landlord);
        order.setTier(tier);
        order.setAmount(tier.getPrice());
        order.setStatus(OrderStatus.PENDING);
        VipOrder saved = orderRepo.save(order);

        // Sinh QR VietQR
        String amount = mockAmountOverride ? "2000" : String.valueOf(tier.getPrice());
        String addInfo = "SMR VIP " + saved.getId();
        String encodedAddInfo = java.net.URLEncoder.encode(addInfo, java.nio.charset.StandardCharsets.UTF_8).replace("+", "%20");
        String encodedAccountName = platformAccountName != null
                ? java.net.URLEncoder.encode(platformAccountName, java.nio.charset.StandardCharsets.UTF_8).replace("+", "%20")
                : "";
        String safeBankName = platformBankName.trim().replaceAll("\\s+", "");
        String qrUrl = String.format(
                "https://img.vietqr.io/image/%s-%s-compact2.png?amount=%s&addInfo=%s&accountName=%s",
                safeBankName, platformAccountNumber, amount, encodedAddInfo, encodedAccountName
        );

        return Map.of(
                "orderId", saved.getId(),
                "tier", tier.name(),
                "amount", amount,
                "addInfo", addInfo,
                "qrUrl", qrUrl
        );
    }

    // ─── XỬ LÝ WEBHOOK THANH TOÁN VIP ───
    @Transactional
    public void processVipPayment(Long orderId, Double amountIn, String referenceNumber) {
        VipOrder order = orderRepo.findById(orderId)
                .orElseThrow(() -> new RuntimeException("Đơn hàng VIP #" + orderId + " không tồn tại"));

        if (order.getStatus() == OrderStatus.PAID) {
            System.out.println("⚠️ [VIP] Đơn #" + orderId + " đã được xử lý trước đó.");
            return;
        }

        if (order.isExpired()) {
            order.setStatus(OrderStatus.EXPIRED);
            orderRepo.save(order);
            throw new RuntimeException("Đơn hàng VIP #" + orderId + " đã hết hạn.");
        }

        // Xác nhận thanh toán
        order.setStatus(OrderStatus.PAID);
        order.setPaidAt(LocalDateTime.now());
        order.setPaymentRef(referenceNumber);
        orderRepo.save(order);

        // Kích hoạt/gia hạn subscription
        VipSubscription sub = getOrCreateSubscription(order.getLandlord().getId());
        LocalDateTime now = LocalDateTime.now();

        // Nếu đang có gói active và chưa hết hạn → cộng thêm 30 ngày
        if (sub.isActive() && sub.getEndDate() != null && sub.getEndDate().isAfter(now)) {
            sub.setEndDate(sub.getEndDate().plusDays(30));
        } else {
            sub.setStartDate(now);
            sub.setEndDate(now.plusDays(30));
        }
        sub.setTier(order.getTier());
        subscriptionRepo.save(sub);

        // Thông báo
        try {
            notificationService.createNotification(
                    order.getLandlord(),
                    "Nâng cấp VIP thành công! 🎉",
                    "Bạn đã nâng cấp lên gói " + order.getTier().name() + ". Gói có hiệu lực đến " +
                            sub.getEndDate().toLocalDate().toString() + ".",
                    NotificationType.SYSTEM,
                    null
            );
        } catch (Exception e) {
            System.err.println("⚠️ Lỗi gửi notification VIP: " + e.getMessage());
        }

        System.out.println("✅ [VIP] Đã kích hoạt gói " + order.getTier().name() + " cho Landlord #" + order.getLandlord().getId());
    }

    // ─── Lấy trạng thái đơn hàng (polling) ───
    public Map<String, Object> getOrderStatus(Long orderId) {
        VipOrder order = orderRepo.findById(orderId)
                .orElseThrow(() -> new RuntimeException("Đơn hàng VIP không tồn tại"));

        if (order.isExpired() && order.getStatus() == OrderStatus.PENDING) {
            order.setStatus(OrderStatus.EXPIRED);
            orderRepo.save(order);
        }

        return Map.of(
                "orderId", order.getId(),
                "status", order.getStatus().name(),
                "tier", order.getTier().name()
        );
    }

    // ─── Lịch sử thanh toán ───
    public List<VipOrder> getPaymentHistory(Long landlordId) {
        return orderRepo.findByLandlordIdOrderByCreatedAtDesc(landlordId);
    }

    // ═══════════════════════════════════════════
    // ─── GIỚI HẠN: CHECK LIMITS ───
    // ═══════════════════════════════════════════

    /**
     * Check giới hạn số khu trọ. Throw RuntimeException kèm thông tin gói hiện tại nếu vượt.
     */
    public void checkPropertyLimit(Long landlordId) {
        VipTier tier = getCurrentTier(landlordId);
        if (tier.isUnlimitedProperties()) return;

        long count = propertyRepo.countByLandlordId(landlordId);
        if (count >= tier.getMaxProperties()) {
            throw new VipLimitExceededException(
                    "Gói " + tier.name() + " chỉ cho phép tối đa " + tier.getMaxProperties() + " khu trọ. " +
                            "Bạn đã sử dụng " + count + "/" + tier.getMaxProperties() + ". Vui lòng nâng cấp gói VIP để đăng thêm.",
                    tier.name(), "PROPERTY", (int) count, tier.getMaxProperties()
            );
        }
    }

    /**
     * Check giới hạn số phòng / khu trọ.
     */
    public void checkRoomLimit(Long landlordId, Long propertyId) {
        VipTier tier = getCurrentTier(landlordId);
        if (tier.isUnlimitedRooms()) return;

        long count = roomRepo.countByPropertyId(propertyId);
        if (count >= tier.getMaxRoomsPerProperty()) {
            throw new VipLimitExceededException(
                    "Gói " + tier.name() + " chỉ cho phép tối đa " + tier.getMaxRoomsPerProperty() + " phòng/khu trọ. " +
                            "Bạn đã sử dụng " + count + "/" + tier.getMaxRoomsPerProperty() + ". Vui lòng nâng cấp gói VIP.",
                    tier.name(), "ROOM", (int) count, tier.getMaxRoomsPerProperty()
            );
        }
    }

    /**
     * Check giới hạn số ảnh / khu trọ.
     */
    public void checkPropertyImageLimit(Long landlordId, int imageCount) {
        VipTier tier = getCurrentTier(landlordId);
        if (imageCount > tier.getMaxImagesPerProperty()) {
            throw new VipLimitExceededException(
                    "Gói " + tier.name() + " chỉ cho phép tối đa " + tier.getMaxImagesPerProperty() + " ảnh/khu trọ. " +
                            "Bạn đang tải lên " + imageCount + " ảnh. Vui lòng nâng cấp gói VIP.",
                    tier.name(), "PROPERTY_IMAGE", imageCount, tier.getMaxImagesPerProperty()
            );
        }
    }

    /**
     * Check giới hạn số ảnh / phòng.
     */
    public void checkRoomImageLimit(Long landlordId, int imageCount) {
        VipTier tier = getCurrentTier(landlordId);
        if (imageCount > tier.getMaxImagesPerRoom()) {
            throw new VipLimitExceededException(
                    "Gói " + tier.name() + " chỉ cho phép tối đa " + tier.getMaxImagesPerRoom() + " ảnh/phòng. " +
                            "Bạn đang tải lên " + imageCount + " ảnh. Vui lòng nâng cấp gói VIP.",
                    tier.name(), "ROOM_IMAGE", imageCount, tier.getMaxImagesPerRoom()
            );
        }
    }

    /**
     * Lấy điểm boost tìm kiếm cho Landlord.
     */
    public int getSearchBoost(Long landlordId) {
        return getCurrentTier(landlordId).getSearchBoost();
    }

    // ─── SCHEDULED: Hạ gói khi hết hạn ───
    @Scheduled(cron = "0 0 0 * * *") // Mỗi ngày lúc 00:00
    @Transactional
    public void processExpiredSubscriptions() {
        List<VipSubscription> expired = subscriptionRepo
                .findByTierNotAndEndDateBefore(VipTier.FREE, LocalDateTime.now());

        for (VipSubscription sub : expired) {
            VipTier oldTier = sub.getTier();
            sub.setTier(VipTier.FREE);
            sub.setStartDate(null);
            sub.setEndDate(null);
            subscriptionRepo.save(sub);

            // Thông báo hết hạn
            try {
                notificationService.createNotification(
                        sub.getLandlord(),
                        "Gói VIP đã hết hạn ⏰",
                        "Gói " + oldTier.name() + " của bạn đã hết hạn. Các quyền lợi đã trở về FREE. " +
                                "Gia hạn ngay để tiếp tục sử dụng!",
                        NotificationType.SYSTEM,
                        null
                );
            } catch (Exception e) {
                System.err.println("⚠️ Lỗi gửi notification hết hạn VIP: " + e.getMessage());
            }

            System.out.println("⏰ [VIP] Gói " + oldTier.name() + " của Landlord #" + sub.getLandlord().getId() + " đã hết hạn → FREE");
        }

        // Dọn dẹp đơn hàng PENDING quá 15 phút
        List<VipOrder> expiredOrders = orderRepo
                .findByStatusAndCreatedAtBefore(OrderStatus.PENDING, LocalDateTime.now().minusMinutes(15));
        for (VipOrder order : expiredOrders) {
            order.setStatus(OrderStatus.EXPIRED);
            orderRepo.save(order);
        }
    }

    // ─── Custom Exception ───
    public static class VipLimitExceededException extends RuntimeException {
        private final String currentTier;
        private final String limitType;
        private final int currentCount;
        private final int maxAllowed;

        public VipLimitExceededException(String message, String currentTier, String limitType, int currentCount, int maxAllowed) {
            super(message);
            this.currentTier = currentTier;
            this.limitType = limitType;
            this.currentCount = currentCount;
            this.maxAllowed = maxAllowed;
        }

        public String getCurrentTier() { return currentTier; }
        public String getLimitType() { return limitType; }
        public int getCurrentCount() { return currentCount; }
        public int getMaxAllowed() { return maxAllowed; }
    }
}

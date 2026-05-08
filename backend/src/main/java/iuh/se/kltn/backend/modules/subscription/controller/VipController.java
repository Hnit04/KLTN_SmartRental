package iuh.se.kltn.backend.modules.subscription.controller;

import iuh.se.kltn.backend.common.security.UserPrincipal;
import iuh.se.kltn.backend.modules.subscription.entity.VipOrder;
import iuh.se.kltn.backend.modules.subscription.enums.VipTier;
import iuh.se.kltn.backend.modules.subscription.service.VipSubscriptionService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/vip")
public class VipController {

    @Autowired
    private VipSubscriptionService vipService;

    /**
     * Danh sách gói VIP (public)
     */
    @GetMapping("/plans")
    public ResponseEntity<?> getPlans() {
        return ResponseEntity.ok(vipService.getAllPlans());
    }

    /**
     * Gói hiện tại của Landlord
     */
    @GetMapping("/my-plan")
    public ResponseEntity<?> getMyPlan(@AuthenticationPrincipal UserPrincipal currentUser) {
        return ResponseEntity.ok(vipService.getMyPlan(currentUser.getId()));
    }

    /**
     * Tạo đơn mua VIP → trả QR code
     */
    @PostMapping("/purchase/{tier}")
    public ResponseEntity<?> purchaseVip(
            @AuthenticationPrincipal UserPrincipal currentUser,
            @PathVariable String tier) {
        try {
            VipTier vipTier = VipTier.valueOf(tier.toUpperCase());
            Map<String, Object> result = vipService.createPurchaseOrder(currentUser.getId(), vipTier);
            return ResponseEntity.ok(result);
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(Map.of("error", "Gói VIP không hợp lệ: " + tier));
        } catch (RuntimeException e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }

    /**
     * Trạng thái đơn hàng (polling)
     */
    @GetMapping("/order/{orderId}/status")
    public ResponseEntity<?> getOrderStatus(@PathVariable Long orderId) {
        try {
            return ResponseEntity.ok(vipService.getOrderStatus(orderId));
        } catch (RuntimeException e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }

    /**
     * Lịch sử thanh toán
     */
    @GetMapping("/history")
    public ResponseEntity<?> getHistory(@AuthenticationPrincipal UserPrincipal currentUser) {
        List<VipOrder> history = vipService.getPaymentHistory(currentUser.getId());
        return ResponseEntity.ok(history.stream().map(o -> Map.of(
                "id", o.getId(),
                "tier", o.getTier().name(),
                "amount", o.getAmount(),
                "status", o.getStatus().name(),
                "createdAt", o.getCreatedAt() != null ? o.getCreatedAt().toString() : "",
                "paidAt", o.getPaidAt() != null ? o.getPaidAt().toString() : ""
        )).toList());
    }
}

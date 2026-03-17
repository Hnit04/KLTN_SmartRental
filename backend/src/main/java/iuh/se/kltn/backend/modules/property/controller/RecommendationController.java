package iuh.se.kltn.backend.modules.property.controller;

import iuh.se.kltn.backend.common.security.UserPrincipal;
import iuh.se.kltn.backend.modules.property.service.RecommendationService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/recommendations")
public class RecommendationController {

    @Autowired
    private RecommendationService recommendationService;

    @GetMapping("/rooms")
    public ResponseEntity<?> getRecommendedRooms(@AuthenticationPrincipal UserPrincipal currentUser) {
        // Chỉ TENANT mới có Recommendation. Nhưng để tránh lỗi, ta chỉ cần gọi tenantId = currentUser.getId()
        return ResponseEntity.ok(recommendationService.getRecommendedRoomsForTenant(currentUser.getId()));
    }
}

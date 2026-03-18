package iuh.se.kltn.backend.modules.user.controller;

import iuh.se.kltn.backend.common.security.UserPrincipal;
import iuh.se.kltn.backend.modules.user.dto.request.TenantPreferenceRequest;
import iuh.se.kltn.backend.modules.user.entity.TenantPreference;
import iuh.se.kltn.backend.modules.user.service.TenantPreferenceService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/tenant-preferences")
public class TenantPreferenceController {

    @Autowired
    private TenantPreferenceService tenantPreferenceService;

    @GetMapping
    public ResponseEntity<?> getMyPreference(@AuthenticationPrincipal UserPrincipal currentUser) {
        TenantPreference preference = tenantPreferenceService.getPreference(currentUser.getId());
        if (preference == null) {
            return ResponseEntity.ok(null); // Trả về null hoặc object rỗng để client biết chưa có set
        }
        return ResponseEntity.ok(preference);
    }

    @PutMapping
    public ResponseEntity<?> updateMyPreference(
            @AuthenticationPrincipal UserPrincipal currentUser,
            @RequestBody TenantPreferenceRequest request) {
        TenantPreference updated = tenantPreferenceService.updatePreference(currentUser.getId(), request);
        return ResponseEntity.ok(updated);
    }
}

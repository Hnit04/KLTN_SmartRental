package iuh.se.kltn.backend.modules.user.service;

import iuh.se.kltn.backend.common.exception.ResourceNotFoundException;
import iuh.se.kltn.backend.modules.user.dto.request.TenantPreferenceRequest;
import iuh.se.kltn.backend.modules.user.entity.Tenant;
import iuh.se.kltn.backend.modules.user.entity.TenantPreference;
import iuh.se.kltn.backend.modules.user.entity.User;
import iuh.se.kltn.backend.modules.user.repository.TenantPreferenceRepository;
import iuh.se.kltn.backend.modules.user.repository.UserRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.util.Optional;

@Service
public class TenantPreferenceService {

    @Autowired
    private TenantPreferenceRepository tenantPreferenceRepository;

    @Autowired
    private UserRepository userRepository;

    public TenantPreference getPreference(Long tenantId) {
        return tenantPreferenceRepository.findByTenantId(tenantId)
                .orElse(null);
    }

    public TenantPreference updatePreference(Long tenantId, TenantPreferenceRequest request) {
        User user = userRepository.findById(tenantId)
                .orElseThrow(() -> new ResourceNotFoundException("Tenant", "id", tenantId));

        if (!(user instanceof Tenant)) {
            throw new RuntimeException("Chỉ người thuê (Tenant) mới có thể cập nhật sở thích.");
        }

        Tenant tenant = (Tenant) user;
        TenantPreference preference = tenantPreferenceRepository.findByTenantId(tenantId)
                .orElseGet(() -> {
                    TenantPreference newPref = new TenantPreference();
                    newPref.setTenant(tenant);
                    return newPref;
                });

        preference.setTargetPriceMin(request.getTargetPriceMin());
        preference.setTargetPriceMax(request.getTargetPriceMax());
        preference.setPreferredLocation(request.getPreferredLocation());
        preference.setHasPet(request.getHasPet());
        preference.setAmenitiesRef(request.getAmenitiesRef());

        return tenantPreferenceRepository.save(preference);
    }
}

package iuh.se.kltn.backend.modules.user.entity;

import org.hibernate.envers.RevisionListener;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;

public class UserRevisionListener implements RevisionListener {
    @Override
    public void newRevision(Object revisionEntity) {
        CustomRevisionEntity customEntity = (CustomRevisionEntity) revisionEntity;

        Authentication auth = SecurityContextHolder.getContext().getAuthentication();

        if (auth != null && auth.isAuthenticated() && !"anonymousUser".equals(auth.getPrincipal())) {
            // 1. Lưu Username
            customEntity.setModifiedBy(auth.getName());

            // 2. Lưu Full Name
            // Ép kiểu principal về lớp UserPrincipal của bạn để lấy fullName
            if (auth.getPrincipal() instanceof iuh.se.kltn.backend.common.security.UserPrincipal) {
                iuh.se.kltn.backend.common.security.UserPrincipal principal =
                        (iuh.se.kltn.backend.common.security.UserPrincipal) auth.getPrincipal();

                customEntity.setModifiedByFullName(principal.getFullName());
            }
        } else {
            customEntity.setModifiedBy("System");
            customEntity.setModifiedByFullName("Hệ thống");
        }
    }
}
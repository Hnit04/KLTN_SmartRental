package iuh.se.kltn.backend.modules.ai.service;

import org.springframework.stereotype.Service;

/**
 * 🛡️ AI Security Gate Service
 * Tách biệt logic bảo mật SQL khỏi AiOrchestratorService.
 * 
 * Pipeline: SQL sinh ra → validateAndSanitize() → SQL an toàn hoặc chặn.
 * 
 * 5 lớp bảo vệ:
 *   1. Chỉ cho phép SELECT/WITH
 *   2. Chặn DML/DDL (INSERT, UPDATE, DELETE, DROP, ALTER, TRUNCATE, CREATE, GRANT, REVOKE)
 *   3. Role-based table access (Guest, Tenant, Landlord)
 *   4. Chặn cột nhạy cảm (password, token, wallet...)
 *   5. Tự thêm LIMIT 50 nếu thiếu
 */
@Service
public class SecurityGateService {

    private static final String[] SENSITIVE_COLUMNS = {
        "PASSWORD", "VERIFICATION_CODE", "VERIFICATION_EXPIRY",
        "WALLET_ADDRESS", "BLOCKCHAIN_PRIVATE", "REFRESH_TOKEN"
    };

    /**
     * Kiểm tra SQL chỉ là SELECT/WITH, không chứa DML/DDL.
     */
    public boolean isSafeSelectSql(String sql) {
        if (sql == null || sql.trim().isEmpty()) {
            return false;
        }
        String upper = sql.trim().toUpperCase();
        if (!upper.startsWith("SELECT") && !upper.startsWith("WITH")) {
            return false;
        }
        return !upper.matches(".*\\b(INSERT|UPDATE|DELETE|DROP|ALTER|TRUNCATE|CREATE|GRANT|REVOKE)\\b.*");
    }

    /**
     * Chặn Guest truy cập bảng nhạy cảm.
     * Dùng WHITELIST: GUEST chỉ được truy cập properties và rooms.
     * Mọi bảng khác đều bị chặn.
     * @return Thông báo lỗi nếu vi phạm, null nếu OK.
     */
    public String checkGuestAccess(String sql) {
        String upperSql = sql.toUpperCase();
        // BLACKLIST: Chặn tường minh các bảng nhạy cảm
        String[] forbiddenTables = {
            "USERS", "BILLS", "CONTRACTS", "APPOINTMENTS", "PAYMENTS",
            "CONTRACT_MEMBERS", "REVIEWS", "NOTIFICATIONS",
            "AI_SQL_CACHE", "AI_ACTION_LOG", "CONTRACT_CHANGE_REQUEST"
        };
        for (String table : forbiddenTables) {
            if (upperSql.contains(table)) {
                System.err.println("🚨 SECURITY ALERT: GUEST tried to access restricted table: " + table);
                return "Dạ, vì lý do bảo mật, khách vãng lai chỉ có thể tra cứu thông tin phòng và khu trọ công khai thôi ạ. Bạn vui lòng đăng nhập để xem các thông tin cá nhân nhé!";
            }
        }
        return null;
    }

    /**
     * Chặn Tenant xem doanh thu nội bộ của chủ trọ.
     * @return Thông báo lỗi nếu vi phạm, null nếu OK.
     */
    public String checkTenantAccess(String sql) {
        String upperSql = sql.toUpperCase();
        if (upperSql.contains("REVENUE") || (upperSql.contains("SUM(") && !upperSql.contains("TENANT_ID"))) {
            return "Dạ, thông tin này thuộc về nội bộ ban quản lý, em không thể tiết lộ ạ.";
        }
        return null;
    }

    /**
     * Chặn Landlord thiếu điều kiện landlord_id khi truy cập bảng nhạy cảm.
     * Cho phép query public (không chạm bảng nhạy cảm) mà không cần landlord_id.
     * @return Thông báo lỗi nếu vi phạm, null nếu OK.
     */
    public String checkLandlordIsolation(String sql) {
        String upperSql = sql.toUpperCase();
        // Chỉ bắt buộc LANDLORD_ID khi query truy cập bảng nhạy cảm
        boolean touchesSensitiveTables =
                upperSql.contains("CONTRACTS") || upperSql.contains("BILLS") ||
                upperSql.contains("APPOINTMENTS") || upperSql.contains("PAYMENTS") ||
                upperSql.contains("ROOMS") || upperSql.contains("PROPERTIES");

        if (touchesSensitiveTables && !upperSql.contains("UNAUTHORIZED") && !upperSql.contains("LANDLORD_ID")) {
            System.err.println("🚨 [HARD SECURITY ALERT] SQL của Chủ trọ thiếu điều kiện phân quyền: " + sql);
            return "Dạ, yêu cầu tra cứu bị từ chối do vi phạm luồng bảo mật dữ liệu.";
        }
        return null;
    }

    /**
     * Chặn Tenant truy cập bảng nhạy cảm mà không có tenant_id filter.
     * @return Thông báo lỗi nếu vi phạm, null nếu OK.
     */
    public String checkTenantIsolation(String sql) {
        String upperSql = sql.toUpperCase();
        if (!upperSql.contains("UNAUTHORIZED") &&
                (upperSql.contains("CONTRACTS") || upperSql.contains("BILLS")
                        || upperSql.contains("APPOINTMENTS")) && !upperSql.contains("TENANT_ID")) {
            System.err.println("🚨 [HARD SECURITY ALERT] SQL của Khách thuê truy cập bảng nhạy cảm mà thiếu tenant_id: " + sql);
            return "Dạ, yêu cầu tra cứu bị từ chối do vi phạm quyền riêng tư của khách hàng khác.";
        }
        return null;
    }

    /**
     * Chặn truy cập cột nhạy cảm (chống data exfiltration).
     * @return Thông báo lỗi nếu vi phạm, null nếu OK.
     */
    public String checkSensitiveColumns(String sql) {
        String upperSql = sql.toUpperCase();
        for (String col : SENSITIVE_COLUMNS) {
            if (upperSql.contains(col)) {
                System.err.println("🚨 [AI SECURITY] SQL chứa cột nhạy cảm: " + col);
                return "Dạ, truy vấn chứa thông tin nhạy cảm bị hệ thống chặn. Vui lòng thử lại với câu hỏi khác.";
            }
        }
        return null;
    }

    /**
     * Thêm LIMIT 50 nếu SQL chưa có để chống data dumping.
     */
    public String enforceLimitClause(String sql) {
        if (!sql.toUpperCase().contains("LIMIT")) {
            return sql.replaceAll(";\\s*$", "") + " LIMIT 50";
        }
        return sql;
    }

    /**
     * 🛡️ Pipeline tổng hợp: chạy tất cả security checks theo thứ tự.
     * 
     * @param sql  SQL cần kiểm tra
     * @param role Vai trò người dùng (GUEST, TENANT, LANDLORD)
     * @return null nếu SQL hợp lệ (đã sanitize), hoặc thông báo lỗi nếu bị chặn
     */
    public SecurityResult validateAndSanitize(String sql, String role) {
        // Check 1: UNAUTHORIZED response từ AI
        if (sql.trim().equalsIgnoreCase("UNAUTHORIZED")) {
            return SecurityResult.blocked("Dạ, em chỉ là trợ lý ảo nên không có quyền cung cấp thông tin bảo mật này cho khách thuê ạ.");
        }

        // Check 2: Chỉ cho SELECT/WITH
        if (!isSafeSelectSql(sql)) {
            System.err.println("⚠️ [AI SQL GUARD] Non-SELECT or invalid SQL payload from model: " + sql);
            return SecurityResult.blocked("Dạ, yêu cầu này thiên về tư vấn/chính sách nên không thể chuyển thành truy vấn dữ liệu an toàn. Bạn vui lòng hỏi rõ theo dạng dữ liệu cần tra cứu (ví dụ: hóa đơn tháng, hợp đồng hiện tại, phòng trống).");
        }

        // Check 3: DML/DDL guard
        String upperCaseSql = sql.toUpperCase();
        if (upperCaseSql.matches(".*\\b(INSERT|UPDATE|DELETE|DROP|ALTER|TRUNCATE)\\b.*")) {
            System.err.println("🚨 [SECURITY ALERT] Phát hiện lệnh cấm mạo danh AI: " + sql);
            return SecurityResult.blocked("Dạ, yêu cầu của bạn chứa truy vấn không an toàn. Hệ thống đã huỷ bỏ yêu cầu này để bảo mật dữ liệu.");
        }

        // Check 4: Role-based access
        String roleCheck = null;
        if (role.equalsIgnoreCase("GUEST")) {
            roleCheck = checkGuestAccess(sql);
        } else if (role.equalsIgnoreCase("TENANT")) {
            roleCheck = checkTenantAccess(sql);
            if (roleCheck == null) {
                roleCheck = checkTenantIsolation(sql);
            }
        } else if (role.equalsIgnoreCase("LANDLORD")) {
            roleCheck = checkLandlordIsolation(sql);
        }
        if (roleCheck != null) {
            return SecurityResult.blocked(roleCheck);
        }

        // Check 5: Sensitive columns
        String colCheck = checkSensitiveColumns(sql);
        if (colCheck != null) {
            return SecurityResult.blocked(colCheck);
        }

        // Check 6: Enforce LIMIT
        String sanitizedSql = enforceLimitClause(sql);

        return SecurityResult.passed(sanitizedSql);
    }

    /**
     * Kết quả kiểm tra bảo mật.
     */
    public static class SecurityResult {
        private final boolean blocked;
        private final String message;      // Thông báo lỗi (nếu blocked)
        private final String sanitizedSql;  // SQL đã sanitize (nếu passed)

        private SecurityResult(boolean blocked, String message, String sanitizedSql) {
            this.blocked = blocked;
            this.message = message;
            this.sanitizedSql = sanitizedSql;
        }

        public static SecurityResult blocked(String message) {
            return new SecurityResult(true, message, null);
        }

        public static SecurityResult passed(String sanitizedSql) {
            return new SecurityResult(false, null, sanitizedSql);
        }

        public boolean isBlocked() { return blocked; }
        public String getMessage() { return message; }
        public String getSanitizedSql() { return sanitizedSql; }
    }
}

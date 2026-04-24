package iuh.se.kltn.backend.modules.ai.service.handler;

import iuh.se.kltn.backend.modules.ai.dto.IntentExtractionResult;
import iuh.se.kltn.backend.modules.ai.enums.SystemIntent;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;

import jakarta.annotation.PostConstruct;
import java.time.LocalDate;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.ArrayList;

@Service
public class DynamicQueryEngine {

    @Autowired
    private JdbcTemplate jdbcTemplate;

    private Map<SystemIntent, AiQueryHandler> handlers = new HashMap<>();

    @PostConstruct
    public void initHandlers() {
        // --- GUEST / ALL ROLES ---
        handlers.put(SystemIntent.SEARCH_ROOM, this::handleSearchRoom);

        // --- TENANT ---
        handlers.put(SystemIntent.VIEW_BILL, this::handleViewBill);
        handlers.put(SystemIntent.VIEW_DEBT, this::handleViewDebt);
        handlers.put(SystemIntent.VIEW_CONTRACT, this::handleViewContract);
        handlers.put(SystemIntent.VIEW_APPOINTMENT, this::handleViewAppointment);

        // --- LANDLORD ---
        handlers.put(SystemIntent.VIEW_REVENUE, this::handleViewRevenue);
        handlers.put(SystemIntent.VIEW_DEBTORS, this::handleViewDebtors);
        handlers.put(SystemIntent.VIEW_OCCUPANCY, this::handleViewOccupancy);
        handlers.put(SystemIntent.VIEW_RISK, this::handleViewRisk);
    }

    public boolean canHandle(SystemIntent intent) {
        return handlers.containsKey(intent);
    }

    public List<Map<String, Object>> execute(IntentExtractionResult intentData, Long userId, String role) {
        AiQueryHandler handler = handlers.get(intentData.getIntent());
        if (handler != null) {
            return handler.handle(intentData, userId, role);
        }
        throw new RuntimeException("No handler found for intent: " + intentData.getIntent());
    }

    // ========================================================================
    // GUEST: Tìm phòng trọ công khai
    // Nghiệp vụ: Chỉ hiển thị phòng AVAILABLE thuộc khu trọ đã APPROVED.
    // ========================================================================
    private List<Map<String, Object>> handleSearchRoom(IntentExtractionResult intentData, Long userId, String role) {
        StringBuilder sql = new StringBuilder(
                "SELECT r.id AS room_id, r.name, r.price, r.area, r.type, r.images, " +
                "r.has_mezzanine, r.has_balcony, p.name AS property_name, p.address, p.district " +
                "FROM rooms r JOIN properties p ON r.property_id = p.id " +
                "WHERE r.status = 'AVAILABLE' AND p.status = 'APPROVED'"
        );
        List<Object> queryParams = new ArrayList<>();
        Map<String, Object> params = intentData.getParams();

        if (params != null) {
            if (params.containsKey("district")) {
                sql.append(" AND (p.district LIKE ? OR p.address LIKE ?)");
                String district = "%" + params.get("district") + "%";
                queryParams.add(district);
                queryParams.add(district);
            }
            if (params.containsKey("city")) {
                sql.append(" AND p.city LIKE ?");
                queryParams.add("%" + params.get("city") + "%");
            }
            if (params.containsKey("min_price")) {
                sql.append(" AND r.price >= ?");
                queryParams.add(toDouble(params.get("min_price")));
            }
            if (params.containsKey("max_price")) {
                sql.append(" AND r.price <= ?");
                queryParams.add(toDouble(params.get("max_price")));
            }
            if (params.containsKey("room_type")) {
                sql.append(" AND r.type = ?");
                queryParams.add(params.get("room_type").toString());
            }
            if (params.containsKey("has_mezzanine") && Boolean.TRUE.equals(params.get("has_mezzanine"))) {
                sql.append(" AND r.has_mezzanine = TRUE");
            }
            if (params.containsKey("has_balcony") && Boolean.TRUE.equals(params.get("has_balcony"))) {
                sql.append(" AND r.has_balcony = TRUE");
            }
        }
        sql.append(" ORDER BY r.price ASC LIMIT 10");
        return jdbcTemplate.queryForList(sql.toString(), queryParams.toArray());
    }

    // ========================================================================
    // TENANT: Xem hóa đơn của chính mình
    // Nghiệp vụ: bills KHÔNG có tenant_id → BẮT BUỘC JOIN qua contracts.
    // Hiển thị thông tin phòng kèm theo để khách biết hóa đơn thuộc phòng nào.
    // ========================================================================
    private List<Map<String, Object>> handleViewBill(IntentExtractionResult intentData, Long userId, String role) {
        StringBuilder sql = new StringBuilder(
                "SELECT b.id AS bill_id, b.month, b.year, b.total_amount, b.status, " +
                "b.old_elec_index, b.new_elec_index, b.old_water_index, b.new_water_index, " +
                "b.penalty_fee, b.additional_fee, b.discount_amount, b.deadline, b.paid_at, " +
                "r.name AS room_name " +
                "FROM bills b " +
                "JOIN contracts c ON b.contract_id = c.id " +
                "JOIN rooms r ON c.room_id = r.id " +
                "WHERE c.tenant_id = ? AND c.status = 'ACTIVE'"
        );
        List<Object> queryParams = new ArrayList<>();
        queryParams.add(userId);
        Map<String, Object> params = intentData.getParams();

        if (params != null) {
            if (params.containsKey("month")) {
                sql.append(" AND b.month = ?");
                queryParams.add(toInt(params.get("month")));
            }
            if (params.containsKey("year")) {
                sql.append(" AND b.year = ?");
                queryParams.add(toInt(params.get("year")));
            }
            if (params.containsKey("bill_status")) {
                sql.append(" AND b.status = ?");
                queryParams.add(params.get("bill_status").toString());
            }
        }
        sql.append(" ORDER BY b.year DESC, b.month DESC LIMIT 20");
        return jdbcTemplate.queryForList(sql.toString(), queryParams.toArray());
    }

    // ========================================================================
    // TENANT: Xem nợ chưa đóng
    // Nghiệp vụ: Nợ = hóa đơn có status UNPAID hoặc LATE.
    // Đây là tính năng cảnh báo nên hiển thị thêm deadline và tiền phạt.
    // ========================================================================
    private List<Map<String, Object>> handleViewDebt(IntentExtractionResult intentData, Long userId, String role) {
        String sql =
                "SELECT b.id AS bill_id, b.month, b.year, b.total_amount, b.status, " +
                "b.deadline, b.penalty_fee, r.name AS room_name, p.name AS property_name " +
                "FROM bills b " +
                "JOIN contracts c ON b.contract_id = c.id " +
                "JOIN rooms r ON c.room_id = r.id " +
                "JOIN properties p ON r.property_id = p.id " +
                "WHERE c.tenant_id = ? AND c.status = 'ACTIVE' AND b.status IN ('UNPAID', 'LATE') " +
                "ORDER BY b.year DESC, b.month DESC";
        return jdbcTemplate.queryForList(sql, userId);
    }

    // ========================================================================
    // TENANT: Xem hợp đồng
    // Nghiệp vụ: Hiển thị giá thuê thực tế (actual_price), tiền cọc, ngày
    // hết hạn, trạng thái ký. Nếu khách hỏi "hợp đồng còn bao lâu" thì
    // DATEDIFF sẽ trả về số ngày còn lại rất trực quan.
    // ========================================================================
    private List<Map<String, Object>> handleViewContract(IntentExtractionResult intentData, Long userId, String role) {
        StringBuilder sql = new StringBuilder(
                "SELECT c.id AS contract_id, c.actual_price, c.deposit_amount, " +
                "c.start_date, c.end_date, c.status, c.is_tenant_signed, c.is_landlord_signed, " +
                "DATEDIFF(c.end_date, CURRENT_DATE) AS days_remaining, " +
                "r.name AS room_name, p.name AS property_name, p.address " +
                "FROM contracts c " +
                "JOIN rooms r ON c.room_id = r.id " +
                "JOIN properties p ON r.property_id = p.id " +
                "WHERE c.tenant_id = ?"
        );
        List<Object> queryParams = new ArrayList<>();
        queryParams.add(userId);
        Map<String, Object> params = intentData.getParams();

        if (params != null && params.containsKey("contract_status")) {
            sql.append(" AND c.status = ?");
            queryParams.add(params.get("contract_status").toString());
        }
        sql.append(" ORDER BY c.start_date DESC LIMIT 10");
        return jdbcTemplate.queryForList(sql.toString(), queryParams.toArray());
    }

    // ========================================================================
    // TENANT: Xem lịch hẹn xem phòng
    // Nghiệp vụ: Lịch hẹn có tenant_id trực tiếp. Kèm thông tin phòng
    // và meeting_link để khách có thể tham gia ngay.
    // ========================================================================
    private List<Map<String, Object>> handleViewAppointment(IntentExtractionResult intentData, Long userId, String role) {
        StringBuilder sql = new StringBuilder(
                "SELECT a.id AS appointment_id, a.meet_time, a.status, a.note, a.meeting_link, " +
                "r.name AS room_name, p.address " +
                "FROM appointments a " +
                "JOIN rooms r ON a.room_id = r.id " +
                "JOIN properties p ON r.property_id = p.id " +
                "WHERE a.tenant_id = ?"
        );
        List<Object> queryParams = new ArrayList<>();
        queryParams.add(userId);
        Map<String, Object> params = intentData.getParams();

        if (params != null && params.containsKey("time_scope")) {
            String scope = params.get("time_scope").toString().toUpperCase();
            switch (scope) {
                case "TODAY":
                    sql.append(" AND DATE(a.meet_time) = CURRENT_DATE");
                    break;
                case "UPCOMING":
                    sql.append(" AND a.meet_time >= NOW() AND a.status IN ('PENDING', 'APPROVED')");
                    break;
                case "PAST":
                    sql.append(" AND a.meet_time < NOW()");
                    break;
            }
        }
        sql.append(" ORDER BY a.meet_time DESC LIMIT 10");
        return jdbcTemplate.queryForList(sql.toString(), queryParams.toArray());
    }

    // ========================================================================
    // LANDLORD: Xem doanh thu
    // Nghiệp vụ SỐNG CÒN: Doanh thu = CHỈ tính hóa đơn đã PAID.
    // Tuyệt đối không được cộng gộp hóa đơn UNPAID/LATE/PENDING vào.
    // JOIN chuỗi: bills → contracts → rooms → properties (lọc landlord_id).
    // ========================================================================
    private List<Map<String, Object>> handleViewRevenue(IntentExtractionResult intentData, Long userId, String role) {
        StringBuilder sql = new StringBuilder(
                "SELECT SUM(b.total_amount) AS total_revenue, " +
                "COUNT(b.id) AS total_paid_bills, " +
                "b.month, b.year " +
                "FROM bills b " +
                "JOIN contracts c ON b.contract_id = c.id " +
                "JOIN rooms r ON c.room_id = r.id " +
                "JOIN properties p ON r.property_id = p.id " +
                "WHERE p.landlord_id = ? AND b.status = 'PAID'"
        );
        List<Object> queryParams = new ArrayList<>();
        queryParams.add(userId);
        Map<String, Object> params = intentData.getParams();

        int targetMonth = LocalDate.now().getMonthValue();
        int targetYear = LocalDate.now().getYear();

        if (params != null) {
            if (params.containsKey("month")) targetMonth = toInt(params.get("month"));
            if (params.containsKey("year")) targetYear = toInt(params.get("year"));
        }

        sql.append(" AND b.month = ? AND b.year = ?");
        queryParams.add(targetMonth);
        queryParams.add(targetYear);
        sql.append(" GROUP BY b.month, b.year");

        return jdbcTemplate.queryForList(sql.toString(), queryParams.toArray());
    }

    // ========================================================================
    // LANDLORD: Xem danh sách khách nợ tiền
    // Nghiệp vụ: Nợ = bills.status IN ('UNPAID', 'LATE').
    // Hiển thị tên khách, SĐT, tên phòng, số tiền nợ để chủ trọ liên hệ.
    // JOIN chuỗi: bills → contracts → users (lấy tên khách) + rooms + properties.
    // ========================================================================
    private List<Map<String, Object>> handleViewDebtors(IntentExtractionResult intentData, Long userId, String role) {
        String sql =
                "SELECT u.full_name AS tenant_name, u.phone_number, " +
                "r.name AS room_name, p.name AS property_name, " +
                "b.month, b.year, b.total_amount, b.status AS bill_status, b.deadline " +
                "FROM bills b " +
                "JOIN contracts c ON b.contract_id = c.id " +
                "JOIN rooms r ON c.room_id = r.id " +
                "JOIN properties p ON r.property_id = p.id " +
                "JOIN users u ON c.tenant_id = u.id " +
                "WHERE p.landlord_id = ? AND c.status = 'ACTIVE' AND b.status IN ('UNPAID', 'LATE') " +
                "ORDER BY b.deadline ASC";
        return jdbcTemplate.queryForList(sql, userId);
    }

    // ========================================================================
    // LANDLORD: Xem tỷ lệ lấp đầy phòng
    // Nghiệp vụ: Đếm số phòng theo từng trạng thái (AVAILABLE, RENTED,
    // MAINTENANCE, RESERVED) để chủ biết tổng quan "sức khỏe" tài sản.
    // Có thể lọc theo tên khu trọ cụ thể nếu chủ có nhiều khu.
    // ========================================================================
    private List<Map<String, Object>> handleViewOccupancy(IntentExtractionResult intentData, Long userId, String role) {
        StringBuilder sql = new StringBuilder(
                "SELECT p.name AS property_name, r.status AS room_status, COUNT(r.id) AS room_count " +
                "FROM rooms r " +
                "JOIN properties p ON r.property_id = p.id " +
                "WHERE p.landlord_id = ?"
        );
        List<Object> queryParams = new ArrayList<>();
        queryParams.add(userId);
        Map<String, Object> params = intentData.getParams();

        if (params != null && params.containsKey("property_name")) {
            sql.append(" AND p.name LIKE ?");
            queryParams.add("%" + params.get("property_name") + "%");
        }
        sql.append(" GROUP BY p.name, r.status ORDER BY p.name, r.status");
        return jdbcTemplate.queryForList(sql.toString(), queryParams.toArray());
    }

    // ========================================================================
    // LANDLORD: Cảnh báo hợp đồng sắp hết hạn (Rủi ro trống phòng)
    // Nghiệp vụ: Chỉ xét hợp đồng ACTIVE có end_date trong vòng N ngày tới
    // (mặc định 30 ngày). Hiển thị tên khách + SĐT để chủ trọ liên hệ gia hạn.
    // ========================================================================
    private List<Map<String, Object>> handleViewRisk(IntentExtractionResult intentData, Long userId, String role) {
        int daysAhead = 30;
        Map<String, Object> params = intentData.getParams();
        if (params != null && params.containsKey("days_ahead")) {
            daysAhead = toInt(params.get("days_ahead"));
        }

        String sql =
                "SELECT c.id AS contract_id, c.end_date, " +
                "DATEDIFF(c.end_date, CURRENT_DATE) AS days_remaining, " +
                "u.full_name AS tenant_name, u.phone_number, " +
                "r.name AS room_name, p.name AS property_name " +
                "FROM contracts c " +
                "JOIN rooms r ON c.room_id = r.id " +
                "JOIN properties p ON r.property_id = p.id " +
                "JOIN users u ON c.tenant_id = u.id " +
                "WHERE p.landlord_id = ? AND c.status = 'ACTIVE' " +
                "AND c.end_date BETWEEN CURRENT_DATE AND DATE_ADD(CURRENT_DATE, INTERVAL ? DAY) " +
                "ORDER BY c.end_date ASC";
        return jdbcTemplate.queryForList(sql, userId, daysAhead);
    }

    // ========================================================================
    // Utility: Chuyển đổi kiểu an toàn (LLM đôi khi trả Number dạng String)
    // ========================================================================
    private double toDouble(Object obj) {
        if (obj instanceof Number) return ((Number) obj).doubleValue();
        try { return Double.parseDouble(obj.toString()); } catch (Exception e) { return 0; }
    }

    private int toInt(Object obj) {
        if (obj instanceof Number) return ((Number) obj).intValue();
        try { return Integer.parseInt(obj.toString()); } catch (Exception e) { return 0; }
    }
}

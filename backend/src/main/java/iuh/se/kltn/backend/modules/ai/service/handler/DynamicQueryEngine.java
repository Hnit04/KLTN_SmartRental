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
    // GUEST: TĂ¬m phĂ²ng trá» cĂ´ng khai
    // Nghiá»‡p vá»¥: Chá»‰ hiá»ƒn thá»‹ phĂ²ng AVAILABLE thuá»™c khu trá» Ä‘Ă£ APPROVED.
    // ========================================================================
    private List<Map<String, Object>> handleSearchRoom(IntentExtractionResult intentData, Long userId, String role) {
        StringBuilder sql = new StringBuilder(
                "SELECT r.id AS room_id, r.name, r.price, r.area, r.type, r.images, " +
                "r.has_mezzanine, r.has_balcony, r.max_occupants, r.current_occupants, " +
                "r.amenities, r.default_terms, r.description, " +
                "p.name AS property_name, p.address, p.district, " +
                "p.elec_price AS elecPrice, p.water_price AS waterPrice, p.internet_price AS internetPrice " +
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
            if (params.containsKey("has_mezzanine") && Boolean.TRUE.equals(toBoolean(params.get("has_mezzanine")))) {
                sql.append(" AND r.has_mezzanine = TRUE");
            }
            if (params.containsKey("has_balcony") && Boolean.TRUE.equals(toBoolean(params.get("has_balcony")))) {
                sql.append(" AND r.has_balcony = TRUE");
            }
            // Sá»‘ ngÆ°á»i á»Ÿ: lá»c phĂ²ng cĂ³ max_occupants >= sá»‘ ngÆ°á»i yĂªu cáº§u
            Object occupantsParam = firstPresent(params, "occupants", "required_occupants", "people", "persons", "max_occupants");
            if (occupantsParam != null) {
                int occupants = toInt(occupantsParam);
                if (occupants > 0) {
                    sql.append(" AND (r.max_occupants IS NULL OR r.max_occupants >= ?)");
                    queryParams.add(occupants);
                }
            }
            // Cho nuĂ´i thĂº cÆ°ng: text-search default_terms, description, amenities
            Object petParam = firstPresent(params, "pet_friendly", "allow_pets", "petAllowed", "has_pet");
            if (petParam != null && toBoolean(petParam)) {
                sql.append(" AND (" +
                        "LOWER(COALESCE(r.default_terms,'')) LIKE '%cho nuĂ´i thĂº cÆ°ng%' OR " +
                        "LOWER(COALESCE(r.default_terms,'')) LIKE '%cho nuoi thu cung%' OR " +
                        "LOWER(COALESCE(r.description,'')) LIKE '%cho nuĂ´i thĂº cÆ°ng%' OR " +
                        "LOWER(COALESCE(r.description,'')) LIKE '%cho nuoi thu cung%' OR " +
                        "LOWER(COALESCE(r.amenities,'')) LIKE '%pet friendly%'" +
                        ") AND LOWER(COALESCE(r.default_terms,'')) NOT LIKE '%khĂ´ng cho nuĂ´i thĂº cÆ°ng%'" +
                        " AND LOWER(COALESCE(r.default_terms,'')) NOT LIKE '%khong cho nuoi thu cung%'" +
                        " AND LOWER(COALESCE(r.description,'')) NOT LIKE '%khĂ´ng cho nuĂ´i thĂº cÆ°ng%'" +
                        " AND LOWER(COALESCE(r.description,'')) NOT LIKE '%khong cho nuoi thu cung%'");
            }
        }
        sql.append(" ORDER BY r.price ASC LIMIT 10");
        return jdbcTemplate.queryForList(sql.toString(), queryParams.toArray());
    }

    // ========================================================================
    // TENANT: Xem hĂ³a Ä‘Æ¡n cá»§a chĂ­nh mĂ¬nh
    // Nghiá»‡p vá»¥: bills KHĂ”NG cĂ³ tenant_id â†’ Báº®T BUá»˜C JOIN qua contracts.
    // Hiá»ƒn thá»‹ thĂ´ng tin phĂ²ng kĂ¨m theo Ä‘á»ƒ khĂ¡ch biáº¿t hĂ³a Ä‘Æ¡n thuá»™c phĂ²ng nĂ o.
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
    // TENANT: Xem ná»£ chÆ°a Ä‘Ă³ng
    // Nghiá»‡p vá»¥: Ná»£ = hĂ³a Ä‘Æ¡n cĂ³ status UNPAID hoáº·c LATE.
    // ÄĂ¢y lĂ  tĂ­nh nÄƒng cáº£nh bĂ¡o nĂªn hiá»ƒn thá»‹ thĂªm deadline vĂ  tiá»n pháº¡t.
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
    // TENANT: Xem há»£p Ä‘á»“ng
    // Nghiá»‡p vá»¥: Hiá»ƒn thá»‹ giĂ¡ thuĂª thá»±c táº¿ (actual_price), tiá»n cá»c, ngĂ y
    // háº¿t háº¡n, tráº¡ng thĂ¡i kĂ½. Náº¿u khĂ¡ch há»i "há»£p Ä‘á»“ng cĂ²n bao lĂ¢u" thĂ¬
    // PostgreSQL date subtraction sáº½ tráº£ vá» sá»‘ ngĂ y cĂ²n láº¡i ráº¥t trá»±c quan.
    // ========================================================================
    private List<Map<String, Object>> handleViewContract(IntentExtractionResult intentData, Long userId, String role) {
        StringBuilder sql = new StringBuilder(
                "SELECT c.id AS contract_id, c.actual_price, c.deposit_amount, " +
                "c.start_date, c.end_date, c.status, c.is_tenant_signed, c.is_landlord_signed, " +
                "(c.end_date - CURRENT_DATE) AS days_remaining, " +
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
    // TENANT: Xem lá»‹ch háº¹n xem phĂ²ng
    // Nghiá»‡p vá»¥: Lá»‹ch háº¹n cĂ³ tenant_id trá»±c tiáº¿p. KĂ¨m thĂ´ng tin phĂ²ng
    // vĂ  meeting_link Ä‘á»ƒ khĂ¡ch cĂ³ thá»ƒ tham gia ngay.
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
    // Nghiá»‡p vá»¥ Sá»NG CĂ’N: Doanh thu = CHá»ˆ tĂ­nh hĂ³a Ä‘Æ¡n Ä‘Ă£ PAID.
    // Tuyá»‡t Ä‘á»‘i khĂ´ng Ä‘Æ°á»£c cá»™ng gá»™p hĂ³a Ä‘Æ¡n UNPAID/LATE/PENDING vĂ o.
    // JOIN chuá»—i: bills â†’ contracts â†’ rooms â†’ properties (lá»c landlord_id).
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
    // LANDLORD: Xem danh sĂ¡ch khĂ¡ch ná»£ tiá»n
    // Nghiá»‡p vá»¥: Ná»£ = bills.status IN ('UNPAID', 'LATE').
    // Hiá»ƒn thá»‹ tĂªn khĂ¡ch, SÄT, tĂªn phĂ²ng, sá»‘ tiá»n ná»£ Ä‘á»ƒ chá»§ trá» liĂªn há»‡.
    // JOIN chuá»—i: bills â†’ contracts â†’ users (láº¥y tĂªn khĂ¡ch) + rooms + properties.
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
    // LANDLORD: Xem tá»· lá»‡ láº¥p Ä‘áº§y phĂ²ng
    // Nghiá»‡p vá»¥: Äáº¿m sá»‘ phĂ²ng theo tá»«ng tráº¡ng thĂ¡i (AVAILABLE, RENTED,
    // MAINTENANCE, RESERVED) Ä‘á»ƒ chá»§ biáº¿t tá»•ng quan "sá»©c khá»e" tĂ i sáº£n.
    // CĂ³ thá»ƒ lá»c theo tĂªn khu trá» cá»¥ thá»ƒ náº¿u chá»§ cĂ³ nhiá»u khu.
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
    // LANDLORD: Cáº£nh bĂ¡o há»£p Ä‘á»“ng sáº¯p háº¿t háº¡n (Rá»§i ro trá»‘ng phĂ²ng)
    // Nghiá»‡p vá»¥: Chá»‰ xĂ©t há»£p Ä‘á»“ng ACTIVE cĂ³ end_date trong vĂ²ng N ngĂ y tá»›i
    // (máº·c Ä‘á»‹nh 30 ngĂ y). Hiá»ƒn thá»‹ tĂªn khĂ¡ch + SÄT Ä‘á»ƒ chá»§ trá» liĂªn há»‡ gia háº¡n.
    // ========================================================================
    private List<Map<String, Object>> handleViewRisk(IntentExtractionResult intentData, Long userId, String role) {
        int daysAhead = 30;
        Map<String, Object> params = intentData.getParams();
        if (params != null && params.containsKey("days_ahead")) {
            daysAhead = toInt(params.get("days_ahead"));
        }

        String sql =
                "SELECT c.id AS contract_id, c.end_date, " +
                "(c.end_date - CURRENT_DATE) AS days_remaining, " +
                "u.full_name AS tenant_name, u.phone_number, " +
                "r.name AS room_name, p.name AS property_name " +
                "FROM contracts c " +
                "JOIN rooms r ON c.room_id = r.id " +
                "JOIN properties p ON r.property_id = p.id " +
                "JOIN users u ON c.tenant_id = u.id " +
                "WHERE p.landlord_id = ? AND c.status = 'ACTIVE' " +
                "AND c.end_date BETWEEN CURRENT_DATE AND (CURRENT_DATE + CAST(? || ' days' AS INTERVAL)) " +
                "ORDER BY c.end_date ASC";
        return jdbcTemplate.queryForList(sql, userId, daysAhead);
    }

    // ========================================================================
    // Utility: Chuyá»ƒn Ä‘á»•i kiá»ƒu an toĂ n (LLM Ä‘Ă´i khi tráº£ Number dáº¡ng String)
    // ========================================================================
    private double toDouble(Object obj) {
        if (obj instanceof Number) return ((Number) obj).doubleValue();
        try { return Double.parseDouble(obj.toString()); } catch (Exception e) { return 0; }
    }

    private int toInt(Object obj) {
        if (obj instanceof Number) return ((Number) obj).intValue();
        try { return Integer.parseInt(obj.toString()); } catch (Exception e) { return 0; }
    }

    private boolean toBoolean(Object obj) {
        if (obj instanceof Boolean) return (Boolean) obj;
        if (obj == null) return false;
        String text = obj.toString().trim().toLowerCase();
        return text.equals("true") || text.equals("yes") || text.equals("1");
    }

    private Object firstPresent(Map<String, Object> params, String... keys) {
        for (String key : keys) {
            if (params.containsKey(key) && params.get(key) != null) {
                return params.get(key);
            }
        }
        return null;
    }
}

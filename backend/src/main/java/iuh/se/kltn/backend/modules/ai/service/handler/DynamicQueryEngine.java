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
        handlers.put(SystemIntent.VIEW_ROOM_DETAIL, this::handleViewRoomDetail);

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
    // VIEW_ROOM_DETAIL: Xem chi tiết 1 phòng cụ thể
    // ========================================================================
    private List<Map<String, Object>> handleViewRoomDetail(IntentExtractionResult intentData, Long userId, String role) {
        Map<String, Object> params = intentData.getParams();
        Long roomId = null;
        if (params != null && params.containsKey("roomId")) {
            roomId = Long.valueOf(params.get("roomId").toString());
        }
        
        if (roomId == null) {
            throw new IllegalArgumentException("Thiếu roomId để xem chi tiết phòng.");
        }

        String sql = "SELECT r.id AS room_id, r.name, r.price, r.area, r.type, r.images, " +
                "r.has_mezzanine, r.has_balcony, r.max_occupants, r.current_occupants, " +
                "r.amenities, r.default_terms, r.description, r.status, " +
                "p.name AS property_name, p.address, p.district, p.city, " +
                "p.elec_price AS elecPrice, p.water_price AS waterPrice, p.internet_price AS internetPrice " +
                "FROM rooms r JOIN properties p ON r.property_id = p.id WHERE r.id = ?";
                
        return jdbcTemplate.queryForList(sql, roomId);
    }

    // ========================================================================
    // GUEST: Tìm phòng trọ công khai
    // Chỉ hiển thị phòng AVAILABLE thuộc khu trọ đã APPROVED.
    // ========================================================================
    private List<Map<String, Object>> handleSearchRoom(IntentExtractionResult intentData, Long userId, String role) {
        Map<String, Object> params = intentData.getParams();
        List<Object> queryParams = new ArrayList<>();

        Double lat = null;
        Double lng = null;
        if (params != null) {
            lat = toNullableDouble(firstPresent(params, "lat", "latitude"));
            lng = toNullableDouble(firstPresent(params, "lng", "longitude"));
        }

        boolean hasGeoContext = hasValidCoordinates(lat, lng);
        String distanceExpr = "(6371 * ACOS(LEAST(1.0, COS(RADIANS(?)) * COS(RADIANS(p.latitude)) * COS(RADIANS(p.longitude) - RADIANS(?)) + SIN(RADIANS(?)) * SIN(RADIANS(p.latitude)))))";

        StringBuilder sql = new StringBuilder(
                "SELECT r.id AS room_id, r.name, r.price, r.area, r.type, r.images, " +
                "r.has_mezzanine, r.has_balcony, r.max_occupants, r.current_occupants, " +
                "r.amenities, r.default_terms, r.description, " +
                "p.name AS property_name, p.address, p.district, " +
                "p.elec_price AS elecPrice, p.water_price AS waterPrice, p.internet_price AS internetPrice"
        );

        if (hasGeoContext) {
            sql.append(", ").append(distanceExpr).append(" AS distance_km");
            queryParams.add(lat);
            queryParams.add(lng);
            queryParams.add(lat);
        }

        sql.append(" FROM rooms r JOIN properties p ON r.property_id = p.id WHERE r.status = 'AVAILABLE' AND p.status = 'APPROVED'");

        if (params != null) {
            if (params.containsKey("roomId")) {
                sql.append(" AND r.id = ?");
                queryParams.add(toInt(params.get("roomId")));
            }
            if (params.containsKey("propertyId")) {
                sql.append(" AND p.id = ?");
                queryParams.add(toInt(params.get("propertyId")));
            }
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
            // Số người ở: lọc phòng có max_occupants >= số người yêu cầu
            Object occupantsParam = firstPresent(params, "occupants", "required_occupants", "people", "persons", "max_occupants");
            if (occupantsParam != null) {
                int occupants = toInt(occupantsParam);
                if (occupants > 0) {
                    sql.append(" AND (r.max_occupants IS NULL OR r.max_occupants >= ?)");
                    queryParams.add(occupants);
                }
            }
            // Pet friendly: text-search default_terms, description, amenities
            Object petParam = firstPresent(params, "pet_friendly", "allow_pets", "petAllowed", "has_pet");
            if (petParam != null && toBoolean(petParam)) {
                sql.append(" AND (" +
                        "LOWER(COALESCE(r.default_terms,'')) LIKE '%cho nuoi thu cung%' OR " +
                        "LOWER(COALESCE(r.description,'')) LIKE '%cho nuoi thu cung%' OR " +
                        "LOWER(COALESCE(r.amenities,'')) LIKE '%pet friendly%'" +
                        ") AND LOWER(COALESCE(r.default_terms,'')) NOT LIKE '%khong cho nuoi thu cung%'" +
                        " AND LOWER(COALESCE(r.description,'')) NOT LIKE '%khong cho nuoi thu cung%'");
            }

            if (hasGeoContext) {
                sql.append(" AND p.latitude IS NOT NULL AND p.longitude IS NOT NULL");
                Double radiusKm = toNullableDouble(firstPresent(params, "radiusKm", "radius_km", "radius"));
                if (radiusKm != null && radiusKm > 0) {
                    sql.append(" AND ").append(distanceExpr).append(" <= ?");
                    queryParams.add(lat);
                    queryParams.add(lng);
                    queryParams.add(lat);
                    queryParams.add(radiusKm);
                }
            }
        }

        String sortMode = params == null || !params.containsKey("sort")
                ? null
                : String.valueOf(params.get("sort"));
        if (hasGeoContext && "PRICE_ASC_WITH_DISTANCE".equalsIgnoreCase(sortMode)) {
            sql.append(" ORDER BY r.price ASC, distance_km ASC");
        } else if (hasGeoContext && "NEAREST_THEN_PRICE".equalsIgnoreCase(sortMode)) {
            sql.append(" ORDER BY distance_km ASC, r.price ASC");
        } else {
            sql.append(" ORDER BY r.price ASC");
        }
        sql.append(" LIMIT 10");
        return jdbcTemplate.queryForList(sql.toString(), queryParams.toArray());
    }

    // ========================================================================
    // TENANT: Xem hóa đơn của chính mình
    // bills KHÔNG có tenant_id -> BẮT BUỘC JOIN qua contracts.
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
            if (params.containsKey("billId")) {
                sql.append(" AND b.id = ?");
                queryParams.add(toInt(params.get("billId")));
            }
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
    // Nợ = hóa đơn có status UNPAID hoặc LATE.
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
    // Hiển thị giá thuê thực tế (actual_price), tiền cọc, ngày hết hạn,
    // trạng thái ký. Nếu khách hỏi "hợp đồng còn bao lâu" thì
    // PostgreSQL date subtraction sẽ trả về số ngày còn lại rất trực quan.
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

        if (params != null) {
            if (params.containsKey("contractId")) {
                sql.append(" AND c.id = ?");
                queryParams.add(toInt(params.get("contractId")));
            }
            if (params.containsKey("contract_status")) {
                sql.append(" AND c.status = ?");
                queryParams.add(params.get("contract_status").toString());
            }
        }
        sql.append(" ORDER BY c.start_date DESC LIMIT 10");
        return jdbcTemplate.queryForList(sql.toString(), queryParams.toArray());
    }

    // ========================================================================
    // TENANT: Xem lịch hẹn xem phòng
    // Lịch hẹn có tenant_id trực tiếp. Kèm thông tin phòng
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
    // SỐNG CÒN: Doanh thu = CHỈ tính hóa đơn đã PAID.
    // Tuyệt đối không được cộng gộp hóa đơn UNPAID/LATE/PENDING vào.
    // JOIN chuỗi: bills -> contracts -> rooms -> properties (lọc landlord_id).
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
    // LANDLORD: Xem danh sach khach no tien
    // No = bills.status IN ('UNPAID', 'LATE').
    // Hien thi ten khach, SDT, ten phong, so tien no de chu tro lien he.
    // JOIN chuoi: bills -> contracts -> users (lay ten khach) + rooms + properties.
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
    // LANDLORD: Xem ty le lap day phong
    // Đếm số phòng theo từng trạng thái (AVAILABLE, RENTED, MAINTENANCE,
    // RESERVED) de chu biet tong quan "suc khoe" tai san.
    // Co the loc theo ten khu tro cu the neu chu co nhieu khu.
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

        if (params != null) {
            if (params.containsKey("propertyId")) {
                sql.append(" AND p.id = ?");
                queryParams.add(toInt(params.get("propertyId")));
            }
            if (params.containsKey("property_name")) {
                sql.append(" AND p.name LIKE ?");
                queryParams.add("%" + params.get("property_name") + "%");
            }
        }
        sql.append(" GROUP BY p.name, r.status ORDER BY p.name, r.status");
        return jdbcTemplate.queryForList(sql.toString(), queryParams.toArray());
    }

    // ========================================================================
    // LANDLORD: Canh bao hop dong sap het han (Rui ro trong phong)
    // Chi xet hop dong ACTIVE co end_date trong vong N ngay toi
    // (mac dinh 30 ngay). Hien thi ten khach + SDT de chu tro lien he gia han.
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
    // Utility: Chuyen doi kieu an toan (LLM doi khi tra Number dang String)
    // ========================================================================
    private double toDouble(Object obj) {
        if (obj instanceof Number) return ((Number) obj).doubleValue();
        try { return Double.parseDouble(obj.toString()); } catch (Exception e) { return 0; }
    }

    private Double toNullableDouble(Object obj) {
        if (obj == null) {
            return null;
        }
        if (obj instanceof Number number) {
            return number.doubleValue();
        }
        try {
            return Double.parseDouble(obj.toString());
        } catch (Exception e) {
            return null;
        }
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

    private boolean hasValidCoordinates(Double lat, Double lng) {
        if (lat == null || lng == null) {
            return false;
        }
        if (lat.isNaN() || lng.isNaN() || lat.isInfinite() || lng.isInfinite()) {
            return false;
        }
        return lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180;
    }
}

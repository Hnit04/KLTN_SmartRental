package iuh.se.kltn.backend.modules.ai.service;

import org.springframework.stereotype.Service;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.HashSet;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Set;

@Service
public class PresenterDataSanitizer {

    private static final Set<String> SENSITIVE_EXACT_KEYS = Set.of(
            "phone",
            "phone_number",
            "email",
            "meeting_link",
            "wallet_address",
            "identity_number",
            "cccd",
            "bank_account",
            "bank_name",
            "bank_number",
            "account_number",
            "citizen_id"
    );

    private static final Set<String> SENSITIVE_PARTIAL_KEYS = Set.of(
            "phone",
            "email",
            "meeting",
            "wallet",
            "identity",
            "cccd",
            "citizen",
            "bank",
            "account"
    );

    public List<Map<String, Object>> sanitize(String intent, String role, List<Map<String, Object>> results) {
        if (results == null || results.isEmpty()) {
            return results;
        }

        String safeIntent = normalizeToken(intent);
        String safeRole = normalizeToken(role);
        Set<String> allowedFields = getAllowedFields(safeIntent, safeRole);

        if (allowedFields == null) {
            return defaultSanitize(results);
        }

        List<Map<String, Object>> sanitizedList = new ArrayList<>();
        for (Map<String, Object> row : results) {
            Map<String, Object> safeRow = new HashMap<>();
            if (row == null || row.isEmpty()) {
                sanitizedList.add(safeRow);
                continue;
            }

            for (Map.Entry<String, Object> entry : row.entrySet()) {
                String rawKey = entry.getKey();
                if (rawKey == null) {
                    continue;
                }
                String normalizedKey = normalizeKey(rawKey);
                if (!allowedFields.contains(normalizedKey)) {
                    continue;
                }
                if (isSensitiveField(normalizedKey) && !isSensitiveFieldAllowedForContext(safeIntent, safeRole, normalizedKey)) {
                    continue;
                }
                safeRow.put(rawKey, entry.getValue());
            }
            sanitizedList.add(safeRow);
        }
        return sanitizedList;
    }

    private Set<String> getAllowedFields(String intent, String role) {
        if ("VIEW_DEBTORS".equals(intent)) {
            return normalizeAllowlist(Set.of(
                    "tenant_name", "room_name", "month", "year", "total_amount", "status", "deadline"
            ));
        }
        if ("VIEW_BILL".equals(intent)) {
            return normalizeAllowlist(Set.of(
                    "room_name", "month", "year", "total_amount", "status", "deadline", "paid_at"
            ));
        }
        if ("VIEW_CONTRACT".equals(intent)) {
            return normalizeAllowlist(Set.of(
                    "room_name", "status", "start_date", "end_date", "deposit_amount"
            ));
        }
        if ("SEARCH_ROOM".equals(intent) || "LOCATION_SEARCH".equals(intent)) {
            return normalizeAllowlist(Set.of(
                    "room_id", "room_name", "name", "price", "area", "district", "ward", "image_url",
                    "images", "distance_km", "amenities", "pet_friendly"
            ));
        }
        if ("VIEW_DEBT".equals(intent)) {
            return normalizeAllowlist(Set.of(
                    "room_name", "month", "year", "total_amount", "deadline"
            ));
        }
        if ("VIEW_OCCUPANCY".equals(intent)) {
            return normalizeAllowlist(Set.of(
                    "total_rooms", "occupied_rooms", "maintenance_rooms", "occupancy_rate"
            ));
        }
        if ("VIEW_REVENUE".equals(intent)) {
            return normalizeAllowlist(Set.of(
                    "month", "year", "total_revenue", "paid_amount", "unpaid_amount"
            ));
        }
        if ("VIEW_APPOINTMENT".equals(intent)) {
            Set<String> fields = new HashSet<>(normalizeAllowlist(Set.of(
                    "id", "appointment_id", "room_id", "room_name", "tenant_name", "landlord_name",
                    "meet_time", "status", "created_at", "updated_at", "note", "notes"
            )));
            if ("TENANT".equals(role) || "LANDLORD".equals(role)) {
                fields.add("meeting_link");
            }
            return fields;
        }
        if ("VIEW_RISK".equals(intent)) {
            return normalizeAllowlist(Set.of(
                    "room_id", "room_name", "tenant_name", "contract_id", "end_date",
                    "days_remaining", "risk_level", "risk_reason", "status"
            ));
        }
        return null;
    }

    private List<Map<String, Object>> defaultSanitize(List<Map<String, Object>> results) {
        List<Map<String, Object>> sanitizedList = new ArrayList<>();
        for (Map<String, Object> row : results) {
            Map<String, Object> safeRow = new HashMap<>();
            if (row == null || row.isEmpty()) {
                sanitizedList.add(safeRow);
                continue;
            }
            for (Map.Entry<String, Object> entry : row.entrySet()) {
                String key = entry.getKey();
                if (key == null) {
                    continue;
                }
                if (isSensitiveField(normalizeKey(key))) {
                    continue;
                }
                safeRow.put(key, entry.getValue());
            }
            sanitizedList.add(safeRow);
        }
        return sanitizedList;
    }

    private boolean isSensitiveFieldAllowedForContext(String intent, String role, String normalizedKey) {
        if (!"meeting_link".equals(normalizedKey)) {
            return false;
        }
        return "VIEW_APPOINTMENT".equals(intent) && ("TENANT".equals(role) || "LANDLORD".equals(role));
    }

    private boolean isSensitiveField(String normalizedKey) {
        if (normalizedKey == null || normalizedKey.isBlank()) {
            return false;
        }
        if (SENSITIVE_EXACT_KEYS.contains(normalizedKey)) {
            return true;
        }
        for (String token : SENSITIVE_PARTIAL_KEYS) {
            if (normalizedKey.contains(token)) {
                return true;
            }
        }
        return false;
    }

    private Set<String> normalizeAllowlist(Set<String> fields) {
        Set<String> normalized = new HashSet<>();
        for (String field : fields) {
            if (field == null || field.isBlank()) {
                continue;
            }
            normalized.add(normalizeKey(field));
        }
        return normalized;
    }

    private String normalizeToken(String value) {
        return value == null ? "" : value.trim().toUpperCase(Locale.ROOT);
    }

    private String normalizeKey(String key) {
        return key == null ? "" : key.trim().toLowerCase(Locale.ROOT);
    }
}

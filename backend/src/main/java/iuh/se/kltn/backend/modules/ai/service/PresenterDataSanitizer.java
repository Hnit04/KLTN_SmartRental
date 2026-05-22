/*
 * Decompiled with CFR 0.152.
 * 
 * Could not load the following classes:
 *  org.springframework.stereotype.Service
 */
package iuh.se.kltn.backend.modules.ai.service;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;
import org.springframework.stereotype.Service;

@Service
public class PresenterDataSanitizer {
    public List<Map<String, Object>> sanitize(String intent, String role, List<Map<String, Object>> results) {
        if (results == null || results.isEmpty()) {
            return results;
        }
        Set<String> allowedFields = this.getAllowedFields(intent);
        if (allowedFields == null) {
            return this.defaultSanitize(results);
        }
        ArrayList<Map<String, Object>> sanitizedList = new ArrayList<Map<String, Object>>();
        for (Map<String, Object> row : results) {
            HashMap<String, Object> safeRow = new HashMap<String, Object>();
            for (String field : allowedFields) {
                if (!row.containsKey(field)) continue;
                safeRow.put(field, row.get(field));
            }
            sanitizedList.add(safeRow);
        }
        return sanitizedList;
    }

    private Set<String> getAllowedFields(String intent) {
        if ("VIEW_DEBTORS".equalsIgnoreCase(intent)) {
            return Set.of("tenant_name", "room_name", "month", "year", "total_amount", "status", "deadline");
        }
        if ("VIEW_BILL".equalsIgnoreCase(intent)) {
            return Set.of("room_name", "month", "year", "total_amount", "status", "deadline", "paid_at");
        }
        if ("VIEW_CONTRACT".equalsIgnoreCase(intent)) {
            return Set.of("room_name", "status", "start_date", "end_date", "deposit_amount");
        }
        if ("SEARCH_ROOM".equalsIgnoreCase(intent) || "LOCATION_SEARCH".equalsIgnoreCase(intent)) {
            return Set.of("room_id", "room_name", "name", "price", "area", "district", "ward", "image_url", "images", "distance_km", "amenities", "pet_friendly");
        }
        if ("VIEW_DEBT".equalsIgnoreCase(intent)) {
            return Set.of("room_name", "month", "year", "total_amount", "deadline");
        }
        if ("VIEW_OCCUPANCY".equalsIgnoreCase(intent)) {
            return Set.of("total_rooms", "occupied_rooms", "maintenance_rooms", "occupancy_rate");
        }
        if ("VIEW_REVENUE".equalsIgnoreCase(intent)) {
            return Set.of("month", "year", "total_revenue", "paid_amount", "unpaid_amount");
        }
        return null;
    }

    private List<Map<String, Object>> defaultSanitize(List<Map<String, Object>> results) {
        ArrayList<Map<String, Object>> sanitizedList = new ArrayList<Map<String, Object>>();
        for (Map<String, Object> row : results) {
            HashMap<String, Object> safeRow = new HashMap<String, Object>(row);
            safeRow.remove("phone_number");
            safeRow.remove("email");
            safeRow.remove("meeting_link");
            safeRow.remove("wallet_address");
            safeRow.remove("identity_number");
            safeRow.remove("bank_account");
            sanitizedList.add(safeRow);
        }
        return sanitizedList;
    }
}

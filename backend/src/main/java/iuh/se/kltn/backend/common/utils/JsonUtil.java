package iuh.se.kltn.backend.common.utils;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;

import java.util.Collections;
import java.util.List;

public class JsonUtil {
    private static final ObjectMapper mapper = new ObjectMapper();

    // Chuyển List -> JSON String lưu xuống DB
    public static String convertListToJson(List<String> list) {
        try {
            if (list == null) return "[]";
            return mapper.writeValueAsString(list);
        } catch (JsonProcessingException e) {
            return "[]";

        }
    }

    // Chuyển JSON String -> List trả về Frontend
    public static List<String> convertJsonToList(String json) {
        try {
            if (json == null || json.isEmpty()) return Collections.emptyList();
            return mapper.readValue(json, new TypeReference<List<String>>() {});
        } catch (JsonProcessingException e) {
            return Collections.emptyList();
        }
    }
}
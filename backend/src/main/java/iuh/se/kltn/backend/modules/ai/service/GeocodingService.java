package iuh.se.kltn.backend.modules.ai.service;

import org.springframework.core.io.ClassPathResource;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;

import jakarta.annotation.PostConstruct;
import java.io.InputStream;
import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;
import java.util.ArrayList;
import java.util.List;
import java.util.stream.Collectors;

/**
 * Service chuyển đổi tên địa điểm (landmark) sang tọa độ (lat/lng).
 * Ưu tiên bảng tra cứu nội bộ TPHCM (JSON Seed) → fallback Nominatim (OpenStreetMap API miễn phí).
 */
@Service
public class GeocodingService {

    private final RestTemplate restTemplate = new RestTemplate();
    private final ObjectMapper objectMapper = new ObjectMapper();

    public static class LocationEntry {
        public String name;
        public List<String> aliases;
        public double latitude;
        public double longitude;
    }

    private final List<LocationEntry> locations = new ArrayList<>();

    @PostConstruct
    public void init() {
        try {
            ClassPathResource resource = new ClassPathResource("data/geo_cache.json");
            if (resource.exists()) {
                try (InputStream is = resource.getInputStream()) {
                    JsonNode root = objectMapper.readTree(is);
                    if (root.isArray()) {
                        for (JsonNode node : root) {
                            LocationEntry entry = new LocationEntry();
                            entry.name = node.get("name").asText();
                            entry.latitude = node.get("latitude").asDouble();
                            entry.longitude = node.get("longitude").asDouble();
                            
                            List<String> aliases = new ArrayList<>();
                            if (node.has("aliases") && node.get("aliases").isArray()) {
                                for (JsonNode aliasNode : node.get("aliases")) {
                                    aliases.add(aliasNode.asText().toLowerCase());
                                }
                            }
                            entry.aliases = aliases;
                            locations.add(entry);
                        }
                    }
                    System.out.println("✅ [GEO CACHE] Loaded " + locations.size() + " locations from geo_cache.json");
                }
            } else {
                System.err.println("⚠️ [GEO CACHE] geo_cache.json not found in resources/data");
            }
        } catch (Exception e) {
            System.err.println("❌ [GEO CACHE] Failed to load geo_cache.json: " + e.getMessage());
        }
    }

    /**
     * Kết quả trả về gồm tọa độ và tên chuẩn hóa.
     */
    public static class GeoResult {
        public final double latitude;
        public final double longitude;
        public final String displayName;

        public GeoResult(double latitude, double longitude, String displayName) {
            this.latitude = latitude;
            this.longitude = longitude;
            this.displayName = displayName;
        }
    }

    public static String removeAccents(String text) {
        if (text == null) return "";
        String normalized = java.text.Normalizer.normalize(text, java.text.Normalizer.Form.NFD);
        return java.util.regex.Pattern.compile("\\p{InCombiningDiacriticalMarks}+").matcher(normalized).replaceAll("")
                .replace("đ", "d").replace("Đ", "d");
    }

    private String normalizeText(String text) {
        if (text == null) return "";
        String noAccent = removeAccents(text.toLowerCase());
        return noAccent
                .replaceAll("\\s+", " ")
                .replace("tp.hcm", "").replace("tphcm", "").replace("tp hcm", "")
                .replace("ho chi minh", "").replace("hcm", "")
                .trim();
    }

    /**
     * Tìm tọa độ cho landmark/địa điểm.
     * Ưu tiên: JSON Cache nội bộ → Nominatim API
     * 
     * @return GeoResult hoặc null nếu không tìm thấy
     */
    public GeoResult geocode(String locationName) {
        if (locationName == null || locationName.trim().isEmpty()) {
            return null;
        }

        String normalized = normalizeText(locationName);

        // 1. Tìm trong bảng nội bộ (Exact / Partial Match)
        for (LocationEntry loc : locations) {
            String locNorm = normalizeText(loc.name);
            boolean match = locNorm.contains(normalized) || 
                loc.aliases.stream().map(this::normalizeText).anyMatch(a -> a.contains(normalized) || normalized.contains(a));
            
            if (match) {
                System.out.println("📍 [LOCAL CACHE HIT] '" + locationName + "' → " + loc.name);
                return new GeoResult(loc.latitude, loc.longitude, loc.name);
            }
        }

        // 1.5 Tìm theo Token (Fuzzy Token Match)
        String[] tokens = normalized.split(" ");
        if (tokens.length > 1) {
            for (LocationEntry loc : locations) {
                String locNorm = normalizeText(loc.name);
                int matchCount = 0;
                for (String t : tokens) {
                    if (t.length() >= 2 && locNorm.contains(t)) matchCount++;
                }
                // Nếu khớp >= 2 từ khóa quan trọng
                if (matchCount >= 2) {
                     System.out.println("📍 [LOCAL CACHE TOKEN HIT] '" + locationName + "' → " + loc.name);
                     return new GeoResult(loc.latitude, loc.longitude, loc.name);
                }
            }
        }

        // 2. Fallback: Gọi Nominatim (OpenStreetMap) API miễn phí
        try {
            String searchQuery = locationName.trim() + ", Việt Nam";
            String encodedQuery = URLEncoder.encode(searchQuery, StandardCharsets.UTF_8.toString());
            String url = "https://nominatim.openstreetmap.org/search?q=" + encodedQuery
                    + "&format=json&limit=1&accept-language=vi";

            System.out.println("🌐 [NOMINATIM] Đang geocode: " + searchQuery);

            org.springframework.http.HttpHeaders headers = new org.springframework.http.HttpHeaders();
            headers.set("User-Agent", "SmartRental/1.0 (educational project)");
            org.springframework.http.HttpEntity<String> entity = new org.springframework.http.HttpEntity<>(headers);

            org.springframework.http.ResponseEntity<String> response = restTemplate.exchange(url,
                    org.springframework.http.HttpMethod.GET, entity, String.class);

            JsonNode results = objectMapper.readTree(response.getBody());
            if (results.isArray() && results.size() > 0) {
                JsonNode first = results.get(0);
                double lat = first.get("lat").asDouble();
                double lon = first.get("lon").asDouble();
                String display = first.has("display_name") ? first.get("display_name").asText() : locationName;

                System.out.println("📍 [NOMINATIM HIT] → " + display + " [" + lat + ", " + lon + "]");
                return new GeoResult(lat, lon, display);
            }
        } catch (Exception e) {
            System.err.println("⚠️ Lỗi gọi Nominatim API: " + e.getMessage());
        }

        System.out.println("❌ [GEOCODE MISS] Không tìm thấy tọa độ cho: " + locationName);
        return null;
    }

    private int levenshtein(String a, String b) {
        int[] costs = new int[b.length() + 1];
        for (int j = 0; j < costs.length; j++) costs[j] = j;
        for (int i = 1; i <= a.length(); i++) {
            costs[0] = i;
            int nw = i - 1;
            for (int j = 1; j <= b.length(); j++) {
                int cj = Math.min(1 + Math.min(costs[j], costs[j - 1]), a.charAt(i - 1) == b.charAt(j - 1) ? nw : nw + 1);
                nw = costs[j];
                costs[j] = cj;
            }
        }
        return costs[b.length()];
    }

    /**
     * Lấy danh sách tên Landmark phổ biến để gợi ý khi không tìm thấy vị trí.
     * Sử dụng thuật toán Levenshtein để gợi ý những địa điểm có tên gần giống nhất.
     */
    public List<String> getSmartSuggestions(String locationName, int limit) {
        String normalized = normalizeText(locationName);
        return locations.stream()
                .sorted((a, b) -> {
                    int distA = levenshtein(normalized, normalizeText(a.name));
                    int distB = levenshtein(normalized, normalizeText(b.name));
                    return Integer.compare(distA, distB);
                })
                .limit(limit)
                .map(loc -> loc.name)
                .collect(Collectors.toList());
    }
}

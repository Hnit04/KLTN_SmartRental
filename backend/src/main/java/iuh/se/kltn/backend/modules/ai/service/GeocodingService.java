package iuh.se.kltn.backend.modules.ai.service;

import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;

import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;
import java.util.LinkedHashMap;
import java.util.Map;

/**
 * Service chuyển đổi tên địa điểm (landmark) sang tọa độ (lat/lng).
 * Ưu tiên bảng tra cứu nội bộ TPHCM → fallback Nominatim (OpenStreetMap API miễn phí).
 */
@Service
public class GeocodingService {

    private final RestTemplate restTemplate = new RestTemplate();
    private final ObjectMapper objectMapper = new ObjectMapper();

    // ================================================================
    // 📍 BẢNG TRA CỨU CÁC LANDMARK PHỔ BIẾN TẠI TPHCM
    // Tránh gọi API bên ngoài cho các địa điểm thường xuyên được hỏi
    // ================================================================
    private static final Map<String, double[]> HCMC_LANDMARKS = new LinkedHashMap<>();

    static {
        // --- Tòa nhà / Địa danh nổi tiếng ---
        HCMC_LANDMARKS.put("landmark 81",             new double[]{10.7950, 106.7220});
        HCMC_LANDMARKS.put("landmark81",               new double[]{10.7950, 106.7220});
        HCMC_LANDMARKS.put("vincom landmark",          new double[]{10.7950, 106.7220});
        HCMC_LANDMARKS.put("bitexco",                  new double[]{10.7717, 106.7043});
        HCMC_LANDMARKS.put("chợ bến thành",            new double[]{10.7725, 106.6981});
        HCMC_LANDMARKS.put("bến thành",                new double[]{10.7725, 106.6981});
        HCMC_LANDMARKS.put("dinh độc lập",             new double[]{10.7769, 106.6953});
        HCMC_LANDMARKS.put("nhà thờ đức bà",           new double[]{10.7798, 106.6991});
        HCMC_LANDMARKS.put("bưu điện thành phố",       new double[]{10.7800, 106.6999});
        HCMC_LANDMARKS.put("phố đi bộ nguyễn huệ",     new double[]{10.7738, 106.7030});

        // --- Trường Đại học ---
        HCMC_LANDMARKS.put("đại học công nghiệp",      new double[]{10.8221, 106.6878});
        HCMC_LANDMARKS.put("đh công nghiệp",           new double[]{10.8221, 106.6878});
        HCMC_LANDMARKS.put("iuh",                       new double[]{10.8221, 106.6878});
        HCMC_LANDMARKS.put("đại học bách khoa",         new double[]{10.7724, 106.6580});
        HCMC_LANDMARKS.put("đh bách khoa",              new double[]{10.7724, 106.6580});
        HCMC_LANDMARKS.put("bách khoa",                 new double[]{10.7724, 106.6580});
        HCMC_LANDMARKS.put("đại học khoa học tự nhiên", new double[]{10.7628, 106.6824});
        HCMC_LANDMARKS.put("đh khtn",                   new double[]{10.7628, 106.6824});
        HCMC_LANDMARKS.put("đại học sư phạm",           new double[]{10.7627, 106.6817});
        HCMC_LANDMARKS.put("đại học kinh tế",           new double[]{10.7636, 106.6823});
        HCMC_LANDMARKS.put("đh kinh tế",                new double[]{10.7636, 106.6823});
        HCMC_LANDMARKS.put("ueh",                       new double[]{10.7636, 106.6823});
        HCMC_LANDMARKS.put("đại học ngoại thương",      new double[]{10.7632, 106.6799});
        HCMC_LANDMARKS.put("ftu",                       new double[]{10.7632, 106.6799});
        HCMC_LANDMARKS.put("đại học công nghệ thông tin",new double[]{10.8700, 106.8031});
        HCMC_LANDMARKS.put("đh cntt",                   new double[]{10.8700, 106.8031});
        HCMC_LANDMARKS.put("uit",                       new double[]{10.8700, 106.8031});
        HCMC_LANDMARKS.put("đại học quốc tế",           new double[]{10.8786, 106.8018});
        HCMC_LANDMARKS.put("đại học nông lâm",          new double[]{10.8717, 106.7907});
        HCMC_LANDMARKS.put("đh nông lâm",               new double[]{10.8717, 106.7907});
        HCMC_LANDMARKS.put("nlu",                       new double[]{10.8717, 106.7907});
        HCMC_LANDMARKS.put("đại học tôn đức thắng",     new double[]{10.7326, 106.6998});
        HCMC_LANDMARKS.put("tdtu",                      new double[]{10.7326, 106.6998});
        HCMC_LANDMARKS.put("tôn đức thắng",             new double[]{10.7326, 106.6998});
        HCMC_LANDMARKS.put("đại học rmit",              new double[]{10.7291, 106.6958});
        HCMC_LANDMARKS.put("rmit",                      new double[]{10.7291, 106.6958});
        HCMC_LANDMARKS.put("đại học hutech",            new double[]{10.8505, 106.7719});
        HCMC_LANDMARKS.put("hutech",                    new double[]{10.8505, 106.7719});
        HCMC_LANDMARKS.put("đại học văn lang",          new double[]{10.8383, 106.6341});
        HCMC_LANDMARKS.put("văn lang",                  new double[]{10.8383, 106.6341});
        HCMC_LANDMARKS.put("đại học nguyễn tất thành",  new double[]{10.7369, 106.6285});
        HCMC_LANDMARKS.put("nttu",                      new double[]{10.7369, 106.6285});
        HCMC_LANDMARKS.put("đại học sài gòn",           new double[]{10.7600, 106.6822});
        HCMC_LANDMARKS.put("đh sài gòn",                new double[]{10.7600, 106.6822});
        HCMC_LANDMARKS.put("đại học mở",                new double[]{10.7577, 106.6685});
        HCMC_LANDMARKS.put("đại học cảnh sát nhân dân", new double[]{10.7303, 106.6983});
        HCMC_LANDMARKS.put("đh cảnh sát",               new double[]{10.7303, 106.6983});

        // --- Bệnh viện ---
        HCMC_LANDMARKS.put("bệnh viện chợ rẫy",        new double[]{10.7558, 106.6560});
        HCMC_LANDMARKS.put("chợ rẫy",                   new double[]{10.7558, 106.6560});
        HCMC_LANDMARKS.put("bệnh viện 115",             new double[]{10.7794, 106.6598});
        HCMC_LANDMARKS.put("bệnh viện đại học y dược",  new double[]{10.7554, 106.6643});
        HCMC_LANDMARKS.put("bệnh viện nhi đồng 1",     new double[]{10.7724, 106.6688});
        HCMC_LANDMARKS.put("bệnh viện từ dũ",           new double[]{10.7826, 106.6978});

        // --- Khu công nghiệp ---
        HCMC_LANDMARKS.put("khu công nghệ cao",         new double[]{10.8548, 106.7866});
        HCMC_LANDMARKS.put("kcnc",                      new double[]{10.8548, 106.7866});
        HCMC_LANDMARKS.put("khu chế xuất tân thuận",     new double[]{10.7385, 106.7273});
        HCMC_LANDMARKS.put("tân thuận",                  new double[]{10.7385, 106.7273});

        // --- Ga / Bến xe ---
        HCMC_LANDMARKS.put("ga sài gòn",                new double[]{10.7828, 106.6778});
        HCMC_LANDMARKS.put("bến xe miền đông",          new double[]{10.8148, 106.7108});
        HCMC_LANDMARKS.put("bến xe miền đông mới",      new double[]{10.8797, 106.8242});
        HCMC_LANDMARKS.put("bến xe miền tây",           new double[]{10.7381, 106.6189});
        HCMC_LANDMARKS.put("sân bay tân sơn nhất",      new double[]{10.8188, 106.6590});
        HCMC_LANDMARKS.put("tân sơn nhất",              new double[]{10.8188, 106.6590});

        // --- Trung tâm thương mại ---
        HCMC_LANDMARKS.put("aeon mall tân phú",          new double[]{10.8005, 106.6279});
        HCMC_LANDMARKS.put("aeon mall bình tân",         new double[]{10.7429, 106.6109});
        HCMC_LANDMARKS.put("vinhomes central park",     new double[]{10.7944, 106.7220});
        HCMC_LANDMARKS.put("vinhomes grand park",       new double[]{10.8392, 106.8367});
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

    /**
     * Tìm tọa độ cho landmark/địa điểm.
     * Ưu tiên: Bảng nội bộ → Nominatim API
     * @return GeoResult hoặc null nếu không tìm thấy
     */
    public GeoResult geocode(String locationName) {
        if (locationName == null || locationName.trim().isEmpty()) {
            return null;
        }

        String normalized = locationName.trim().toLowerCase()
                .replaceAll("\\s+", " ")
                .replace("tp.hcm", "").replace("tphcm", "").replace("tp hcm", "")
                .replace("hồ chí minh", "").replace("hcm", "")
                .trim();

        // 1. Tìm trong bảng nội bộ trước (nhanh, không cần mạng)
        for (Map.Entry<String, double[]> entry : HCMC_LANDMARKS.entrySet()) {
            if (normalized.contains(entry.getKey())) {
                double[] coords = entry.getValue();
                System.out.println("📍 [LOCAL LOOKUP] '" + locationName + "' → " + entry.getKey() 
                        + " [" + coords[0] + ", " + coords[1] + "]");
                return new GeoResult(coords[0], coords[1], entry.getKey());
            }
        }

        // 2. Fallback: Gọi Nominatim (OpenStreetMap) API miễn phí
        try {
            String searchQuery = locationName.trim() + ", Việt Nam";
            String encodedQuery = URLEncoder.encode(searchQuery, StandardCharsets.UTF_8.toString());
            String url = "https://nominatim.openstreetmap.org/search?q=" + encodedQuery 
                       + "&format=json&limit=1&accept-language=vi";

            System.out.println("🌐 [NOMINATIM] Đang geocode: " + searchQuery);

            // Nominatim yêu cầu User-Agent hợp lệ
            org.springframework.http.HttpHeaders headers = new org.springframework.http.HttpHeaders();
            headers.set("User-Agent", "SmartRental/1.0 (educational project)");
            org.springframework.http.HttpEntity<String> entity = new org.springframework.http.HttpEntity<>(headers);

            org.springframework.http.ResponseEntity<String> response = 
                    restTemplate.exchange(url, org.springframework.http.HttpMethod.GET, entity, String.class);

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
        return null; // Không tìm thấy
    }

    // Các pattern trích xuất thủ công đã được gỡ bỏ để nhường chỗ cho Agentic AI xử lý.
}

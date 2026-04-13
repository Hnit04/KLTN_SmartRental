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
 * Ưu tiên bảng tra cứu nội bộ TPHCM → fallback Nominatim (OpenStreetMap API
 * miễn phí).
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
        HCMC_LANDMARKS.put("landmark 81", new double[] { 10.7950, 106.7220 });
        HCMC_LANDMARKS.put("landmark81", new double[] { 10.7950, 106.7220 });
        HCMC_LANDMARKS.put("vincom landmark", new double[] { 10.7950, 106.7220 });
        HCMC_LANDMARKS.put("bitexco", new double[] { 10.7717, 106.7043 });
        HCMC_LANDMARKS.put("chợ bến thành", new double[] { 10.7725, 106.6981 });
        HCMC_LANDMARKS.put("bến thành", new double[] { 10.7725, 106.6981 });
        HCMC_LANDMARKS.put("dinh độc lập", new double[] { 10.7769, 106.6953 });
        HCMC_LANDMARKS.put("nhà thờ đức bà", new double[] { 10.7798, 106.6991 });
        HCMC_LANDMARKS.put("bưu điện thành phố", new double[] { 10.7800, 106.6999 });
        HCMC_LANDMARKS.put("phố đi bộ nguyễn huệ", new double[] { 10.7738, 106.7030 });
        HCMC_LANDMARKS.put("nhà hát thành phố", new double[] { 10.7766, 106.7031 });
        HCMC_LANDMARKS.put("bảo tàng chứng tích", new double[] { 10.7781, 106.6901 });
        HCMC_LANDMARKS.put("bảo tàng chứng tích", new double[] { 10.7781, 106.6901 });
        HCMC_LANDMARKS.put("bảo tàng mỹ thuật", new double[] { 10.7698, 106.6989 });
        HCMC_LANDMARKS.put("hồ con rùa", new double[] { 10.7825, 106.6957 });
        HCMC_LANDMARKS.put("bến nhà rồng", new double[] { 10.7681, 106.7067 });
        HCMC_LANDMARKS.put("phố tây bùi viện", new double[] { 10.7675, 106.6938 });
        HCMC_LANDMARKS.put("bùi viện", new double[] { 10.7675, 106.6938 });
        HCMC_LANDMARKS.put("thảo cầm viên", new double[] { 10.7876, 106.7052 });
        HCMC_LANDMARKS.put("đầm sen", new double[] { 10.7667, 106.6385 });
        HCMC_LANDMARKS.put("suối tiên", new double[] { 10.8631, 106.8021 });
        HCMC_LANDMARKS.put("công viên tao đàn", new double[] { 10.7744, 106.6923 });
        HCMC_LANDMARKS.put("công viên gia định", new double[] { 10.8143, 106.6787 });
        HCMC_LANDMARKS.put("công viên hoàng văn thụ", new double[] { 10.8016, 106.6625 });
        HCMC_LANDMARKS.put("công viên lê văn tám", new double[] { 10.7891, 106.6937 });
        HCMC_LANDMARKS.put("hồ bán nguyệt", new double[] { 10.7258, 106.7161 });
        HCMC_LANDMARKS.put("cầu ánh sao", new double[] { 10.7251, 106.7166 });
        
        // --- Cầu nổi tiếng ---
        HCMC_LANDMARKS.put("cầu sài gòn", new double[] { 10.7979, 106.7262 });
        HCMC_LANDMARKS.put("cầu thủ thiêm", new double[] { 10.7853, 106.7169 });
        HCMC_LANDMARKS.put("cầu ba son", new double[] { 10.7761, 106.7118 });
        HCMC_LANDMARKS.put("cầu phú mỹ", new double[] { 10.7431, 106.7351 });
        HCMC_LANDMARKS.put("cầu bình lợi", new double[] { 10.8268, 106.7027 });
        HCMC_LANDMARKS.put("cầu bình triệu", new double[] { 10.8242, 106.7061 });
        HCMC_LANDMARKS.put("cầu chữ y", new double[] { 10.7516, 106.6853 });
        HCMC_LANDMARKS.put("cầu nguyễn văn cừ", new double[] { 10.7583, 106.6858 });
        HCMC_LANDMARKS.put("cầu ông lãnh", new double[] { 10.7635, 106.6974 });
        HCMC_LANDMARKS.put("cầu calmette", new double[] { 10.7645, 106.7011 });
        HCMC_LANDMARKS.put("cầu khánh hội", new double[] { 10.7684, 106.7077 });
        HCMC_LANDMARKS.put("cầu nhị thiên đường", new double[] { 10.7381, 106.6521 });
        HCMC_LANDMARKS.put("cầu kênh tẻ", new double[] { 10.7538, 106.6993 });
        HCMC_LANDMARKS.put("cầu tân thuận", new double[] { 10.7621, 106.7208 });
        
        // --- Các Chợ Nội / Ngoại Thành Nổi Tiếng ---
        HCMC_LANDMARKS.put("chợ lớn", new double[] { 10.7497, 106.6517 });
        HCMC_LANDMARKS.put("chợ bình tây", new double[] { 10.7497, 106.6517 });
        HCMC_LANDMARKS.put("chợ an đông", new double[] { 10.7570, 106.6713 });
        HCMC_LANDMARKS.put("chợ tân định", new double[] { 10.7891, 106.6896 });
        HCMC_LANDMARKS.put("chợ hóc môn", new double[] { 10.8845, 106.5935 });
        HCMC_LANDMARKS.put("chợ đầu mối hóc môn", new double[] { 10.8665, 106.6025 });
        HCMC_LANDMARKS.put("chợ bà chiểu", new double[] { 10.8016, 106.6974 });
        HCMC_LANDMARKS.put("chợ tân bình", new double[] { 10.7877, 106.6521 });
        HCMC_LANDMARKS.put("chợ gò vấp", new double[] { 10.8249, 106.6853 });
        HCMC_LANDMARKS.put("chợ hạnh thông tây", new double[] { 10.8354, 106.6631 });
        HCMC_LANDMARKS.put("chợ thủ đức", new double[] { 10.8497, 106.7589 });
        HCMC_LANDMARKS.put("chợ đầu mối thủ đức", new double[] { 10.8687, 106.7456 });
        HCMC_LANDMARKS.put("chợ phạm văn hai", new double[] { 10.7950, 106.6625 });
        HCMC_LANDMARKS.put("chợ bà điểm", new double[] { 10.8315, 106.6001 });
        HCMC_LANDMARKS.put("chợ bình điền", new double[] { 10.7107, 106.5960 });
        HCMC_LANDMARKS.put("chợ đầu mối bình điền", new double[] { 10.7107, 106.5960 });
        HCMC_LANDMARKS.put("chợ tân mỹ", new double[] { 10.7381, 106.7126 });
        HCMC_LANDMARKS.put("chợ xóm mới", new double[] { 10.8375, 106.6675 });

        // --- Trường Đại học ---
        HCMC_LANDMARKS.put("đại học công nghiệp", new double[] { 10.8221, 106.6878 });
        HCMC_LANDMARKS.put("iuh", new double[] { 10.8221, 106.6878 });
        HCMC_LANDMARKS.put("đại học bách khoa", new double[] { 10.7724, 106.6580 });
        HCMC_LANDMARKS.put("bách khoa", new double[] { 10.7724, 106.6580 });
        HCMC_LANDMARKS.put("đại học khoa học tự nhiên", new double[] { 10.7628, 106.6824 });
        HCMC_LANDMARKS.put("đh khtn", new double[] { 10.7628, 106.6824 });
        HCMC_LANDMARKS.put("khtn", new double[] { 10.7628, 106.6824 });
        HCMC_LANDMARKS.put("đại học sư phạm", new double[] { 10.7627, 106.6817 });
        HCMC_LANDMARKS.put("hcmue", new double[] { 10.7627, 106.6817 });
        HCMC_LANDMARKS.put("đại học kinh tế", new double[] { 10.7636, 106.6823 });
        HCMC_LANDMARKS.put("ueh", new double[] { 10.7636, 106.6823 });
        HCMC_LANDMARKS.put("đại học ngoại thương", new double[] { 10.7632, 106.6799 });
        HCMC_LANDMARKS.put("ftu", new double[] { 10.7632, 106.6799 });
        HCMC_LANDMARKS.put("đại học công nghệ thông tin", new double[] { 10.8700, 106.8031 });
        HCMC_LANDMARKS.put("uit", new double[] { 10.8700, 106.8031 });
        HCMC_LANDMARKS.put("đại học quốc tế", new double[] { 10.8786, 106.8018 });
        HCMC_LANDMARKS.put("hcmiu", new double[] { 10.8786, 106.8018 });
        HCMC_LANDMARKS.put("đại học khoa học xã hội", new double[] { 10.7858, 106.7011 });
        HCMC_LANDMARKS.put("ussh", new double[] { 10.7858, 106.7011 });
        HCMC_LANDMARKS.put("nông lâm", new double[] { 10.8717, 106.7907 });
        HCMC_LANDMARKS.put("nlu", new double[] { 10.8717, 106.7907 });
        HCMC_LANDMARKS.put("tôn đức thắng", new double[] { 10.7326, 106.6998 });
        HCMC_LANDMARKS.put("tdtu", new double[] { 10.7326, 106.6998 });
        HCMC_LANDMARKS.put("rmit", new double[] { 10.7291, 106.6958 });
        HCMC_LANDMARKS.put("hutech", new double[] { 10.8505, 106.7719 });
        HCMC_LANDMARKS.put("văn lang", new double[] { 10.8383, 106.6341 });
        HCMC_LANDMARKS.put("vlu", new double[] { 10.8383, 106.6341 });
        HCMC_LANDMARKS.put("nguyễn tất thành", new double[] { 10.7369, 106.6285 });
        HCMC_LANDMARKS.put("nttu", new double[] { 10.7369, 106.6285 });
        HCMC_LANDMARKS.put("đại học sài gòn", new double[] { 10.7600, 106.6822 });
        HCMC_LANDMARKS.put("sgu", new double[] { 10.7600, 106.6822 });
        HCMC_LANDMARKS.put("đại học mở", new double[] { 10.7577, 106.6685 });
        HCMC_LANDMARKS.put("ou", new double[] { 10.7577, 106.6685 });
        HCMC_LANDMARKS.put("cảnh sát nhân dân", new double[] { 10.7303, 106.6983 });
        HCMC_LANDMARKS.put("hàng hải", new double[] { 10.7607, 106.7032 });
        HCMC_LANDMARKS.put("giao thông vận tải", new double[] { 10.8458, 106.7944 });
        HCMC_LANDMARKS.put("utc", new double[] { 10.8458, 106.7944 });
        HCMC_LANDMARKS.put("kiến trúc", new double[] { 10.7797, 106.6934 });
        HCMC_LANDMARKS.put("uah", new double[] { 10.7797, 106.6934 });
        HCMC_LANDMARKS.put("y dược", new double[] { 10.7554, 106.6643 });
        HCMC_LANDMARKS.put("ump", new double[] { 10.7554, 106.6643 });
        HCMC_LANDMARKS.put("y khoa phạm ngọc thạch", new double[] { 10.7749, 106.6663 });
        HCMC_LANDMARKS.put("luật", new double[] { 10.7645, 106.7077 });
        HCMC_LANDMARKS.put("hcmulaw", new double[] { 10.7645, 106.7077 });
        HCMC_LANDMARKS.put("tài chính marketing", new double[] { 10.7661, 106.6961 });
        HCMC_LANDMARKS.put("ufm", new double[] { 10.7661, 106.6961 });
        HCMC_LANDMARKS.put("hùng vương", new double[] { 10.7584, 106.6457 });
        HCMC_LANDMARKS.put("hoa sen", new double[] { 10.7725, 106.6931 });
        HCMC_LANDMARKS.put("hsu", new double[] { 10.7725, 106.6931 });
        HCMC_LANDMARKS.put("kinh tế tài chính", new double[] { 10.7963, 106.7001 });
        HCMC_LANDMARKS.put("uef", new double[] { 10.7963, 106.7001 });
        HCMC_LANDMARKS.put("văn hiến", new double[] { 10.7390, 106.6577 });
        HCMC_LANDMARKS.put("vhu", new double[] { 10.7390, 106.6577 });
        HCMC_LANDMARKS.put("công nghiệp thực phẩm", new double[] { 10.8166, 106.6288 });
        HCMC_LANDMARKS.put("hufi", new double[] { 10.8166, 106.6288 });
        HCMC_LANDMARKS.put("bưu chính viễn thông", new double[] { 10.8477, 106.7869 });
        HCMC_LANDMARKS.put("ptit", new double[] { 10.8477, 106.7869 });

        // --- Bệnh viện ---
        HCMC_LANDMARKS.put("bệnh viện chợ rẫy", new double[] { 10.7558, 106.6560 });
        HCMC_LANDMARKS.put("chợ rẫy", new double[] { 10.7558, 106.6560 });
        HCMC_LANDMARKS.put("bệnh viện 115", new double[] { 10.7794, 106.6598 });
        HCMC_LANDMARKS.put("bệnh viện đại học y dược", new double[] { 10.7554, 106.6643 });
        HCMC_LANDMARKS.put("bệnh viện nhi đồng 1", new double[] { 10.7724, 106.6688 });
        HCMC_LANDMARKS.put("bệnh viện nhi đồng 2", new double[] { 10.7816, 106.7031 });
        HCMC_LANDMARKS.put("bệnh viện từ dũ", new double[] { 10.7826, 106.6978 });
        HCMC_LANDMARKS.put("bệnh viện hùng vương", new double[] { 10.7562, 106.6617 });
        HCMC_LANDMARKS.put("bệnh viện bình dân", new double[] { 10.7788, 106.6800 });
        HCMC_LANDMARKS.put("bệnh viện da liễu", new double[] { 10.7766, 106.6806 });
        HCMC_LANDMARKS.put("bệnh viện mắt", new double[] { 10.7770, 106.6830 });
        HCMC_LANDMARKS.put("bệnh viện truyền máu", new double[] { 10.7552, 106.6593 });
        HCMC_LANDMARKS.put("bệnh viện nhiệt đới", new double[] { 10.7547, 106.6802 });
        HCMC_LANDMARKS.put("bệnh viện nhân dân gia định", new double[] { 10.8030, 106.6917 });
        HCMC_LANDMARKS.put("gia định", new double[] { 10.8030, 106.6917 });
        HCMC_LANDMARKS.put("bệnh viện ung bướu", new double[] { 10.8023, 106.6931 });
        HCMC_LANDMARKS.put("ung bướu", new double[] { 10.8023, 106.6931 });
        HCMC_LANDMARKS.put("bệnh viện thống nhất", new double[] { 10.7937, 106.6548 });

        // --- Khu công nghiệp / Công nghệ ---
        HCMC_LANDMARKS.put("khu công nghệ cao", new double[] { 10.8548, 106.7866 });
        HCMC_LANDMARKS.put("kcnc", new double[] { 10.8548, 106.7866 });
        HCMC_LANDMARKS.put("khu chế xuất tân thuận", new double[] { 10.7385, 106.7273 });
        HCMC_LANDMARKS.put("tân thuận", new double[] { 10.7385, 106.7273 });
        HCMC_LANDMARKS.put("công viên phần mềm quang trung", new double[] { 10.8519, 106.6272 });
        HCMC_LANDMARKS.put("quang trung", new double[] { 10.8519, 106.6272 });
        HCMC_LANDMARKS.put("khu công nghiệp tân bình", new double[] { 10.8166, 106.6212 });
        HCMC_LANDMARKS.put("khu công nghiệp linh trung", new double[] { 10.8653, 106.7643 });
        HCMC_LANDMARKS.put("khu công nghiệp sóng thần", new double[] { 10.8878, 106.7570 }); // Giáp ranh
        HCMC_LANDMARKS.put("khu công nghiệp vĩnh lộc", new double[] { 10.8124, 106.5925 });

        // --- Ga / Bến xe / Sân bay ---
        HCMC_LANDMARKS.put("ga sài gòn", new double[] { 10.7828, 106.6778 });
        HCMC_LANDMARKS.put("bến xe miền đông", new double[] { 10.8148, 106.7108 });
        HCMC_LANDMARKS.put("bến xe miền đông mới", new double[] { 10.8797, 106.8242 });
        HCMC_LANDMARKS.put("bến xe miền tây", new double[] { 10.7381, 106.6189 });
        HCMC_LANDMARKS.put("bến xe an sương", new double[] { 10.8354, 106.6180 });
        HCMC_LANDMARKS.put("bến xe ngã tư ga", new double[] { 10.8546, 106.6811 });
        HCMC_LANDMARKS.put("bến xe chợ lớn", new double[] { 10.7516, 106.6534 });
        HCMC_LANDMARKS.put("sân bay tân sơn nhất", new double[] { 10.8188, 106.6590 });
        HCMC_LANDMARKS.put("tân sơn nhất", new double[] { 10.8188, 106.6590 });

        // --- Trung tâm thương mại / Siêu thị lớn ---
        HCMC_LANDMARKS.put("aeon mall tân phú", new double[] { 10.8005, 106.6279 });
        HCMC_LANDMARKS.put("aeon mall bình tân", new double[] { 10.7429, 106.6109 });
        HCMC_LANDMARKS.put("vinhomes central park", new double[] { 10.7944, 106.7220 });
        HCMC_LANDMARKS.put("vinhomes grand park", new double[] { 10.8392, 106.8367 });
        HCMC_LANDMARKS.put("saigon centre", new double[] { 10.7728, 106.7011 });
        HCMC_LANDMARKS.put("takashimaya", new double[] { 10.7728, 106.7011 });
        HCMC_LANDMARKS.put("crescent mall", new double[] { 10.7297, 106.7206 });
        HCMC_LANDMARKS.put("sc vivocity", new double[] { 10.7314, 106.7018 });
        HCMC_LANDMARKS.put("vạn hạnh mall", new double[] { 10.7744, 106.6695 });
        HCMC_LANDMARKS.put("gigamall", new double[] { 10.8282, 106.7214 });
        HCMC_LANDMARKS.put("estella place", new double[] { 10.8023, 106.7441 });
        HCMC_LANDMARKS.put("vincom đồng khởi", new double[] { 10.7770, 106.7011 });
        HCMC_LANDMARKS.put("vincom thảo điền", new double[] { 10.8037, 106.7366 });
        HCMC_LANDMARKS.put("landmark 81", new double[] { 10.7950, 106.7220 });
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
     * 
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
        return null; // Không tìm thấy
    }

    // Các pattern trích xuất thủ công đã được gỡ bỏ để nhường chỗ cho Agentic AI xử
    // lý.
}

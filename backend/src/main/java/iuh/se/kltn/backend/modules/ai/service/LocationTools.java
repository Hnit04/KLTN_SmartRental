package iuh.se.kltn.backend.modules.ai.service;

import dev.langchain4j.agent.tool.P;
import dev.langchain4j.agent.tool.Tool;
import iuh.se.kltn.backend.modules.property.repository.PropertyRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Component;

import java.util.List;
import java.util.Map;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

@Component
public class LocationTools {

    @Autowired
    private GeocodingService geocodingService;

    @Autowired
    private PropertyRepository propertyRepository;

    private static final double DEFAULT_RADIUS_KM = 3.0;

    /**
     * Tool này được LangChain4j tự động gọi khi AI nhận diện được ngữ cảnh tìm phòng theo vị trí.
     */
    @Tool("Tìm kiếm phòng trọ, căn hộ gần một địa điểm cụ thể (ví dụ: trường đại học, công ty, bệnh viện, tên đường, tên tòa nhà).")
    public String findNearbyRooms(
            @P("Tên địa điểm cần tìm kiếm. Hãy làm sạch chuỗi, loại bỏ các từ thừa như 'gần', 'khu vực', chỉ truyền vào đúng tên, ví dụ: 'Đại học RMIT' hoặc 'Landmark 81'") String locationName) {
        
        System.out.println("🤖 [TOOL CALL] LangChain4j gọi Tool findNearbyRooms với tham số: " + locationName);

        // B1: Geocode
        GeocodingService.GeoResult geoResult = geocodingService.geocode(locationName);
        if (geoResult == null) {
            return "Mình chưa tìm thấy vị trí '" + locationName + "' trên bản đồ. Bạn hãy gợi ý user thử gõ tên ngắn gọn hơn hoặc địa danh lớn nhé.";
        }

        // B2: Query DB
        try {
            List<Map<String, Object>> results = propertyRepository.findNearbyRooms(
                    geoResult.latitude, geoResult.longitude, DEFAULT_RADIUS_KM);

            if (results.isEmpty()) {
                return "Hiện tại không tìm thấy phòng trống nào trong bán kính " + 
                       (int) DEFAULT_RADIUS_KM + "km quanh '" + geoResult.displayName + "'.";
            }

            // B3: Format kết quả trả về cho AI
            StringBuilder response = new StringBuilder();
            response.append("Dạ, mình tìm được ").append(results.size())
                    .append(" phòng trống gần '").append(geoResult.displayName)
                    .append("' (trong bán kính ").append((int) DEFAULT_RADIUS_KM).append("km):\n\n");

            // Khuyên dùng: Giới hạn vòng lặp ở 3-5 kết quả nếu Repository trả ra quá nhiều
            int limit = Math.min(results.size(), 5);
            for (int i = 0; i < limit; i++) {
                Map<String, Object> row = results.get(i);
                Object roomId = row.get("room_id");
                Object nameObj = row.get("name");
                String name = nameObj != null ? nameObj.toString() : "";
                if (name.length() > 35) {
                    name = name.substring(0, 32) + "...";
                }
                
                Object priceObj = row.get("price");
                String priceStr = "0";
                if (priceObj instanceof Number) {
                    priceStr = String.valueOf(((Number) priceObj).longValue());
                } else if (priceObj != null) {
                    try {
                        priceStr = String.valueOf(Double.valueOf(priceObj.toString()).longValue());
                    } catch (Exception e) {
                        priceStr = priceObj.toString();
                    }
                }

                Object distance = row.get("distance_km");
                String firstImg = extractFirstImage(row.get("images"));

                // Giữ nguyên chuỗi định dạng Regex để Frontend bắt thẻ
                response.append(String.format("[ROOM_CARD: %s | %s | %s | %s | cách %skm]\n",
                        roomId, name, priceStr, firstImg, distance));
            }

            return response.toString();

        } catch (Exception e) {
            System.err.println("❌ Lỗi tool findNearbyRooms: " + e.getMessage());
            return "Hệ thống đang gặp sự cố khi tính toán khoảng cách.";
        }
    }

    private String extractFirstImage(Object imagesObj) {
        if (imagesObj == null) return "";
        try {
            String imgStr = imagesObj.toString();
            Matcher matcher = Pattern.compile("https?://[^\\s\",\']+").matcher(imgStr);
            if (matcher.find()) {
                return matcher.group();
            }
        } catch (Exception ignored) {}
        return "";
    }
}

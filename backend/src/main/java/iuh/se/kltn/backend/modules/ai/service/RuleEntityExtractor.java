package iuh.se.kltn.backend.modules.ai.service;

import iuh.se.kltn.backend.modules.ai.enums.SystemIntent;
import org.springframework.stereotype.Component;

import java.text.Normalizer;
import java.time.LocalDate;
import java.util.HashMap;
import java.util.Map;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

@Component
public class RuleEntityExtractor {

    private static final String[] DISTRICTS = new String[]{
            "Quận 1", "Quận 2", "Quận 3", "Quận 4", "Quận 5", "Quận 6",
            "Quận 7", "Quận 8", "Quận 9", "Quận 10", "Quận 11", "Quận 12",
            "Gò Vấp", "Bình Thạnh", "Phú Nhuận", "Tân Bình", "Tân Phú",
            "Bình Tân", "Thủ Đức", "Nhà Bè", "Hóc Môn", "Củ Chi", "Cần Giờ", "Bình Chánh"
    };

    private static final Map<String, String> ROOM_TYPE_MAP = Map.of(
            "studio", "STUDIO",
            "1 phòng ngủ", "ONE_BEDROOM",
            "2 phòng ngủ", "TWO_BEDROOM",
            "phòng đơn", "SINGLE_ROOM",
            "phòng ghép", "SHARED_ROOM",
            "ở ghép", "SHARED_ROOM",
            "gác lửng", "MEZZANINE_ROOM",
            "có gác", "MEZZANINE_ROOM"
    );

    public Map<String, Object> extract(String question, SystemIntent intent) {
        Map<String, Object> params = new HashMap<>();
        if (question == null) {
            return params;
        }

        String q = normalize(question);
        extractPrice(q, params);
        extractDistrict(q, params);

        if (intent == SystemIntent.LOCATION_SEARCH || intent == SystemIntent.SEARCH_ROOM) {
            extractLocation(q, params);
        }
        if (intent == SystemIntent.VIEW_BILL || intent == SystemIntent.VIEW_REVENUE) {
            extractMonthYear(q, params);
        }

        extractRoomType(q, params);
        extractOccupants(q, params);

        if (containsAny(q, "nuôi chó", "nuôi mèo", "thú cưng", "pet", "nuôi thú")) {
            params.put("pet_friendly", true);
        }
        if (containsAny(q, "gác lửng", "có gác", "gác xép")) {
            params.put("has_mezzanine", true);
        }
        if (containsAny(q, "ban công", "có ban công")) {
            params.put("has_balcony", true);
        }

        if (containsAny(q, "máy lạnh", "điều hòa", "điều hoà", "aircon")) {
            params.put("amenity_keyword", "máy lạnh");
        } else if (containsAny(q, "chỗ để xe", "gửi xe", "parking", "bãi xe")) {
            params.put("amenity_keyword", "chỗ để xe");
        } else if (containsAny(q, "wc riêng", "toilet riêng", "nhà vệ sinh riêng", "vệ sinh riêng")) {
            params.put("amenity_keyword", "wc riêng");
        } else if (containsAny(q, "nội thất", "full nội thất", "đầy đủ nội thất")) {
            params.put("amenity_keyword", "nội thất");
        } else if (containsAny(q, "thang máy", "elevator")) {
            params.put("amenity_keyword", "thang máy");
        } else if (containsAny(q, "an ninh", "camera", "bảo vệ")) {
            params.put("amenity_keyword", "an ninh");
        } else if (containsAny(q, "chợ", "siêu thị", "bến xe", "trạm")) {
            params.put("amenity_keyword", "chợ");
        }

        if (intent == SystemIntent.VIEW_BILL) {
            if (containsAny(q, "chưa trả", "chưa đóng", "unpaid")) {
                params.put("bill_status", "UNPAID");
            } else if (containsAny(q, "đã trả", "đã đóng", "paid")) {
                params.put("bill_status", "PAID");
            }
        }

        if (intent == SystemIntent.VIEW_RISK) {
            Matcher matcher = Pattern.compile("(\\d+)\\s*ngày").matcher(q);
            if (matcher.find()) {
                params.put("days_ahead", Integer.parseInt(matcher.group(1)));
            }
        }

        return params;
    }

    private void extractPrice(String q, Map<String, Object> params) {
        String priceText = normalizeNumberWordsForPrice(q);

        Matcher compoundMatcher = Pattern.compile("\\b(\\d+)\\s*(?:triệu|tr|củ|m)\\s*(rưỡi|ruoi|\\d{1,3})\\b").matcher(priceText);
        if (compoundMatcher.find()) {
            long millions = Long.parseLong(compoundMatcher.group(1));
            String fraction = compoundMatcher.group(2);
            long extra;
            if ("rưỡi".equals(fraction) || "ruoi".equals(fraction)) {
                extra = 500_000L;
            } else {
                long rawFraction = Long.parseLong(fraction);
                if (rawFraction < 10L) {
                    extra = rawFraction * 100_000L;
                } else if (rawFraction < 100L) {
                    extra = rawFraction * 10_000L;
                } else {
                    extra = rawFraction * 1_000L;
                }
            }
            long price = millions * 1_000_000L + extra;
            if (containsAny(priceText, "dưới", "under", "<", "tối đa", "max", "đổ lại", "không quá")) {
                params.put("max_price", price);
            } else if (containsAny(priceText, "tầm", "khoảng", "chừng", "cỡ", "trên dưới")) {
                params.put("min_price", (long) (price * 0.7));
                params.put("max_price", (long) (price * 1.3));
            } else if (!containsAny(priceText, "hóa đơn", "hoá đơn", "doanh thu", "nợ")) {
                params.put("max_price", price);
            }
            return;
        }

        Matcher maxMatcher = Pattern.compile("(dưới|under|<|tối đa|max|không quá)\\s*(\\d+(?:[.,]\\d+)?)\\s*(triệu|tr|củ|m)").matcher(priceText);
        if (maxMatcher.find()) {
            params.put("max_price", parsePrice(maxMatcher.group(2)));
            return;
        }

        Matcher maxMatcher2 = Pattern.compile("(\\d+(?:[.,]\\d+)?)\\s*(triệu|tr|củ|m)\\s*(đổ lại)").matcher(priceText);
        if (maxMatcher2.find()) {
            params.put("max_price", parsePrice(maxMatcher2.group(1)));
            return;
        }

        Matcher approxMatcher = Pattern.compile("(tầm|khoảng|chừng|cỡ|trên dưới)\\s*(\\d+(?:[.,]\\d+)?)\\s*(triệu|tr|củ|m)").matcher(priceText);
        if (approxMatcher.find()) {
            long price = parsePrice(approxMatcher.group(2));
            params.put("min_price", (long) (price * 0.7));
            params.put("max_price", (long) (price * 1.3));
            return;
        }

        Matcher rangeWithUnits = Pattern.compile("(?:từ|from)\\s*(\\d+(?:[.,]\\d+)?)\\s*(triệu|tr|củ|m)\\s*(?:đến|tới|-)\\s*(\\d+(?:[.,]\\d+)?)\\s*(triệu|tr|củ|m)?").matcher(priceText);
        if (rangeWithUnits.find()) {
            params.put("min_price", parsePrice(rangeWithUnits.group(1)));
            params.put("max_price", parsePrice(rangeWithUnits.group(3)));
            return;
        }

        Matcher rangeMatcher = Pattern.compile("(?:từ|from)\\s*(\\d+(?:[.,]\\d+)?)\\s*(?:đến|tới|-)\\s*(\\d+(?:[.,]\\d+)?)\\s*(triệu|tr|củ|m)").matcher(priceText);
        if (rangeMatcher.find()) {
            params.put("min_price", parsePrice(rangeMatcher.group(1)));
            params.put("max_price", parsePrice(rangeMatcher.group(2)));
            return;
        }

        Matcher standaloneMatcher = Pattern.compile("(\\d+(?:[.,]\\d+)?)\\s*(triệu|tr|củ|m)").matcher(priceText);
        if (standaloneMatcher.find() && !containsAny(priceText, "hóa đơn", "hoá đơn", "doanh thu", "nợ", "tháng")) {
            params.put("max_price", parsePrice(standaloneMatcher.group(1)));
        }

        // Bổ sung: Xử lý các từ khoá "giá rẻ", "sinh viên" nếu chưa có max_price/min_price
        if (!params.containsKey("max_price") && !params.containsKey("min_price")) {
            if (containsAny(q, "giá rẻ", "gia re", "giá mềm", "gia mem", "tiết kiệm", "tiet kiem", "sinh viên", "sinh vien")
                    || q.matches(".*\\brẻ\\b.*") || q.matches(".*\\bre\\b.*")) {
                params.put("max_price", 3000000L); // Mặc định giá rẻ là <= 3 triệu
                params.put("cheap_mode", true);
            }
        }
    }

    private long parsePrice(String number) {
        double value = Double.parseDouble(number.replace(",", "."));
        return (long) (value * 1_000_000L);
    }

    private void extractDistrict(String q, Map<String, Object> params) {
        for (String district : DISTRICTS) {
            if (q.contains(district.toLowerCase())) {
                params.put("district", district);
                return;
            }
        }
        Matcher matcher = Pattern.compile("(?:quận|q\\.?)\\s*(\\d{1,2})").matcher(q);
        if (matcher.find()) {
            params.put("district", "Quận " + matcher.group(1));
        }
    }

    private void extractLocation(String q, Map<String, Object> params) {
        Matcher matcher = Pattern.compile("gần\\s+([a-zà-ỹ0-9\\s]+)").matcher(q);
        if (matcher.find()) {
            String location = matcher.group(1).trim();
            if (!containsAny(location, "tôi", "đây", "chỗ", "vị trí")) {
                params.put("location", location);
            }
        }
    }

    private void extractMonthYear(String q, Map<String, Object> params) {
        Matcher matcher = Pattern.compile("tháng\\s*(\\d{1,2})(?:\\s*/\\s*(\\d{4}))?").matcher(q);
        if (matcher.find()) {
            params.put("month", Integer.parseInt(matcher.group(1)));
            params.put("year", matcher.group(2) != null ? Integer.parseInt(matcher.group(2)) : LocalDate.now().getYear());
            return;
        }

        if (containsAny(q, "tháng này", "tháng hiện tại")) {
            params.put("month", LocalDate.now().getMonthValue());
            params.put("year", LocalDate.now().getYear());
            return;
        }

        if (containsAny(q, "tháng trước", "tháng rồi")) {
            LocalDate lastMonth = LocalDate.now().minusMonths(1L);
            params.put("month", lastMonth.getMonthValue());
            params.put("year", lastMonth.getYear());
            return;
        }

        Matcher yearMatcher = Pattern.compile("năm\\s*(\\d{4})").matcher(q);
        if (yearMatcher.find()) {
            params.put("year", Integer.parseInt(yearMatcher.group(1)));
        }
    }

    private void extractRoomType(String q, Map<String, Object> params) {
        for (Map.Entry<String, String> entry : ROOM_TYPE_MAP.entrySet()) {
            if (q.contains(entry.getKey())) {
                params.put("room_type", entry.getValue());
                return;
            }
        }
    }

    private void extractOccupants(String q, Map<String, Object> params) {
        Matcher matcher = Pattern.compile("(?:cho\\s+)?(\\d+)\\s*người").matcher(q);
        if (matcher.find()) {
            params.put("occupants", Integer.parseInt(matcher.group(1)));
            return;
        }
        if (containsAny(q, "1 mình", "một mình", "ở một mình")) {
            params.put("occupants", 1);
        }
    }

    private String normalizeNumberWordsForPrice(String text) {
        String normalized = " " + text + " ";
        normalized = normalized.replaceAll("(?<!\\p{L})một(?!\\p{L})", "1");
        normalized = normalized.replaceAll("(?<!\\p{L})hai(?!\\p{L})", "2");
        normalized = normalized.replaceAll("(?<!\\p{L})ba(?!\\p{L})", "3");
        normalized = normalized.replaceAll("(?<!\\p{L})bốn(?!\\p{L})", "4");
        normalized = normalized.replaceAll("(?<!\\p{L})bon(?!\\p{L})", "4");
        normalized = normalized.replaceAll("(?<!\\p{L})năm(?!\\p{L})", "5");
        normalized = normalized.replaceAll("(?<!\\p{L})nam(?!\\p{L})", "5");
        normalized = normalized.replaceAll("(?<!\\p{L})sáu(?!\\p{L})", "6");
        normalized = normalized.replaceAll("(?<!\\p{L})sau(?!\\p{L})", "6");
        normalized = normalized.replaceAll("(?<!\\p{L})bảy(?!\\p{L})", "7");
        normalized = normalized.replaceAll("(?<!\\p{L})bay(?!\\p{L})", "7");
        normalized = normalized.replaceAll("(?<!\\p{L})tám(?!\\p{L})", "8");
        normalized = normalized.replaceAll("(?<!\\p{L})tam(?!\\p{L})", "8");
        normalized = normalized.replaceAll("(?<!\\p{L})chín(?!\\p{L})", "9");
        normalized = normalized.replaceAll("(?<!\\p{L})chin(?!\\p{L})", "9");
        normalized = normalized.replaceAll("(?<!\\p{L})mười(?!\\p{L})", "10");
        normalized = normalized.replaceAll("(?<!\\p{L})muoi(?!\\p{L})", "10");
        return normalized.replaceAll("\\s+", " ").trim();
    }

    private String normalize(String text) {
        return Normalizer.normalize(text.toLowerCase().trim(), Normalizer.Form.NFC);
    }

    private boolean containsAny(String text, String... keywords) {
        for (String keyword : keywords) {
            if (text.contains(keyword)) {
                return true;
            }
        }
        return false;
    }
}

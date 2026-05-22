/*
 * Decompiled with CFR 0.152.
 * 
 * Could not load the following classes:
 *  org.springframework.stereotype.Service
 */
package iuh.se.kltn.backend.modules.ai.service;

import iuh.se.kltn.backend.modules.ai.dto.AiRawResult;
import java.text.NumberFormat;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import org.springframework.stereotype.Service;

@Service
public class TemplateResponseService {
    private static final NumberFormat VND_FORMAT = NumberFormat.getInstance(new Locale("vi", "VN"));

    public String format(AiRawResult result) {
        if (result == null || result.getRows() == null || result.getRows().isEmpty()) {
            return this.formatEmpty(result);
        }
        return switch (result.getIntent()) {
            case "VIEW_DEBT" -> this.formatDebt(result);
            case "VIEW_BILL" -> this.formatBill(result);
            case "VIEW_CONTRACT" -> this.formatContract(result);
            case "VIEW_APPOINTMENT" -> this.formatAppointment(result);
            case "VIEW_REVENUE" -> this.formatRevenue(result);
            case "VIEW_DEBTORS" -> this.formatDebtors(result);
            case "VIEW_OCCUPANCY" -> this.formatOccupancy(result);
            case "VIEW_RISK" -> this.formatRisk(result);
            case "SEARCH_ROOM" -> this.formatSearchRoom(result);
            case "LOCATION_SEARCH" -> this.formatLocationSearch(result);
            default -> this.formatGeneric(result);
        };
    }

    private String formatEmpty(AiRawResult result) {
        if (result == null) {
            return "D\u1ea1, hi\u1ec7n kh\u00f4ng t\u00ecm th\u1ea5y d\u1eef li\u1ec7u ph\u00f9 h\u1ee3p v\u1edbi y\u00eau c\u1ea7u c\u1ee7a b\u1ea1n.";
        }
        return switch (result.getIntent()) {
            case "VIEW_DEBT" -> "D\u1ea1, b\u1ea1n hi\u1ec7n kh\u00f4ng c\u00f3 h\u00f3a \u0111\u01a1n n\u00e0o ch\u01b0a thanh to\u00e1n. C\u1ea3m \u01a1n b\u1ea1n \u0111\u00e3 thanh to\u00e1n \u0111\u00fang h\u1ea1n! \ud83c\udf89";
            case "VIEW_BILL" -> "D\u1ea1, kh\u00f4ng t\u00ecm th\u1ea5y h\u00f3a \u0111\u01a1n ph\u00f9 h\u1ee3p v\u1edbi y\u00eau c\u1ea7u c\u1ee7a b\u1ea1n.";
            case "VIEW_CONTRACT" -> "D\u1ea1, b\u1ea1n hi\u1ec7n kh\u00f4ng c\u00f3 h\u1ee3p \u0111\u1ed3ng n\u00e0o \u0111ang ho\u1ea1t \u0111\u1ed9ng.";
            case "VIEW_APPOINTMENT" -> "D\u1ea1, b\u1ea1n hi\u1ec7n kh\u00f4ng c\u00f3 l\u1ecbch h\u1eb9n n\u00e0o.";
            case "SEARCH_ROOM", "LOCATION_SEARCH" -> "D\u1ea1, hi\u1ec7n kh\u00f4ng t\u00ecm th\u1ea5y ph\u00f2ng n\u00e0o ph\u00f9 h\u1ee3p. B\u1ea1n th\u1eed m\u1edf r\u1ed9ng \u0111i\u1ec1u ki\u1ec7n t\u00ecm ki\u1ebfm nh\u00e9!";
            case "VIEW_REVENUE" -> "D\u1ea1, ch\u01b0a c\u00f3 d\u1eef li\u1ec7u doanh thu trong kho\u1ea3ng th\u1eddi gian n\u00e0y.";
            case "VIEW_DEBTORS" -> "D\u1ea1, hi\u1ec7n kh\u00f4ng c\u00f3 kh\u00e1ch thu\u00ea n\u00e0o \u0111ang n\u1ee3 ti\u1ec1n. Tuy\u1ec7t v\u1eddi! \ud83c\udf89";
            default -> "D\u1ea1, hi\u1ec7n kh\u00f4ng t\u00ecm th\u1ea5y d\u1eef li\u1ec7u ph\u00f9 h\u1ee3p v\u1edbi y\u00eau c\u1ea7u c\u1ee7a b\u1ea1n.";
        };
    }

    private String formatDebt(AiRawResult result) {
        int count = result.getTotalCount();
        long total = this.sumField(result.getRows(), "total_amount");
        StringBuilder sb = new StringBuilder();
        sb.append("D\u1ea1, b\u1ea1n hi\u1ec7n c\u00f2n ").append(count).append(" h\u00f3a \u0111\u01a1n ch\u01b0a thanh to\u00e1n");
        if (total > 0L) {
            sb.append(", t\u1ed5ng s\u1ed1 ti\u1ec1n ").append(this.formatVnd(total));
        }
        sb.append(".\n");
        for (Map<String, Object> row : result.getRows()) {
            sb.append("\n\u2022 ");
            this.appendMonthYear(sb, row);
            this.appendIfPresent(sb, row, "total_amount", "S\u1ed1 ti\u1ec1n");
            this.appendIfPresent(sb, row, "status", "Tr\u1ea1ng th\u00e1i");
            this.appendIfPresent(sb, row, "deadline", "H\u1ea1n thanh to\u00e1n");
        }
        return sb.toString();
    }

    private String formatBill(AiRawResult result) {
        StringBuilder sb = new StringBuilder();
        sb.append("D\u1ea1, t\u00ecm th\u1ea5y ").append(result.getTotalCount()).append(" h\u00f3a \u0111\u01a1n:\n");
        for (Map<String, Object> row : result.getRows()) {
            sb.append("\n\u2022 ");
            this.appendMonthYear(sb, row);
            this.appendIfPresent(sb, row, "total_amount", "S\u1ed1 ti\u1ec1n");
            this.appendIfPresent(sb, row, "status", "Tr\u1ea1ng th\u00e1i");
        }
        return sb.toString();
    }

    private String formatContract(AiRawResult result) {
        StringBuilder sb = new StringBuilder("D\u1ea1, th\u00f4ng tin h\u1ee3p \u0111\u1ed3ng c\u1ee7a b\u1ea1n:\n");
        for (Map<String, Object> row : result.getRows()) {
            sb.append("\n");
            this.appendIfPresent(sb, row, "status", "Tr\u1ea1ng th\u00e1i");
            this.appendIfPresent(sb, row, "start_date", "Ng\u00e0y b\u1eaft \u0111\u1ea7u");
            this.appendIfPresent(sb, row, "end_date", "Ng\u00e0y k\u1ebft th\u00fac");
            this.appendIfPresent(sb, row, "deposit_amount", "Ti\u1ec1n c\u1ecdc");
            this.appendIfPresent(sb, row, "actual_price", "Gi\u00e1 thu\u00ea");
        }
        return sb.toString();
    }

    private String formatAppointment(AiRawResult result) {
        StringBuilder sb = new StringBuilder();
        sb.append("D\u1ea1, b\u1ea1n c\u00f3 ").append(result.getTotalCount()).append(" l\u1ecbch h\u1eb9n:\n");
        for (Map<String, Object> row : result.getRows()) {
            sb.append("\n\u2022 ");
            this.appendIfPresent(sb, row, "meet_time", "Th\u1eddi gian");
            this.appendIfPresent(sb, row, "status", "Tr\u1ea1ng th\u00e1i");
            this.appendIfPresent(sb, row, "room_name", "Ph\u00f2ng");
        }
        return sb.toString();
    }

    private String formatRevenue(AiRawResult result) {
        long total = this.sumField(result.getRows(), "total_revenue");
        if (total == 0L) {
            total = this.sumField(result.getRows(), "total_amount");
        }
        StringBuilder sb = new StringBuilder();
        sb.append("D\u1ea1, t\u1ed5ng doanh thu: ").append(this.formatVnd(total));
        sb.append(" (t\u1eeb ").append(result.getTotalCount()).append(" h\u00f3a \u0111\u01a1n \u0111\u00e3 thanh to\u00e1n).\n");
        for (Map<String, Object> row : result.getRows()) {
            sb.append("\n\u2022 ");
            for (Map.Entry<String, Object> e : row.entrySet()) {
                if (e.getValue() == null) continue;
                sb.append(e.getKey()).append(": ").append(e.getValue()).append(" | ");
            }
        }
        return sb.toString();
    }

    private String formatDebtors(AiRawResult result) {
        StringBuilder sb = new StringBuilder();
        sb.append("D\u1ea1, hi\u1ec7n c\u00f3 ").append(result.getTotalCount()).append(" kh\u00e1ch thu\u00ea \u0111ang n\u1ee3 ti\u1ec1n:\n");
        for (Map<String, Object> row : result.getRows()) {
            sb.append("\n\u2022 ");
            this.appendIfPresent(sb, row, "tenant_name", "Kh\u00e1ch");
            this.appendIfPresent(sb, row, "room_name", "Ph\u00f2ng");
            this.appendIfPresent(sb, row, "total_amount", "S\u1ed1 ti\u1ec1n n\u1ee3");
            this.appendMonthYear(sb, row);
        }
        return sb.toString();
    }

    private String formatOccupancy(AiRawResult result) {
        StringBuilder sb = new StringBuilder("D\u1ea1, th\u00f4ng tin ph\u00f2ng:\n");
        for (Map<String, Object> row : result.getRows()) {
            sb.append("\n\u2022 ");
            for (Map.Entry<String, Object> e : row.entrySet()) {
                if (e.getValue() == null) continue;
                sb.append(e.getKey()).append(": ").append(e.getValue()).append(" | ");
            }
        }
        return sb.toString();
    }

    private String formatRisk(AiRawResult result) {
        StringBuilder sb = new StringBuilder();
        sb.append("D\u1ea1, c\u00f3 ").append(result.getTotalCount()).append(" h\u1ee3p \u0111\u1ed3ng c\u1ea7n l\u01b0u \u00fd:\n");
        for (Map<String, Object> row : result.getRows()) {
            sb.append("\n\u2022 ");
            this.appendIfPresent(sb, row, "room_name", "Ph\u00f2ng");
            this.appendIfPresent(sb, row, "tenant_name", "Kh\u00e1ch");
            this.appendIfPresent(sb, row, "end_date", "H\u1ebft h\u1ea1n");
            this.appendIfPresent(sb, row, "status", "Tr\u1ea1ng th\u00e1i");
        }
        return sb.toString();
    }

    private String formatSearchRoom(AiRawResult result) {
        StringBuilder sb = new StringBuilder();
        sb.append("D\u1ea1, em t\u00ecm th\u1ea5y ").append(result.getTotalCount()).append(" ph\u00f2ng ph\u00f9 h\u1ee3p. D\u01b0\u1edbi \u0111\u00e2y l\u00e0 danh s\u00e1ch:\n\n");
        int count = 0;
        for (Map<String, Object> row : result.getRows()) {
            if (++count > 5) {
                sb.append("\n... v\u00e0 ").append(result.getTotalCount() - 5).append(" ph\u00f2ng kh\u00e1c.");
                break;
            }
            Object roomId = row.getOrDefault("room_id", row.get("id"));
            String name = String.valueOf(row.getOrDefault("name", "Ph\u00f2ng"));
            String price = String.valueOf(row.getOrDefault("price", ""));
            String firstImg = "";
            if (row.get("images") != null) {
                String imgs = String.valueOf(row.get("images"));
                if (imgs.startsWith("[")) {
                    try {
                        String clean = imgs.substring(1, imgs.length() - 1).split(",")[0].trim();
                        if (clean.startsWith("\"") && clean.endsWith("\"")) {
                            clean = clean.substring(1, clean.length() - 1);
                        }
                        firstImg = clean;
                    }
                    catch (Exception exception) {}
                } else {
                    firstImg = imgs.contains(",") ? imgs.split(",")[0].trim() : imgs.trim();
                }
            }
            if (roomId != null && !price.isEmpty()) {
                sb.append(String.format("[ROOM_CARD: %s | %s | %s | %s]\n", roomId, name, this.normalizePriceForCard(price), firstImg));
                continue;
            }
            sb.append("\u2022 ").append(name).append(" (").append(price).append(")\n");
        }
        return sb.toString();
    }

    private String formatLocationSearch(AiRawResult result) {
        StringBuilder sb = new StringBuilder();
        sb.append("D\u1ea1, t\u00ecm th\u1ea5y ").append(result.getTotalCount()).append(" ph\u00f2ng g\u1ea7n khu v\u1ef1c b\u1ea1n y\u00eau c\u1ea7u:\n\n");
        int count = 0;
        for (Map<String, Object> row : result.getRows()) {
            if (++count > 5) {
                sb.append("\n... v\u00e0 ").append(result.getTotalCount() - 5).append(" ph\u00f2ng kh\u00e1c.");
                break;
            }
            Object roomId = row.getOrDefault("room_id", row.get("id"));
            String name = String.valueOf(row.getOrDefault("name", "Ph\u00f2ng"));
            String price = String.valueOf(row.getOrDefault("price", ""));
            Object distancePart = "";
            Object distanceObj = row.get("distance_km");
            if (distanceObj != null && !distanceObj.toString().isBlank()) {
                distancePart = " | c\u00e1ch " + String.valueOf(distanceObj) + " km";
            }
            String firstImg = "";
            if (row.get("images") != null) {
                String imgs = String.valueOf(row.get("images"));
                if (imgs.startsWith("[")) {
                    try {
                        String clean = imgs.substring(1, imgs.length() - 1).split(",")[0].trim();
                        if (clean.startsWith("\"") && clean.endsWith("\"")) {
                            clean = clean.substring(1, clean.length() - 1);
                        }
                        firstImg = clean;
                    }
                    catch (Exception exception) {}
                } else {
                    firstImg = imgs.contains(",") ? imgs.split(",")[0].trim() : imgs.trim();
                }
            }
            if (roomId != null && !price.isEmpty()) {
                sb.append(String.format("[ROOM_CARD: %s | %s | %s | %s%s]\n", roomId, name, this.normalizePriceForCard(price), firstImg, distancePart));
                continue;
            }
            sb.append("\u2022 ").append(name).append(" (").append(price).append(")\n");
        }
        return sb.toString();
    }

    private String formatGeneric(AiRawResult result) {
        StringBuilder sb = new StringBuilder();
        sb.append("D\u1ea1, \u0111\u00e2y l\u00e0 k\u1ebft qu\u1ea3 tra c\u1ee9u (").append(result.getTotalCount()).append(" d\u00f2ng):\n");
        int i = 0;
        for (Map<String, Object> row : result.getRows()) {
            if (++i > 5) break;
            sb.append("\n--- ").append(i).append(" ---\n");
            for (Map.Entry<String, Object> e : row.entrySet()) {
                if (e.getValue() == null) continue;
                sb.append("\u2022 ").append(e.getKey()).append(": ").append(e.getValue()).append("\n");
            }
        }
        return sb.toString();
    }

    private String formatVnd(long amount) {
        return VND_FORMAT.format(amount) + "\u0111";
    }

    private long sumField(List<Map<String, Object>> rows, String field) {
        long sum = 0L;
        for (Map<String, Object> row : rows) {
            Object val = row.get(field);
            if (!(val instanceof Number)) continue;
            sum += ((Number)val).longValue();
        }
        return sum;
    }

    private void appendIfPresent(StringBuilder sb, Map<String, Object> row, String key, String label) {
        Object val = row.get(key);
        if (val != null) {
            if (!label.isEmpty()) {
                sb.append(label).append(": ");
            }
            if (val instanceof Number && (key.contains("amount") || key.contains("price") || key.contains("revenue") || key.contains("deposit"))) {
                sb.append(this.formatVnd(((Number)val).longValue()));
            } else {
                sb.append(val);
            }
            sb.append(" | ");
        }
    }

    private void appendMonthYear(StringBuilder sb, Map<String, Object> row) {
        Object month = row.get("month");
        Object year = row.get("year");
        Object billingMonth = row.get("billing_month");
        if (month != null && year != null) {
            sb.append("Th\u00e1ng: ").append(month).append("/").append(year).append(" | ");
        } else if (billingMonth != null) {
            sb.append("Th\u00e1ng: ").append(billingMonth).append(" | ");
        }
    }

    private String normalizePriceForCard(String priceRaw) {
        try {
            double p = Double.parseDouble(priceRaw);
            if (p >= 1000000.0) {
                return String.format("%.1f tr", p / 1000000.0).replace(".0", "");
            }
            if (p >= 1000.0) {
                return String.format("%.0f k", p / 1000.0);
            }
            return priceRaw;
        }
        catch (Exception e) {
            return priceRaw;
        }
    }
}

/*
 * Decompiled with CFR 0.152.
 * 
 * Could not load the following classes:
 *  org.springframework.stereotype.Component
 */
package iuh.se.kltn.backend.modules.ai.service;

import iuh.se.kltn.backend.modules.ai.enums.SystemIntent;
import java.text.Normalizer;
import java.time.LocalDate;
import java.util.HashMap;
import java.util.Map;
import java.util.regex.Matcher;
import java.util.regex.Pattern;
import org.springframework.stereotype.Component;

@Component
public class RuleEntityExtractor {
    private static final String[] DISTRICTS = new String[]{"Qu\u1eadn 1", "Qu\u1eadn 2", "Qu\u1eadn 3", "Qu\u1eadn 4", "Qu\u1eadn 5", "Qu\u1eadn 6", "Qu\u1eadn 7", "Qu\u1eadn 8", "Qu\u1eadn 9", "Qu\u1eadn 10", "Qu\u1eadn 11", "Qu\u1eadn 12", "G\u00f2 V\u1ea5p", "B\u00ecnh Th\u1ea1nh", "Ph\u00fa Nhu\u1eadn", "T\u00e2n B\u00ecnh", "T\u00e2n Ph\u00fa", "B\u00ecnh T\u00e2n", "Th\u1ee7 \u0110\u1ee9c", "Nh\u00e0 B\u00e8", "H\u00f3c M\u00f4n", "C\u1ee7 Chi", "C\u1ea7n Gi\u1edd", "B\u00ecnh Ch\u00e1nh"};
    private static final Map<String, String> ROOM_TYPE_MAP = Map.of("studio", "STUDIO", "1 ph\u00f2ng ng\u1ee7", "ONE_BEDROOM", "2 ph\u00f2ng ng\u1ee7", "TWO_BEDROOM", "ph\u00f2ng \u0111\u01a1n", "SINGLE_ROOM", "ph\u00f2ng gh\u00e9p", "SHARED_ROOM", "\u1edf gh\u00e9p", "SHARED_ROOM", "g\u00e1c l\u1eedng", "MEZZANINE_ROOM", "c\u00f3 g\u00e1c", "MEZZANINE_ROOM");

    public Map<String, Object> extract(String question, SystemIntent intent) {
        Matcher m;
        HashMap<String, Object> params = new HashMap<String, Object>();
        if (question == null) {
            return params;
        }
        String q = this.normalize(question);
        this.extractPrice(q, params);
        this.extractDistrict(q, params);
        if (intent == SystemIntent.LOCATION_SEARCH || intent == SystemIntent.SEARCH_ROOM) {
            this.extractLocation(q, params);
        }
        if (intent == SystemIntent.VIEW_BILL || intent == SystemIntent.VIEW_REVENUE) {
            this.extractMonthYear(q, params);
        }
        this.extractRoomType(q, params);
        this.extractOccupants(q, params);
        if (this.containsAny(q, "nu\u00f4i ch\u00f3", "nu\u00f4i m\u00e8o", "th\u00fa c\u01b0ng", "pet", "nu\u00f4i th\u00fa")) {
            params.put("pet_friendly", true);
        }
        if (this.containsAny(q, "g\u00e1c l\u1eedng", "c\u00f3 g\u00e1c", "g\u00e1c x\u00e9p")) {
            params.put("has_mezzanine", true);
        }
        if (this.containsAny(q, "ban c\u00f4ng", "c\u00f3 ban c\u00f4ng")) {
            params.put("has_balcony", true);
        }
        if (this.containsAny(q, "m\u00e1y l\u1ea1nh", "\u0111i\u1ec1u h\u00f2a", "\u0111i\u1ec1u ho\u00e0", "aircon")) {
            params.put("amenity_keyword", "m\u00e1y l\u1ea1nh");
        } else if (this.containsAny(q, "ch\u1ed7 \u0111\u1ec3 xe", "g\u1eedi xe", "parking", "b\u00e3i xe")) {
            params.put("amenity_keyword", "ch\u1ed7 \u0111\u1ec3 xe");
        } else if (this.containsAny(q, "wc ri\u00eang", "toilet ri\u00eang", "nh\u00e0 v\u1ec7 sinh ri\u00eang", "v\u1ec7 sinh ri\u00eang")) {
            params.put("amenity_keyword", "wc ri\u00eang");
        } else if (this.containsAny(q, "n\u1ed9i th\u1ea5t", "full n\u1ed9i th\u1ea5t", "\u0111\u1ea7y \u0111\u1ee7 n\u1ed9i th\u1ea5t")) {
            params.put("amenity_keyword", "n\u1ed9i th\u1ea5t");
        } else if (this.containsAny(q, "thang m\u00e1y", "elevator")) {
            params.put("amenity_keyword", "thang m\u00e1y");
        } else if (this.containsAny(q, "an ninh", "camera", "b\u1ea3o v\u1ec7")) {
            params.put("amenity_keyword", "an ninh");
        } else if (this.containsAny(q, "ch\u1ee3", "si\u00eau th\u1ecb", "b\u1ebfn xe", "tr\u1ea1m")) {
            params.put("amenity_keyword", "ch\u1ee3");
        }
        if (intent == SystemIntent.VIEW_BILL) {
            if (this.containsAny(q, "ch\u01b0a tr\u1ea3", "ch\u01b0a \u0111\u00f3ng", "unpaid")) {
                params.put("bill_status", "UNPAID");
            } else if (this.containsAny(q, "\u0111\u00e3 tr\u1ea3", "\u0111\u00e3 \u0111\u00f3ng", "paid")) {
                params.put("bill_status", "PAID");
            }
        }
        if (intent == SystemIntent.VIEW_RISK && (m = Pattern.compile("(\\d+)\\s*ng\u00e0y").matcher(q)).find()) {
            params.put("days_ahead", Integer.parseInt(m.group(1)));
        }
        return params;
    }

    private void extractPrice(String q, Map<String, Object> params) {
        q = q.replace("hai", "2").replace("ba", "3").replace("b\u1ed1n", "4").replace("n\u0103m", "5").replace("s\u00e1u", "6").replace("b\u1ea3y", "7").replace("t\u00e1m", "8").replace("ch\u00edn", "9").replace("m\u1ed9t", "1").replace("m\u01b0\u1eddi", "10");
        Matcher compoundMatcher = Pattern.compile("(\\d+)\\s*(?:tri\u1ec7u|tr|c\u1ee7)\\s*(r\u01b0\u1ee1i|\\d{1,3}(?:00)?)").matcher(q);
        if (compoundMatcher.find()) {
            long val;
            long millions = Long.parseLong(compoundMatcher.group(1));
            long extra = 0L;
            String fraction = compoundMatcher.group(2);
            extra = "r\u01b0\u1ee1i".equals(fraction) ? 500000L : ((val = Long.parseLong(fraction)) < 10L ? val * 100000L : (val < 100L ? val * 10000L : val * 1000L));
            long price = millions * 1000000L + extra;
            if (this.containsAny(q, "d\u01b0\u1edbi", "under", "<", "t\u1ed1i \u0111a", "max", "\u0111\u1ed5 l\u1ea1i", "kh\u00f4ng qu\u00e1")) {
                params.put("max_price", price);
            } else if (this.containsAny(q, "t\u1ea7m", "kho\u1ea3ng", "ch\u1eebng", "c\u1ee1", "tr\u00ean d\u01b0\u1edbi")) {
                params.put("min_price", (long)((double)price * 0.7));
                params.put("max_price", (long)((double)price * 1.3));
            } else if (!this.containsAny(q, "h\u00f3a \u0111\u01a1n", "doanh thu", "n\u1ee3")) {
                params.put("max_price", price);
            }
            return;
        }
        Matcher maxMatcher = Pattern.compile("(d\u01b0\u1edbi|under|<|t\u1ed1i \u0111a|max|kh\u00f4ng qu\u00e1)\\s*(\\d+(?:[.,]\\d+)?)\\s*(tri\u1ec7u|tr|c\u1ee7|m)").matcher(q);
        if (maxMatcher.find()) {
            params.put("max_price", this.parsePrice(maxMatcher.group(2)));
            return;
        }
        Matcher maxMatcher2 = Pattern.compile("(\\d+(?:[.,]\\d+)?)\\s*(tri\u1ec7u|tr|c\u1ee7|m)\\s*(\u0111\u1ed5 l\u1ea1i)").matcher(q);
        if (maxMatcher2.find()) {
            params.put("max_price", this.parsePrice(maxMatcher2.group(1)));
            return;
        }
        Matcher approxMatcher = Pattern.compile("(t\u1ea7m|kho\u1ea3ng|ch\u1eebng|c\u1ee1|tr\u00ean d\u01b0\u1edbi)\\s*(\\d+(?:[.,]\\d+)?)\\s*(tri\u1ec7u|tr|c\u1ee7|m)").matcher(q);
        if (approxMatcher.find()) {
            long price = this.parsePrice(approxMatcher.group(2));
            params.put("min_price", (long)((double)price * 0.7));
            params.put("max_price", (long)((double)price * 1.3));
            return;
        }
        Matcher rangeMatcher = Pattern.compile("(t\u1eeb|from)\\s*(\\d+(?:[.,]\\d+)?)\\s*(?:\u0111\u1ebfn|t\u1edbi|-)\\s*(\\d+(?:[.,]\\d+)?)\\s*(tri\u1ec7u|tr|c\u1ee7|m)").matcher(q);
        if (rangeMatcher.find()) {
            params.put("min_price", this.parsePrice(rangeMatcher.group(2)));
            params.put("max_price", this.parsePrice(rangeMatcher.group(3)));
            return;
        }
        Matcher standaloneMatcher = Pattern.compile("(\\d+(?:[.,]\\d+)?)\\s*(tri\u1ec7u|tr|c\u1ee7|m)").matcher(q);
        if (standaloneMatcher.find() && !this.containsAny(q, "h\u00f3a \u0111\u01a1n", "doanh thu", "n\u1ee3", "th\u00e1ng")) {
            params.put("max_price", this.parsePrice(standaloneMatcher.group(1)));
        }
    }

    private long parsePrice(String number) {
        double val = Double.parseDouble(number.replace(",", "."));
        return (long)(val * 1000000.0);
    }

    private void extractDistrict(String q, Map<String, Object> params) {
        for (String district : DISTRICTS) {
            if (!q.contains(district.toLowerCase())) continue;
            params.put("district", district);
            return;
        }
        Matcher m = Pattern.compile("(?:qu\u1eadn|q\\.?)\\s*(\\d{1,2})").matcher(q);
        if (m.find()) {
            params.put("district", "Qu\u1eadn " + m.group(1));
        }
    }

    private void extractLocation(String q, Map<String, Object> params) {
        Matcher m = Pattern.compile("g\u1ea7n\\s+([a-z\u00e0-\u1ef90-9\\s]+)").matcher(q);
        if (m.find()) {
            String loc = m.group(1).trim();
            if (!this.containsAny(loc, "t\u00f4i", "\u0111\u00e2y", "ch\u1ed7", "v\u1ecb tr\u00ed")) {
                params.put("location", loc);
            }
        }
    }

    private void extractMonthYear(String q, Map<String, Object> params) {
        Matcher m = Pattern.compile("th\u00e1ng\\s*(\\d{1,2})(?:\\s*/\\s*(\\d{4}))?").matcher(q);
        if (m.find()) {
            params.put("month", Integer.parseInt(m.group(1)));
            params.put("year", m.group(2) != null ? Integer.parseInt(m.group(2)) : LocalDate.now().getYear());
            return;
        }
        if (this.containsAny(q, "th\u00e1ng n\u00e0y", "th\u00e1ng hi\u1ec7n t\u1ea1i")) {
            params.put("month", LocalDate.now().getMonthValue());
            params.put("year", LocalDate.now().getYear());
            return;
        }
        if (this.containsAny(q, "th\u00e1ng tr\u01b0\u1edbc", "th\u00e1ng r\u1ed3i")) {
            LocalDate lastMonth = LocalDate.now().minusMonths(1L);
            params.put("month", lastMonth.getMonthValue());
            params.put("year", lastMonth.getYear());
            return;
        }
        Matcher yearMatcher = Pattern.compile("n\u0103m\\s*(\\d{4})").matcher(q);
        if (yearMatcher.find()) {
            params.put("year", Integer.parseInt(yearMatcher.group(1)));
        }
    }

    private void extractRoomType(String q, Map<String, Object> params) {
        for (Map.Entry<String, String> entry : ROOM_TYPE_MAP.entrySet()) {
            if (!q.contains(entry.getKey())) continue;
            params.put("room_type", entry.getValue());
            return;
        }
    }

    private void extractOccupants(String q, Map<String, Object> params) {
        Matcher m = Pattern.compile("(?:cho\\s+)?(\\d+)\\s*ng\u01b0\u1eddi").matcher(q);
        if (m.find()) {
            params.put("occupants", Integer.parseInt(m.group(1)));
            return;
        }
        if (this.containsAny(q, "1 m\u00ecnh", "m\u1ed9t m\u00ecnh", "\u1edf m\u1ed9t m\u00ecnh")) {
            params.put("occupants", 1);
        }
    }

    private String normalize(String text) {
        return Normalizer.normalize(text.toLowerCase().trim(), Normalizer.Form.NFC);
    }

    private boolean containsAny(String text, String ... keywords) {
        for (String kw : keywords) {
            if (!text.contains(kw)) continue;
            return true;
        }
        return false;
    }
}

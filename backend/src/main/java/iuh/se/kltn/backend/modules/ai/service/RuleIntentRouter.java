package iuh.se.kltn.backend.modules.ai.service;

import iuh.se.kltn.backend.modules.ai.dto.RuleIntentResult;
import iuh.se.kltn.backend.modules.ai.enums.SystemIntent;
import org.springframework.stereotype.Component;

import java.text.Normalizer;
import java.util.Optional;
import java.util.regex.Pattern;

@Component
public class RuleIntentRouter {

    private static final double RULE_ACCEPT_THRESHOLD = 0.85;

    public Optional<RuleIntentResult> classify(String question, String role) {
        if (question == null || question.isBlank()) {
            return Optional.empty();
        }

        String q = normalize(question);
        boolean isLandlord = "LANDLORD".equalsIgnoreCase(role);

        if (containsAny(q, "nợ", "chưa trả", "chưa đóng", "quá hạn", "trễ hạn", "còn nợ", "nợ tiền")) {
            if (containsAny(q, "khách", "ai nợ", "danh sách nợ", "phòng nào nợ", "người nợ")) {
                return Optional.of(RuleIntentResult.of(SystemIntent.VIEW_DEBTORS, 0.92));
            }
            if (isLandlord) {
                return Optional.of(RuleIntentResult.of(SystemIntent.VIEW_DEBTORS, 0.92));
            }
            return Optional.of(RuleIntentResult.of(SystemIntent.VIEW_DEBT, 0.93));
        }

        if (isLandlord && isRiskQuestion(q)) {
            return Optional.of(RuleIntentResult.of(SystemIntent.VIEW_RISK, 0.93));
        }

        if (containsAny(q, "cọc", "tiền cọc", "hoàn cọc", "mất cọc", "lấy lại cọc")
                && containsAny(q, "hoàn", "lấy lại", "mất", "quy định", "chính sách", "xử lý", "ra sao", "như thế nào", "có được")) {
            return Optional.of(RuleIntentResult.of(SystemIntent.DEPOSIT_POLICY, 0.95));
        }

        if (containsAny(q, "thanh toán", "trả tiền", "đóng tiền")
                && containsAny(q, "như thế nào", "ra sao", "cách nào", "hướng dẫn", "quy định", "chính sách")) {
            return Optional.of(RuleIntentResult.of(SystemIntent.PAYMENT_GUIDE, 0.95));
        }

        if (containsAny(q, "hợp đồng")
                && containsAny(q, "điều khoản", "quy định", "chính sách", "như thế nào", "ra sao", "bắt buộc")) {
            return Optional.of(RuleIntentResult.of(SystemIntent.CONTRACT_POLICY, 0.95));
        }

        if (containsAny(q, "hóa đơn", "hoá đơn", "bill", "tiền phòng", "tiền thuê", "tiền điện", "tiền nước")) {
            if (isLandlord) {
                if (containsAny(q, "chưa đóng", "còn nợ", "quá hạn", "nợ")) {
                    return Optional.of(RuleIntentResult.of(SystemIntent.VIEW_DEBTORS, 0.92));
                }
                if (containsAny(q, "doanh thu", "đã thu", "tổng tiền thu", "tổng thu")) {
                    return Optional.of(RuleIntentResult.of(SystemIntent.VIEW_REVENUE, 0.92));
                }
                // Landlord bill query is ambiguous between revenue and debtors.
                // Return UNKNOWN with high confidence so QueryContextEnricher asks for clarification.
                if (containsAny(q, "tháng này", "thang nay", "hóa đơn tháng này", "hoa don thang nay")) {
                    return Optional.of(RuleIntentResult.of(SystemIntent.UNKNOWN, 0.95));
                }
                return Optional.empty();
            }
            return Optional.of(RuleIntentResult.of(SystemIntent.VIEW_BILL, 0.92));
        }

        if (containsAny(q,
                "lịch hẹn hôm nay",
                "lich hen hom nay",
                "hẹn xem phòng",
                "hen xem phong",
                "tôi có lịch hẹn nào không",
                "toi co lich hen nao khong",
                "lịch hẹn",
                "lịch xem phòng",
                "cuộc hẹn",
                "hẹn xem")) {
            return Optional.of(RuleIntentResult.of(SystemIntent.VIEW_APPOINTMENT, 0.91));
        }

        if (containsAny(q, "hợp đồng", "hết hạn", "gia hạn", "tiền cọc", "đặt cọc", "cọc")) {
            return Optional.of(RuleIntentResult.of(SystemIntent.VIEW_CONTRACT, 0.90));
        }

        if (containsAny(q, "doanh thu", "thu nhập", "tổng tiền thu", "tiền đã thu", "báo cáo tài chính")) {
            return Optional.of(RuleIntentResult.of(SystemIntent.VIEW_REVENUE, 0.92));
        }

        if (containsAny(q, "khách nợ", "ai chưa đóng", "phòng chưa đóng", "danh sách nợ")) {
            return Optional.of(RuleIntentResult.of(SystemIntent.VIEW_DEBTORS, 0.92));
        }

        if (containsAny(q, "tỷ lệ lấp đầy", "phòng trống còn", "bao nhiêu phòng trống", "occupancy", "phòng đang bảo trì")) {
            if ("GUEST".equalsIgnoreCase(role)) {
                return Optional.of(RuleIntentResult.of(SystemIntent.SEARCH_ROOM, 0.90));
            }
            return Optional.of(RuleIntentResult.of(SystemIntent.VIEW_OCCUPANCY, 0.90));
        }

        if (containsAny(q, "gần tôi", "gần đây", "gần trường", "gần bệnh viện", "bán kính", "gần chỗ", "gần đại học", "gần đh")) {
            return Optional.of(RuleIntentResult.of(SystemIntent.LOCATION_SEARCH, 0.90));
        }

        if (Pattern.compile("gần\\s+[A-ZÀ-Ỹa-zà-ỹ]").matcher(q).find()) {
            return Optional.of(RuleIntentResult.of(SystemIntent.LOCATION_SEARCH, 0.85));
        }

        if (containsAny(q,
                "tìm phòng", "phòng trống", "phòng cho thuê", "thuê phòng", "phòng trọ", "cho thuê",
                "phòng giá", "phòng rẻ", "phòng có", "phòng studio", "phòng 1 người", "phòng 2 người",
                "có gác lửng", "có ban công", "nuôi thú cưng", "nuôi chó", "nuôi mèo")) {
            return Optional.of(RuleIntentResult.of(SystemIntent.SEARCH_ROOM, 0.88));
        }

        if (containsAny(q, "ưu nhược điểm", "ưu điểm", "nhược điểm", "đánh giá", "chi tiết phòng", "thông tin phòng", "tiền điện", "tiền nước", "giá điện", "tính thế nào")) {
            return Optional.of(RuleIntentResult.of(SystemIntent.VIEW_ROOM_DETAIL, 0.90));
        }

        if (Pattern.compile("(dưới|tầm|khoảng|từ|\\d+)\\s*(triệu|tr|củ|trăm)").matcher(q).find()
                && !containsAny(q, "hóa đơn", "hoá đơn", "nợ", "doanh thu")) {
            return Optional.of(RuleIntentResult.of(SystemIntent.SEARCH_ROOM, 0.85));
        }

        return Optional.empty();
    }

    public double getAcceptThreshold() {
        return RULE_ACCEPT_THRESHOLD;
    }

    private boolean isRiskQuestion(String q) {
        return containsAny(
                q,
                "hợp đồng sắp hết hạn",
                "hop dong sap het han",
                "phòng nào rủi ro",
                "phong nao rui ro",
                "khách nào sắp hết hạn hợp đồng",
                "khach nao sap het han hop dong"
        ) || (containsAny(q, "rủi ro", "rui ro")
                && containsAny(q, "hợp đồng", "hop dong", "phòng", "phong", "khách", "khach"));
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

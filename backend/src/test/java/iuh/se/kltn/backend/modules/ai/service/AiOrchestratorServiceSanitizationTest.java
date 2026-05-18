package iuh.se.kltn.backend.modules.ai.service;

import org.junit.jupiter.api.Test;

import java.lang.reflect.Method;
import java.util.LinkedHashMap;
import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;

class AiOrchestratorServiceSanitizationTest {

    private final AiOrchestratorService service = new AiOrchestratorService();

    @Test
    void shouldReplaceBillStatusCodesWithFriendlyVietnamese() {
        String input = "Hoa don dang o trang thai LATE, truoc do la UNPAID, sau khi nop tien se thanh PAID.";

        String sanitized = service.sanitizeForUserFacing(input);

        assertThat(sanitized).doesNotContain("LATE", "UNPAID", "PAID");
        assertThat(sanitized).contains("trễ hạn", "chưa thanh toán", "đã thanh toán");
    }

    @Test
    void shouldReplaceContractStatusCodesWithFriendlyVietnamese() {
        String input = "Hop dong PENDING_SIGNATURE, sau do AWAITING_DEPOSIT va ACTIVE.";

        String sanitized = service.sanitizeForUserFacing(input);

        assertThat(sanitized).doesNotContain("PENDING_SIGNATURE", "AWAITING_DEPOSIT", "ACTIVE");
        assertThat(sanitized).contains("chờ ký", "chờ đặt cọc", "đang hiệu lực");
    }

    @Test
    void shouldKeepNormalSentenceIntact() {
        String input = "He thong da ghi nhan yeu cau cua ban.";

        String sanitized = service.sanitizeForUserFacing(input);

        assertThat(sanitized).isEqualTo(input);
    }

    @Test
    void shouldBuildDifferentResultCacheKeyForDifferentQuestionsWhenParamsEmpty() throws Exception {
        Map<String, Object> emptyParams = Map.of();

        String key1 = invokeBuildCacheKey("VIEW_BILL", emptyParams, 1L, "TENANT",
                "Neu qua han thanh toan thi he thong ghi nhan the nao?");
        String key2 = invokeBuildCacheKey("VIEW_BILL", emptyParams, 1L, "TENANT",
                "Tong so tien toi con can thanh toan la bao nhieu?");

        assertThat(key1).isNotEqualTo(key2);
    }

    @Test
    void shouldBuildStableResultCacheKeyWhenOnlyParamOrderDiffers() throws Exception {
        Map<String, Object> paramsA = new LinkedHashMap<>();
        paramsA.put("year", 2026);
        paramsA.put("month", 12);

        Map<String, Object> paramsB = new LinkedHashMap<>();
        paramsB.put("month", 12);
        paramsB.put("year", 2026);

        String keyA = invokeBuildCacheKey("VIEW_BILL", paramsA, 1L, "TENANT", "Xem hoa don thang 12 nam 2026");
        String keyB = invokeBuildCacheKey("VIEW_BILL", paramsB, 1L, "TENANT", "Xem hoa don thang 12 nam 2026");

        assertThat(keyA).isEqualTo(keyB);
    }

    private String invokeBuildCacheKey(String intent, Map<String, Object> params, Long userId, String role, String question)
            throws Exception {
        Method method = AiOrchestratorService.class.getDeclaredMethod(
                "buildCacheKey", String.class, Map.class, Long.class, String.class, String.class);
        method.setAccessible(true);
        return (String) method.invoke(service, intent, params, userId, role, question);
    }
}

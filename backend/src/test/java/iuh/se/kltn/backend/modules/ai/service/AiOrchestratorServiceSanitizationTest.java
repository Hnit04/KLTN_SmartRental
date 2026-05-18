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
    void shouldRemoveTechnicalStatusInParenthesesFromNaturalSentence() {
        String input = "Hoa don se chuyen sang trang thai tre han (LATE) sau deadline.";

        String sanitized = service.sanitizeForUserFacing(input);

        assertThat(sanitized).doesNotContain("LATE");
        assertThat(sanitized).contains("tre han");
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

    @Test
    void shouldNormalizeYearAndMonthFunctionsToPostgresSyntax() throws Exception {
        String mysqlStyle = "SELECT * FROM bills b WHERE b.year = YEAR(CURRENT_DATE) AND b.month = MONTH(CURRENT_DATE)";

        String normalized = invokeNormalizeSqlDialectForPostgres(mysqlStyle);

        assertThat(normalized).doesNotContain("YEAR(CURRENT_DATE)", "MONTH(CURRENT_DATE)");
        assertThat(normalized).contains("EXTRACT(YEAR FROM CURRENT_DATE)::int");
        assertThat(normalized).contains("EXTRACT(MONTH FROM CURRENT_DATE)::int");
    }

    @Test
    void shouldNormalizeDateAddAndDatediffToPostgresSyntax() throws Exception {
        String mysqlStyle = "SELECT DATEDIFF(c.end_date, CURRENT_DATE) AS d FROM contracts c WHERE c.end_date <= DATE_ADD(CURRENT_DATE, INTERVAL 30 DAY)";

        String normalized = invokeNormalizeSqlDialectForPostgres(mysqlStyle);

        assertThat(normalized).doesNotContain("DATEDIFF(", "DATE_ADD(");
        assertThat(normalized).contains("(c.end_date::date - CURRENT_DATE)");
        assertThat(normalized).contains("(CURRENT_DATE + INTERVAL '30 day')");
    }

    @Test
    void shouldNormalizeGenericDatediffToPostgresSyntax() throws Exception {
        String mysqlStyle = "SELECT DATEDIFF(c.end_date, c.start_date) AS so_ngay FROM contracts c";

        String normalized = invokeNormalizeSqlDialectForPostgres(mysqlStyle);

        assertThat(normalized).doesNotContain("DATEDIFF(");
        assertThat(normalized).contains("(c.end_date::date - c.start_date::date)");
    }

    @Test
    void shouldRejectSemanticCacheSqlWhenQuestionIsDebtButSqlIsPaidHistory() throws Exception {
        String debtQuestion = "Tong so tien toi con can thanh toan la bao nhieu?";
        String paidHistorySql = "SELECT b.id FROM bills b JOIN contracts c ON b.contract_id = c.id "
                + "WHERE c.tenant_id = USER_ID_PLACEHOLDER AND b.status = 'PAID' ORDER BY b.paid_at DESC";

        boolean matched = invokeIsLikelySemanticSqlMatch(debtQuestion, paidHistorySql, "TENANT");

        assertThat(matched).isFalse();
    }

    @Test
    void shouldAcceptSemanticCacheSqlWhenQuestionAndSqlAreBothDebt() throws Exception {
        String debtQuestion = "Tong so tien toi con can thanh toan la bao nhieu?";
        String debtSql = "SELECT SUM(b.total_amount) AS tong_no FROM bills b JOIN contracts c ON b.contract_id = c.id "
                + "WHERE c.tenant_id = USER_ID_PLACEHOLDER AND b.status IN ('UNPAID','LATE')";

        boolean matched = invokeIsLikelySemanticSqlMatch(debtQuestion, debtSql, "TENANT");

        assertThat(matched).isTrue();
    }

    @Test
    void shouldDetectPolicyStyleQuestionWithoutPersonalCue() throws Exception {
        boolean policyStyle = invokeIsPolicyStyleQuestion("Han thanh toan hoa don la gi?");
        boolean personalCue = invokeHasPersonalDataCue("Han thanh toan hoa don la gi?");

        assertThat(policyStyle).isTrue();
        assertThat(personalCue).isFalse();
    }

    private String invokeBuildCacheKey(String intent, Map<String, Object> params, Long userId, String role, String question)
            throws Exception {
        Method method = AiOrchestratorService.class.getDeclaredMethod(
                "buildCacheKey", String.class, Map.class, Long.class, String.class, String.class);
        method.setAccessible(true);
        return (String) method.invoke(service, intent, params, userId, role, question);
    }

    private String invokeNormalizeSqlDialectForPostgres(String sql) throws Exception {
        Method method = AiOrchestratorService.class.getDeclaredMethod(
                "normalizeSqlDialectForPostgres", String.class);
        method.setAccessible(true);
        return (String) method.invoke(service, sql);
    }

    private boolean invokeIsLikelySemanticSqlMatch(String question, String sql, String role) throws Exception {
        Method method = AiOrchestratorService.class.getDeclaredMethod(
                "isLikelySemanticSqlMatch", String.class, String.class, String.class);
        method.setAccessible(true);
        return (boolean) method.invoke(service, question, sql, role);
    }

    private boolean invokeIsPolicyStyleQuestion(String question) throws Exception {
        Method method = AiOrchestratorService.class.getDeclaredMethod(
                "isPolicyStyleQuestion", String.class);
        method.setAccessible(true);
        return (boolean) method.invoke(service, question);
    }

    private boolean invokeHasPersonalDataCue(String question) throws Exception {
        Method method = AiOrchestratorService.class.getDeclaredMethod(
                "hasPersonalDataCue", String.class);
        method.setAccessible(true);
        return (boolean) method.invoke(service, question);
    }
}

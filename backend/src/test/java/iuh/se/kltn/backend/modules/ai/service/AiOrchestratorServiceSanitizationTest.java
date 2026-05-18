package iuh.se.kltn.backend.modules.ai.service;

import org.junit.jupiter.api.Test;

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
}

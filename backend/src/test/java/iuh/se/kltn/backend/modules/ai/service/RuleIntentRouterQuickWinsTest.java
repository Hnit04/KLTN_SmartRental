package iuh.se.kltn.backend.modules.ai.service;

import iuh.se.kltn.backend.modules.ai.dto.RuleIntentResult;
import iuh.se.kltn.backend.modules.ai.enums.SystemIntent;
import org.junit.jupiter.api.Test;

import java.util.Optional;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;

class RuleIntentRouterQuickWinsTest {

    private final RuleIntentRouter router = new RuleIntentRouter();

    @Test
    void shouldRouteViewAppointmentWithNewPhrases() {
        Optional<RuleIntentResult> r1 = router.classify("lịch hẹn hôm nay", "TENANT");
        Optional<RuleIntentResult> r2 = router.classify("hẹn xem phòng", "TENANT");
        Optional<RuleIntentResult> r3 = router.classify("tôi có lịch hẹn nào không", "TENANT");

        assertTrue(r1.isPresent());
        assertTrue(r2.isPresent());
        assertTrue(r3.isPresent());
        assertEquals(SystemIntent.VIEW_APPOINTMENT, r1.get().intent());
        assertEquals(SystemIntent.VIEW_APPOINTMENT, r2.get().intent());
        assertEquals(SystemIntent.VIEW_APPOINTMENT, r3.get().intent());
    }

    @Test
    void shouldRouteViewRiskForLandlord() {
        Optional<RuleIntentResult> r1 = router.classify("hợp đồng sắp hết hạn", "LANDLORD");
        Optional<RuleIntentResult> r2 = router.classify("phòng nào rủi ro", "LANDLORD");
        Optional<RuleIntentResult> r3 = router.classify("khách nào sắp hết hạn hợp đồng", "LANDLORD");

        assertTrue(r1.isPresent());
        assertTrue(r2.isPresent());
        assertTrue(r3.isPresent());
        assertEquals(SystemIntent.VIEW_RISK, r1.get().intent());
        assertEquals(SystemIntent.VIEW_RISK, r2.get().intent());
        assertEquals(SystemIntent.VIEW_RISK, r3.get().intent());
    }

    @Test
    void landlordHoaDonThangNayShouldGoToClarificationPath() {
        Optional<RuleIntentResult> result = router.classify("hóa đơn tháng này", "LANDLORD");
        assertTrue(result.isPresent());
        assertEquals(SystemIntent.UNKNOWN, result.get().intent());
    }
}

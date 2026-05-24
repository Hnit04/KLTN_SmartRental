package iuh.se.kltn.backend.modules.ai.service;

import iuh.se.kltn.backend.modules.ai.enums.SystemIntent;
import org.junit.jupiter.api.Test;

import java.util.Map;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;

class RuleEntityExtractorPriceQuickWinsTest {

    private final RuleEntityExtractor extractor = new RuleEntityExtractor();

    @Test
    void shouldExtractHaiTrieuRuoi() {
        Map<String, Object> params = extractor.extract("Tìm phòng tầm hai triệu rưỡi", SystemIntent.SEARCH_ROOM);
        assertEquals(1_750_000L, params.get("min_price"));
        assertEquals(3_250_000L, params.get("max_price"));
    }

    @Test
    void shouldExtractCompact2tr5() {
        Map<String, Object> params = extractor.extract("Tìm phòng dưới 2tr5", SystemIntent.SEARCH_ROOM);
        assertEquals(2_500_000L, params.get("max_price"));
    }

    @Test
    void shouldExtractRangeTu3trDen5tr() {
        Map<String, Object> params = extractor.extract("Tìm phòng từ 3tr đến 5tr", SystemIntent.SEARCH_ROOM);
        assertEquals(3_000_000L, params.get("min_price"));
        assertEquals(5_000_000L, params.get("max_price"));
    }

    @Test
    void shouldNotBreakWordsBangAndNam() {
        Map<String, Object> params = extractor.extract("Xem bảng nội quy năm nay", SystemIntent.VIEW_CONTRACT);
        assertFalse(params.containsKey("max_price"));
        assertFalse(params.containsKey("min_price"));
    }
}

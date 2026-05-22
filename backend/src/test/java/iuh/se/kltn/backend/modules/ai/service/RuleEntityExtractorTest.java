/*
 * Decompiled with CFR 0.152.
 * 
 * Could not load the following classes:
 *  iuh.se.kltn.backend.modules.ai.enums.SystemIntent
 *  iuh.se.kltn.backend.modules.ai.service.RuleEntityExtractor
 *  org.junit.jupiter.api.Assertions
 *  org.junit.jupiter.api.BeforeEach
 *  org.junit.jupiter.api.Test
 */
package iuh.se.kltn.backend.modules.ai.service;

import iuh.se.kltn.backend.modules.ai.enums.SystemIntent;
import iuh.se.kltn.backend.modules.ai.service.RuleEntityExtractor;
import java.time.LocalDate;
import java.util.Map;
import org.junit.jupiter.api.Assertions;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

class RuleEntityExtractorTest {
    private RuleEntityExtractor extractor;

    RuleEntityExtractorTest() {
    }

    @BeforeEach
    void setUp() {
        this.extractor = new RuleEntityExtractor();
    }

    @Test
    void extractPrice_NumericAndStringFormats() {
        Map res1 = this.extractor.extract("2 c\u1ee7 r\u01b0\u1ee1i", SystemIntent.SEARCH_ROOM);
        Assertions.assertEquals((Object)2500000L, res1.get("max_price"));
        Map res2 = this.extractor.extract("hai tri\u1ec7u r\u01b0\u1ee1i", SystemIntent.SEARCH_ROOM);
        Assertions.assertEquals((Object)2500000L, res2.get("max_price"));
        Map res3 = this.extractor.extract("hai tri\u1ec7u", SystemIntent.SEARCH_ROOM);
        Assertions.assertEquals((Object)2000000L, res3.get("max_price"));
    }

    @Test
    void extractDate_MonthsAndYears() {
        Map res1 = this.extractor.extract("th\u00e1ng tr\u01b0\u1edbc", SystemIntent.VIEW_BILL);
        LocalDate lastMonth = LocalDate.now().minusMonths(1L);
        Assertions.assertEquals((Object)lastMonth.getMonthValue(), res1.get("month"));
        Assertions.assertEquals((Object)lastMonth.getYear(), res1.get("year"));
        Map res2 = this.extractor.extract("doanh thu n\u0103m 2026", SystemIntent.VIEW_REVENUE);
        Assertions.assertEquals((Object)2026, res2.get("year"));
    }

    @Test
    void extractAmenities() {
        Map res1 = this.extractor.extract("c\u00f3 m\u00e1y l\u1ea1nh", SystemIntent.SEARCH_ROOM);
        Assertions.assertEquals((Object)"m\u00e1y l\u1ea1nh", res1.get("amenity_keyword"));
        Map res2 = this.extractor.extract("c\u00f3 ch\u1ed7 \u0111\u1ec3 xe kh\u00f4ng", SystemIntent.SEARCH_ROOM);
        Assertions.assertEquals((Object)"ch\u1ed7 \u0111\u1ec3 xe", res2.get("amenity_keyword"));
        Map res3 = this.extractor.extract("t\u00ecm ph\u00f2ng c\u00f3 wc ri\u00eang", SystemIntent.SEARCH_ROOM);
        Assertions.assertEquals((Object)"wc ri\u00eang", res3.get("amenity_keyword"));
    }
}

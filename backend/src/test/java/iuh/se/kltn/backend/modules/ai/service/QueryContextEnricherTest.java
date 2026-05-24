package iuh.se.kltn.backend.modules.ai.service;

import iuh.se.kltn.backend.modules.ai.config.AiRuntimeProperties;
import iuh.se.kltn.backend.modules.ai.dto.EnrichedQuery;
import iuh.se.kltn.backend.modules.ai.enums.SystemIntent;
import iuh.se.kltn.backend.modules.user.repository.UserRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.LocalDate;
import java.util.HashMap;
import java.util.Map;
import java.util.Optional;
import java.util.Set;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class QueryContextEnricherTest {

    @Mock
    private UserRepository userRepository;

    private QueryContextEnricher enricher;

    @BeforeEach
    void setUp() {
        AiRuntimeProperties props = new AiRuntimeProperties();
        props.getSearch().setDefaultRadiusKm(5.0);
        enricher = new QueryContextEnricher(userRepository, props);
    }

    @Test
    void enrich_searchRoomCheap_withGps_addsGeoAndCheapMode() {
        EnrichedQuery result = enricher.enrich(
                "tim phong tro gia re",
                SystemIntent.SEARCH_ROOM,
                new HashMap<>(),
                101L,
                "GUEST",
                10.7768,
                106.7009
        );

        assertFalse(result.isShouldAskClarification());
        assertEquals("CHEAP", result.getParams().get("priceMode"));
        assertEquals("PRICE_ASC_WITH_DISTANCE", result.getParams().get("sort"));
        assertEquals(10.7768, ((Number) result.getParams().get("lat")).doubleValue(), 0.0001);
        assertEquals(106.7009, ((Number) result.getParams().get("lng")).doubleValue(), 0.0001);
        assertTrue(result.getParams().containsKey("radiusKm"));
    }

    @Test
    void enrich_searchRoomCheap_withoutGpsAndProfile_asksForArea() {
        when(userRepository.findById(anyLong())).thenReturn(Optional.empty());

        EnrichedQuery result = enricher.enrich(
                "tim phong gia re",
                SystemIntent.SEARCH_ROOM,
                new HashMap<>(),
                101L,
                "GUEST",
                null,
                null
        );

        assertTrue(result.isShouldAskClarification());
        assertNotNull(result.getClarificationMessage());
        assertTrue(result.getClarificationMessage().toLowerCase().contains("khu vực"));
    }

    @Test
    void enrich_nearMe_withoutGps_requiresLocationPermission_andDoesNotFallbackToProfileAddress() {
        EnrichedQuery result = enricher.enrich(
                "tim phong gan toi",
                SystemIntent.LOCATION_SEARCH,
                new HashMap<>(),
                77L,
                "TENANT",
                null,
                null
        );

        assertTrue(result.isShouldAskClarification());
        assertNotNull(result.getClarificationMessage());
        assertTrue(result.getClarificationMessage().toLowerCase().contains("bật quyền vị trí"));
        assertFalse(result.getParams().containsKey("district"));
        assertFalse(result.getParams().containsKey("city"));
        verifyNoInteractions(userRepository);
    }

    @Test
    void enrich_viewBill_missingMonthYear_defaultsToCurrentMonthYear() {
        EnrichedQuery result = enricher.enrich(
                "hoa don bao nhieu",
                SystemIntent.VIEW_BILL,
                new HashMap<>(),
                9L,
                "TENANT",
                null,
                null
        );

        LocalDate now = LocalDate.now();
        assertFalse(result.isShouldAskClarification());
        assertEquals(now.getMonthValue(), result.getParams().get("month"));
        assertEquals(now.getYear(), result.getParams().get("year"));
    }

    @Test
    void enrich_viewDebt_tenant_noClarification() {
        EnrichedQuery result = enricher.enrich(
                "toi con no gi khong",
                SystemIntent.VIEW_DEBT,
                new HashMap<>(),
                10L,
                "TENANT",
                null,
                null
        );

        assertFalse(result.isShouldAskClarification());
    }

    @Test
    void enrich_deicticReferenceWithoutPageContext_asksClarification() {
        EnrichedQuery result = enricher.enrich(
                "phong nay con trong khong",
                SystemIntent.SEARCH_ROOM,
                new HashMap<>(),
                1L,
                "GUEST",
                null,
                null
        );

        assertTrue(result.isShouldAskClarification());
        assertNotNull(result.getClarificationMessage());
        assertTrue(result.getClarificationMessage().toLowerCase().contains("phòng, hóa đơn hay hợp đồng"));
    }

    @Test
    void enrich_landlordAmbiguousBillQuestion_asksRevenueOrDebtorClarification() {
        EnrichedQuery result = enricher.enrich(
                "hoa don thang nay",
                SystemIntent.UNKNOWN,
                new HashMap<>(),
                88L,
                "LANDLORD",
                null,
                null
        );

        assertTrue(result.isShouldAskClarification());
        assertNotNull(result.getClarificationMessage());
        assertTrue(result.getClarificationMessage().toLowerCase().contains("doanh thu"));
        assertTrue(result.getClarificationMessage().toLowerCase().contains("chưa thanh toán"));
    }

    @Test
    void enrich_doesNotUseGenderAgePhoneEmailSensitiveFields() {
        Map<String, Object> baseParams = new HashMap<>();
        EnrichedQuery result = enricher.enrich(
                "tim phong gia re cho nu o mot minh gan toi",
                SystemIntent.SEARCH_ROOM,
                baseParams,
                15L,
                "GUEST",
                10.0,
                106.0
        );

        Set<String> sensitiveKeys = Set.of(
                "gender",
                "age",
                "phone",
                "email",
                "cccd",
                "bankAccount",
                "bankNumber",
                "wallet"
        );
        for (String key : sensitiveKeys) {
            assertFalse(result.getParams().containsKey(key), "Unexpected sensitive enrichment key: " + key);
        }
    }
}

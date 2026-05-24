package iuh.se.kltn.backend.modules.ai.service;

import dev.langchain4j.data.segment.TextSegment;
import dev.langchain4j.model.embedding.EmbeddingModel;
import dev.langchain4j.store.embedding.EmbeddingStore;
import iuh.se.kltn.backend.modules.ai.config.AiRuntimeProperties;
import iuh.se.kltn.backend.modules.ai.dto.EnrichedQuery;
import iuh.se.kltn.backend.modules.ai.dto.RuleIntentResult;
import iuh.se.kltn.backend.modules.ai.enums.SystemIntent;
import iuh.se.kltn.backend.modules.ai.repository.AiActionLogRepository;
import iuh.se.kltn.backend.modules.ai.repository.AiSqlCacheRepository;
import iuh.se.kltn.backend.modules.ai.service.handler.DynamicQueryEngine;
import iuh.se.kltn.backend.modules.property.repository.PropertyRepository;
import iuh.se.kltn.backend.modules.user.repository.UserRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.cache.CacheManager;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.util.ReflectionTestUtils;

import java.text.Normalizer;
import java.util.List;
import java.util.Map;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class AiOrchestratorServiceContextClarificationTest {

    @Mock
    private SqlGeneratorAi sqlGeneratorAi;
    @Mock
    private SecurityGateService securityGateService;
    @Mock
    private IntentExtractorAi intentExtractorAi;
    @Mock
    private DynamicQueryEngine dynamicQueryEngine;
    @Mock
    private AiSqlCacheRepository aiSqlCacheRepository;
    @Mock
    private AiActionLogRepository aiActionLogRepository;
    @Mock
    private CacheManager cacheManager;
    @Mock
    private JdbcTemplate jdbcTemplate;
    @Mock
    private DataPresenterAi dataPresenterAi;
    @Mock
    private RuleIntentRouter ruleIntentRouter;
    @Mock
    private RuleEntityExtractor ruleEntityExtractor;
    @Mock
    private TemplateResponseService templateResponseService;
    @Mock
    private PresenterDataSanitizer presenterDataSanitizer;
    @Mock
    private PropertyRepository propertyRepository;
    @Mock
    private UserRepository userRepository;
    @Mock
    private QueryContextEnricher queryContextEnricherMock;
    @Mock
    private EmbeddingModel embeddingModel;
    @Mock
    private EmbeddingStore<TextSegment> embeddingStore;

    private AiOrchestratorService service;
    private QueryContextEnricher realQueryContextEnricher;

    @BeforeEach
    void setUp() {
        AiRuntimeProperties runtimeProperties = new AiRuntimeProperties();
        runtimeProperties.getFeatures().getQueryData().setLlmEnabled(false);
        runtimeProperties.getSearch().setDefaultRadiusKm(5.0);

        realQueryContextEnricher = new QueryContextEnricher(userRepository, runtimeProperties);

        service = new AiOrchestratorService();
        ReflectionTestUtils.setField(service, "sqlGeneratorAi", sqlGeneratorAi);
        ReflectionTestUtils.setField(service, "securityGateService", securityGateService);
        ReflectionTestUtils.setField(service, "intentExtractorAi", intentExtractorAi);
        ReflectionTestUtils.setField(service, "dynamicQueryEngine", dynamicQueryEngine);
        ReflectionTestUtils.setField(service, "cacheRepository", aiSqlCacheRepository);
        ReflectionTestUtils.setField(service, "actionLogRepository", aiActionLogRepository);
        ReflectionTestUtils.setField(service, "cacheManager", cacheManager);
        ReflectionTestUtils.setField(service, "jdbcTemplate", jdbcTemplate);
        ReflectionTestUtils.setField(service, "dataPresenterAi", dataPresenterAi);
        ReflectionTestUtils.setField(service, "ruleIntentRouter", ruleIntentRouter);
        ReflectionTestUtils.setField(service, "ruleEntityExtractor", ruleEntityExtractor);
        ReflectionTestUtils.setField(service, "queryContextEnricher", realQueryContextEnricher);
        ReflectionTestUtils.setField(service, "templateResponseService", templateResponseService);
        ReflectionTestUtils.setField(service, "presenterDataSanitizer", presenterDataSanitizer);
        ReflectionTestUtils.setField(service, "propertyRepository", propertyRepository);
        ReflectionTestUtils.setField(service, "aiRuntimeProperties", runtimeProperties);
        ReflectionTestUtils.setField(service, "aiLlmMode", "FULL");
        ReflectionTestUtils.setField(service, "embeddingModel", embeddingModel);
        ReflectionTestUtils.setField(service, "embeddingStore", embeddingStore);
    }

    @Test
    void landlordAmbiguousBill_shouldEarlyClarify_andNotCallDqePresenterOrSqlGenerator() {
        String question = "hoa don thang nay";

        when(ruleIntentRouter.classify(question, "LANDLORD")).thenReturn(Optional.empty());
        when(queryContextEnricherMock.enrich(
                org.mockito.ArgumentMatchers.anyString(),
                org.mockito.ArgumentMatchers.any(SystemIntent.class),
                org.mockito.ArgumentMatchers.any(),
                org.mockito.ArgumentMatchers.anyLong(),
                org.mockito.ArgumentMatchers.anyString(),
                org.mockito.ArgumentMatchers.any(),
                org.mockito.ArgumentMatchers.any(),
                org.mockito.ArgumentMatchers.any()
        )).thenReturn(EnrichedQuery.builder()
                .intent(SystemIntent.UNKNOWN)
                .params(Map.of())
                .shouldAskClarification(true)
                .clarificationMessage("Ban muon xem doanh thu da thu hay danh sach khach thue chua thanh toan?")
                .build());

        ReflectionTestUtils.setField(service, "queryContextEnricher", queryContextEnricherMock);

        Object result = service.processDataQuery(question, "LANDLORD", 2001L, null, null);

        assertThat(result).isInstanceOf(String.class);
        String response = normalizeForAssert((String) result);
        assertThat(response).contains("doanh thu");
        assertThat(response).contains("chua thanh toan");

        verify(dynamicQueryEngine, never())
                .execute(org.mockito.ArgumentMatchers.any(), org.mockito.ArgumentMatchers.anyLong(), org.mockito.ArgumentMatchers.anyString());
        verify(dataPresenterAi, never())
                .generateNaturalResponse(org.mockito.ArgumentMatchers.anyString(), org.mockito.ArgumentMatchers.anyString(), org.mockito.ArgumentMatchers.anyString());
        verify(sqlGeneratorAi, never())
                .generateSql(
                        org.mockito.ArgumentMatchers.anyString(),
                        org.mockito.ArgumentMatchers.anyString(),
                        org.mockito.ArgumentMatchers.anyLong(),
                        org.mockito.ArgumentMatchers.anyString(),
                        org.mockito.ArgumentMatchers.anyString()
                );
    }

    @Test
    void searchRoomCheap_withoutGpsAndWithoutProfileLocation_shouldAskArea_andNotCallDqe() {
        String question = "tim phong gia re";

        when(ruleIntentRouter.classify(question, "GUEST"))
                .thenReturn(Optional.of(RuleIntentResult.of(SystemIntent.SEARCH_ROOM, 0.92)));
        when(ruleEntityExtractor.extract(anyString(), org.mockito.ArgumentMatchers.any(SystemIntent.class)))
                .thenReturn(Map.of());
        when(userRepository.findById(anyLong())).thenReturn(Optional.empty());

        ReflectionTestUtils.setField(service, "queryContextEnricher", realQueryContextEnricher);

        Object result = service.processDataQuery(question, "GUEST", 3001L, null, null);

        assertThat(result).isInstanceOf(String.class);
        String response = normalizeForAssert((String) result);
        assertThat(response).contains("khu vuc");

        verify(dynamicQueryEngine, never())
                .execute(org.mockito.ArgumentMatchers.any(), org.mockito.ArgumentMatchers.anyLong(), org.mockito.ArgumentMatchers.anyString());
    }

    @Test
    void nearMeWithoutGps_shouldAskToEnableLocation_andNotCallDqePresenterOrSqlGenerator() {
        String question = "tim phong gan toi";

        Object result = service.processDataQuery(question, "GUEST", 3002L, null, null);

        assertThat(result).isInstanceOf(String.class);
        String response = normalizeForAssert((String) result);
        assertThat(response).contains("bat quyen vi tri");

        verify(dynamicQueryEngine, never())
                .execute(org.mockito.ArgumentMatchers.any(), org.mockito.ArgumentMatchers.anyLong(), org.mockito.ArgumentMatchers.anyString());
        verify(dataPresenterAi, never())
                .generateNaturalResponse(org.mockito.ArgumentMatchers.anyString(), org.mockito.ArgumentMatchers.anyString(), org.mockito.ArgumentMatchers.anyString());
        verify(sqlGeneratorAi, never())
                .generateSql(
                        org.mockito.ArgumentMatchers.anyString(),
                        org.mockito.ArgumentMatchers.anyString(),
                        org.mockito.ArgumentMatchers.anyLong(),
                        org.mockito.ArgumentMatchers.anyString(),
                        org.mockito.ArgumentMatchers.anyString()
                );
    }

    @Test
    void templateOnlyFallback_shouldNotUseSemanticSqlCache_orSqlGenerator() {
        String question = "toi can thong tin";

        when(ruleIntentRouter.classify(question, "GUEST")).thenReturn(Optional.empty());
        ReflectionTestUtils.setField(service, "queryContextEnricher", realQueryContextEnricher);

        Object result = service.processDataQuery(question, "GUEST", 3003L, null, null);

        assertThat(result).isInstanceOf(String.class);
        String response = normalizeForAssert((String) result);
        assertThat(response).contains("chua du du lieu");

        verify(embeddingModel, never()).embed(anyString());
        verify(embeddingStore, never()).search(org.mockito.ArgumentMatchers.any());
        verify(sqlGeneratorAi, never())
                .generateSql(
                        org.mockito.ArgumentMatchers.anyString(),
                        org.mockito.ArgumentMatchers.anyString(),
                        org.mockito.ArgumentMatchers.anyLong(),
                        org.mockito.ArgumentMatchers.anyString(),
                        org.mockito.ArgumentMatchers.anyString()
                );
    }

    @Test
    void currentLocationCheapCue_shouldNotForceHardcodedThreeMillionFilter() {
        String question = "toi muon tim phong re gan day";

        when(propertyRepository.findNearbyRoomsAdvanced(
                org.mockito.ArgumentMatchers.anyDouble(),
                org.mockito.ArgumentMatchers.anyDouble(),
                org.mockito.ArgumentMatchers.anyDouble(),
                org.mockito.ArgumentMatchers.anyLong(),
                org.mockito.ArgumentMatchers.anyInt(),
                org.mockito.ArgumentMatchers.anyBoolean()
        )).thenReturn(java.util.List.of());

        Object result = service.processDataQuery(question, "GUEST", 4001L, 10.82212175, 106.68701375);

        assertThat(result).isInstanceOf(String.class);
        String response = normalizeForAssert((String) result);
        assertThat(response).contains("khong tim thay");

        ArgumentCaptor<Long> maxPriceCaptor = ArgumentCaptor.forClass(Long.class);
        verify(propertyRepository).findNearbyRoomsAdvanced(
                eq(10.82212175),
                eq(106.68701375),
                org.mockito.ArgumentMatchers.anyDouble(),
                maxPriceCaptor.capture(),
                org.mockito.ArgumentMatchers.anyInt(),
                eq(false)
        );
        assertThat(maxPriceCaptor.getValue()).isEqualTo(Long.MAX_VALUE);
    }

    @Test
    void currentLocationExplicitBudget_shouldStillApplyHardPriceFilter() {
        String question = "toi muon tim phong re gan day duoi 3 trieu";

        when(propertyRepository.findNearbyRoomsAdvanced(
                org.mockito.ArgumentMatchers.anyDouble(),
                org.mockito.ArgumentMatchers.anyDouble(),
                org.mockito.ArgumentMatchers.anyDouble(),
                org.mockito.ArgumentMatchers.anyLong(),
                org.mockito.ArgumentMatchers.anyInt(),
                org.mockito.ArgumentMatchers.anyBoolean()
        )).thenReturn(java.util.List.of());

        Object result = service.processDataQuery(question, "GUEST", 4002L, 10.82212175, 106.68701375);

        assertThat(result).isInstanceOf(String.class);
        String response = normalizeForAssert((String) result);
        assertThat(response).contains("khong tim thay");

        ArgumentCaptor<Long> maxPriceCaptor = ArgumentCaptor.forClass(Long.class);
        verify(propertyRepository).findNearbyRoomsAdvanced(
                eq(10.82212175),
                eq(106.68701375),
                org.mockito.ArgumentMatchers.anyDouble(),
                maxPriceCaptor.capture(),
                org.mockito.ArgumentMatchers.anyInt(),
                eq(false)
        );
        assertThat(maxPriceCaptor.getValue()).isEqualTo(3_000_000L);
    }

    @Test
    void currentLocationCheapCue_shouldRankByPriceAndDistance_withoutHardFilteringWhenFewRooms() {
        String question = "toi muon tim phong re gan day";

        List<Map<String, Object>> mockedRooms = List.of(
                Map.of(
                        "room_id", 1L,
                        "name", "Phong A",
                        "price", 3_000_000L,
                        "distance_km", 0.3,
                        "images", "[]"
                ),
                Map.of(
                        "room_id", 2L,
                        "name", "Phong B",
                        "price", 2_000_000L,
                        "distance_km", 0.6,
                        "images", "[]"
                )
        );

        when(propertyRepository.findNearbyRoomsAdvanced(
                org.mockito.ArgumentMatchers.anyDouble(),
                org.mockito.ArgumentMatchers.anyDouble(),
                org.mockito.ArgumentMatchers.anyDouble(),
                org.mockito.ArgumentMatchers.anyLong(),
                org.mockito.ArgumentMatchers.anyInt(),
                org.mockito.ArgumentMatchers.anyBoolean()
        )).thenReturn(mockedRooms);

        Object result = service.processDataQuery(question, "GUEST", 4003L, 10.82212175, 106.68701375);

        assertThat(result).isInstanceOf(String.class);
        String response = (String) result;
        assertThat(response).contains("[ROOM_CARD: 1");
        assertThat(response).contains("[ROOM_CARD: 2");

        int room2Index = response.indexOf("[ROOM_CARD: 2");
        int room1Index = response.indexOf("[ROOM_CARD: 1");
        assertThat(room2Index).isGreaterThanOrEqualTo(0);
        assertThat(room1Index).isGreaterThanOrEqualTo(0);
        assertThat(room2Index).isLessThan(room1Index);
    }

    private String normalizeForAssert(String text) {
        if (text == null) {
            return "";
        }
        String lower = text.toLowerCase();
        return Normalizer.normalize(lower, Normalizer.Form.NFD)
                .replaceAll("\\p{M}+", "")
                .replaceAll("\\s+", " ")
                .trim();
    }
}

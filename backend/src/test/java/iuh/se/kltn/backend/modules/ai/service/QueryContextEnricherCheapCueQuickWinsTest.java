package iuh.se.kltn.backend.modules.ai.service;

import iuh.se.kltn.backend.modules.ai.config.AiRuntimeProperties;
import iuh.se.kltn.backend.modules.ai.dto.EnrichedQuery;
import iuh.se.kltn.backend.modules.ai.enums.SystemIntent;
import iuh.se.kltn.backend.modules.user.repository.UserRepository;
import org.junit.jupiter.api.Test;

import java.util.HashMap;

import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.mockito.Mockito.mock;

class QueryContextEnricherCheapCueQuickWinsTest {

    @Test
    void shouldNotTreatTreEmAsCheapCue() {
        QueryContextEnricher enricher = new QueryContextEnricher(
                mock(UserRepository.class),
                new AiRuntimeProperties()
        );

        EnrichedQuery enriched = enricher.enrich(
                "Tìm phòng cho trẻ em",
                SystemIntent.SEARCH_ROOM,
                new HashMap<>(),
                null,
                "GUEST",
                null,
                null
        );

        assertFalse(enriched.getParams().containsKey("priceMode"));
    }
}

package iuh.se.kltn.backend.modules.ai.service;

import dev.langchain4j.service.spring.AiService;
import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;

class SmartRentalAiWiringTest {

    @Test
    void smartRentalAi_shouldExplicitlyWireContentRetrieverBean() throws Exception {
        Class<?> aiServiceClass = Class.forName("iuh.se.kltn.backend.modules.ai.service.SmartRentalAi");
        AiService annotation = aiServiceClass.getAnnotation(AiService.class);
        assertThat(annotation).isNotNull();
        assertThat(annotation.contentRetriever()).isEqualTo("contentRetriever");
    }
}

package iuh.se.kltn.backend.common.config;

import dev.langchain4j.data.embedding.Embedding;
import dev.langchain4j.store.embedding.EmbeddingSearchRequest;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.jdbc.core.RowMapper;

import java.util.Arrays;
import java.util.Collections;

import static dev.langchain4j.store.embedding.filter.MetadataFilterBuilder.metadataKey;
import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class PgVectorEmbeddingStoreTest {

    @Mock
    private org.springframework.jdbc.core.JdbcTemplate jdbcTemplate;

    private PgVectorEmbeddingStore store;

    @BeforeEach
    void setUp() {
        store = new PgVectorEmbeddingStore(jdbcTemplate);
    }

    @Test
    void search_shouldApplyMetadataFilterFromRequest() {
        when(jdbcTemplate.query(
                anyString(),
                any(RowMapper.class),
                any(),
                any(),
                any(),
                any(),
                any(),
                any(),
                any()
        ))
                .thenReturn(Collections.emptyList());

        EmbeddingSearchRequest request = EmbeddingSearchRequest.builder()
                .queryEmbedding(Embedding.from(new float[]{0.1f, 0.2f, 0.3f}))
                .maxResults(1)
                .minScore(0.7)
                .filter(metadataKey("type").isEqualTo("FAQ"))
                .build();

        store.search(request);

        ArgumentCaptor<String> sqlCaptor = ArgumentCaptor.forClass(String.class);
        ArgumentCaptor<Object[]> argsCaptor = ArgumentCaptor.forClass(Object[].class);

        verify(jdbcTemplate).query(sqlCaptor.capture(), any(RowMapper.class), argsCaptor.capture());

        assertThat(sqlCaptor.getValue()).contains("metadata_json ->> ?");
        assertThat(Arrays.asList(argsCaptor.getValue())).contains("type", "FAQ");
    }

    @Test
    void removeAll_withFilter_shouldDeleteOnlyMatchingMetadata() {
        store.removeAll(metadataKey("type").isEqualTo("document").and(metadataKey("docId").isEqualTo("doc-1")));

        ArgumentCaptor<String> sqlCaptor = ArgumentCaptor.forClass(String.class);
        ArgumentCaptor<Object[]> argsCaptor = ArgumentCaptor.forClass(Object[].class);

        verify(jdbcTemplate).update(sqlCaptor.capture(), argsCaptor.capture());

        assertThat(sqlCaptor.getValue()).contains("DELETE FROM ai_embeddings WHERE");
        assertThat(sqlCaptor.getValue()).contains("metadata_json ->> ?");
        assertThat(Arrays.asList(argsCaptor.getValue())).contains("type", "document", "docId", "doc-1");
    }

    @Test
    void removeAll_withoutFilter_shouldDeleteWholeEmbeddingTable() {
        store.removeAll();
        verify(jdbcTemplate).update(eq("DELETE FROM ai_embeddings"));
    }

    @Test
    void removeByMetadata_shouldDelegateToFilteredDelete() {
        store.removeByMetadata("docId", "abc");

        ArgumentCaptor<String> sqlCaptor = ArgumentCaptor.forClass(String.class);
        ArgumentCaptor<Object[]> argsCaptor = ArgumentCaptor.forClass(Object[].class);

        verify(jdbcTemplate).update(sqlCaptor.capture(), argsCaptor.capture());

        assertThat(sqlCaptor.getValue()).contains("metadata_json ->> ?");
        assertThat(Arrays.asList(argsCaptor.getValue())).contains("docId", "abc");
    }
}

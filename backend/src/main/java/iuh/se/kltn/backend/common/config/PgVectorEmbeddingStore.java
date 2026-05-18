package iuh.se.kltn.backend.common.config;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import dev.langchain4j.data.document.Metadata;
import dev.langchain4j.data.embedding.Embedding;
import dev.langchain4j.data.segment.TextSegment;
import dev.langchain4j.store.embedding.EmbeddingMatch;
import dev.langchain4j.store.embedding.EmbeddingSearchRequest;
import dev.langchain4j.store.embedding.EmbeddingSearchResult;
import dev.langchain4j.store.embedding.EmbeddingStore;
import dev.langchain4j.store.embedding.filter.Filter;
import dev.langchain4j.store.embedding.filter.comparison.IsEqualTo;
import dev.langchain4j.store.embedding.filter.comparison.IsIn;
import dev.langchain4j.store.embedding.filter.comparison.IsNotEqualTo;
import dev.langchain4j.store.embedding.filter.comparison.IsNotIn;
import dev.langchain4j.store.embedding.filter.logical.And;
import dev.langchain4j.store.embedding.filter.logical.Not;
import dev.langchain4j.store.embedding.filter.logical.Or;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.jdbc.core.JdbcTemplate;

import java.sql.ResultSet;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.Collection;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;

/**
 * PostgreSQL + pgvector backed EmbeddingStore.
 *
 * Replaces InMemoryEmbeddingStore to provide:
 * - Persistence across restarts
 * - Shared state across multiple instances
 * - Scalable vector search via IVFFlat index
 */
public class PgVectorEmbeddingStore implements EmbeddingStore<TextSegment> {

    private static final Logger log = LoggerFactory.getLogger(PgVectorEmbeddingStore.class);
    private static final ObjectMapper mapper = new ObjectMapper();

    private final JdbcTemplate jdbcTemplate;

    public PgVectorEmbeddingStore(JdbcTemplate jdbcTemplate) {
        this.jdbcTemplate = jdbcTemplate;
    }

    @Override
    public String add(Embedding embedding) {
        String id = UUID.randomUUID().toString();
        addInternal(id, embedding, null);
        return id;
    }

    @Override
    public void add(String id, Embedding embedding) {
        addInternal(id, embedding, null);
    }

    @Override
    public String add(Embedding embedding, TextSegment textSegment) {
        String id = UUID.randomUUID().toString();
        addInternal(id, embedding, textSegment);
        return id;
    }

    @Override
    public List<String> addAll(List<Embedding> embeddings) {
        List<String> ids = new ArrayList<>();
        for (Embedding e : embeddings) {
            ids.add(add(e));
        }
        return ids;
    }

    @Override
    public List<String> addAll(List<Embedding> embeddings, List<TextSegment> textSegments) {
        List<String> ids = new ArrayList<>();
        for (int i = 0; i < embeddings.size(); i++) {
            TextSegment seg = (textSegments != null && i < textSegments.size()) ? textSegments.get(i) : null;
            ids.add(add(embeddings.get(i), seg));
        }
        return ids;
    }

    @Override
    public EmbeddingSearchResult<TextSegment> search(EmbeddingSearchRequest request) {
        float[] queryVector = request.queryEmbedding().vector();
        int maxResults = request.maxResults();
        double minScore = request.minScore();

        String vectorStr = Arrays.toString(queryVector);
        SqlFilter sqlFilter = buildSqlFilter(request.filter());

        // cosine distance: 1 - (v1 <=> v2) = cosine similarity
        StringBuilder sql = new StringBuilder("""
            SELECT id, text_content, metadata_json,
                   1 - (embedding <=> ?::vector) as score
            FROM ai_embeddings
            WHERE 1 - (embedding <=> ?::vector) >= ?
            """);
        if (sqlFilter != null) {
            sql.append(" AND ").append(sqlFilter.clause);
        }
        sql.append('\n');
        sql.append("""
            ORDER BY embedding <=> ?::vector
            LIMIT ?
            """);

        List<Object> params = new ArrayList<>();
        params.add(vectorStr);
        params.add(vectorStr);
        params.add(minScore);
        if (sqlFilter != null) {
            params.addAll(sqlFilter.params);
        }
        params.add(vectorStr);
        params.add(maxResults);

        List<EmbeddingMatch<TextSegment>> matches = jdbcTemplate.query(sql.toString(), (ResultSet rs, int rowNum) -> {
            String id = rs.getString("id");
            String text = rs.getString("text_content");
            double score = rs.getDouble("score");
            String metaJson = rs.getString("metadata_json");

            Metadata metadata = Metadata.from(new HashMap<>());
            if (metaJson != null && !metaJson.isEmpty()) {
                try {
                    Map<String, String> metaMap = mapper.readValue(metaJson, new TypeReference<>() {});
                    metadata = Metadata.from(metaMap);
                } catch (Exception e) {
                    log.warn("Failed to parse metadata JSON: {}", e.getMessage());
                }
            }

            TextSegment segment = (text != null) ? TextSegment.from(text, metadata) : null;
            // Return match without embedding (not needed for search results)
            return new EmbeddingMatch<>(score, id, null, segment);
        }, params.toArray());

        return new EmbeddingSearchResult<>(matches);
    }

    @Override
    public void remove(String id) {
        jdbcTemplate.update("DELETE FROM ai_embeddings WHERE id = ?::uuid", id);
    }

    @Override
    public void removeAll(Collection<String> ids) {
        if (ids == null || ids.isEmpty()) {
            return;
        }
        for (String id : ids) {
            remove(id);
        }
    }

    @Override
    public void removeAll(Filter filter) {
        SqlFilter sqlFilter = buildSqlFilter(filter);
        if (sqlFilter == null) {
            return;
        }
        String sql = "DELETE FROM ai_embeddings WHERE " + sqlFilter.clause;
        jdbcTemplate.update(sql, sqlFilter.params.toArray());
    }

    @Override
    public void removeAll() {
        jdbcTemplate.update("DELETE FROM ai_embeddings");
    }

    public void removeByMetadata(String key, String value) {
        removeAll(new IsEqualTo(key, value));
    }

    private void addInternal(String id, Embedding embedding, TextSegment textSegment) {
        String text = (textSegment != null) ? textSegment.text() : "";
        String metadataJson = "{}";
        if (textSegment != null && textSegment.metadata() != null) {
            try {
                metadataJson = mapper.writeValueAsString(textSegment.metadata().toMap());
            } catch (Exception e) {
                log.warn("Failed to serialize metadata: {}", e.getMessage());
            }
        }

        String vectorStr = Arrays.toString(embedding.vector());

        jdbcTemplate.update(
                "INSERT INTO ai_embeddings (id, embedding, text_content, metadata_json) VALUES (?::uuid, ?::vector, ?, ?::jsonb) " +
                        "ON CONFLICT (id) DO UPDATE SET embedding = EXCLUDED.embedding, text_content = EXCLUDED.text_content, metadata_json = EXCLUDED.metadata_json",
                id, vectorStr, text, metadataJson);
    }

    private SqlFilter buildSqlFilter(Filter filter) {
        if (filter == null) {
            return null;
        }

        if (filter instanceof IsEqualTo equalTo) {
            return new SqlFilter("(metadata_json ->> ?) = ?", List.of(equalTo.key(), toStringValue(equalTo.comparisonValue())));
        }

        if (filter instanceof IsNotEqualTo notEqualTo) {
            return new SqlFilter("(metadata_json ->> ?) <> ?", List.of(notEqualTo.key(), toStringValue(notEqualTo.comparisonValue())));
        }

        if (filter instanceof IsIn isIn) {
            List<?> values = isIn.comparisonValues().stream().toList();
            if (values.isEmpty()) {
                return new SqlFilter("1 = 0", List.of());
            }
            List<Object> params = new ArrayList<>();
            params.add(isIn.key());
            List<String> placeholders = new ArrayList<>();
            for (Object value : values) {
                placeholders.add("?");
                params.add(toStringValue(value));
            }
            String clause = "(metadata_json ->> ?) IN (" + String.join(", ", placeholders) + ")";
            return new SqlFilter(clause, params);
        }

        if (filter instanceof IsNotIn isNotIn) {
            List<?> values = isNotIn.comparisonValues().stream().toList();
            if (values.isEmpty()) {
                return new SqlFilter("1 = 1", List.of());
            }
            List<Object> params = new ArrayList<>();
            params.add(isNotIn.key());
            List<String> placeholders = new ArrayList<>();
            for (Object value : values) {
                placeholders.add("?");
                params.add(toStringValue(value));
            }
            String clause = "(metadata_json ->> ?) NOT IN (" + String.join(", ", placeholders) + ")";
            return new SqlFilter(clause, params);
        }

        if (filter instanceof And andFilter) {
            SqlFilter left = buildSqlFilter(andFilter.left());
            SqlFilter right = buildSqlFilter(andFilter.right());
            if (left == null) return right;
            if (right == null) return left;
            List<Object> params = new ArrayList<>(left.params);
            params.addAll(right.params);
            return new SqlFilter("(" + left.clause + " AND " + right.clause + ")", params);
        }

        if (filter instanceof Or orFilter) {
            SqlFilter left = buildSqlFilter(orFilter.left());
            SqlFilter right = buildSqlFilter(orFilter.right());
            if (left == null) return right;
            if (right == null) return left;
            List<Object> params = new ArrayList<>(left.params);
            params.addAll(right.params);
            return new SqlFilter("(" + left.clause + " OR " + right.clause + ")", params);
        }

        if (filter instanceof Not notFilter) {
            SqlFilter expression = buildSqlFilter(notFilter.expression());
            if (expression == null) {
                return null;
            }
            return new SqlFilter("(NOT " + expression.clause + ")", expression.params);
        }

        throw new IllegalArgumentException("Unsupported filter type: " + filter.getClass().getName());
    }

    private String toStringValue(Object value) {
        return value == null ? null : String.valueOf(value);
    }

    private record SqlFilter(String clause, List<Object> params) {
    }
}

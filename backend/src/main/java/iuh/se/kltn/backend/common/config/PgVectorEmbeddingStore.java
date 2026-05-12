package iuh.se.kltn.backend.common.config;

import dev.langchain4j.data.document.Metadata;
import dev.langchain4j.data.embedding.Embedding;
import dev.langchain4j.data.segment.TextSegment;
import dev.langchain4j.store.embedding.EmbeddingMatch;
import dev.langchain4j.store.embedding.EmbeddingSearchRequest;
import dev.langchain4j.store.embedding.EmbeddingSearchResult;
import dev.langchain4j.store.embedding.EmbeddingStore;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.jdbc.core.JdbcTemplate;

import java.sql.ResultSet;
import java.util.*;

/**
 * 🧠 PostgreSQL + pgvector backed EmbeddingStore.
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

        // cosine distance: 1 - (v1 <=> v2) = cosine similarity
        String sql = """
            SELECT id, text_content, metadata_json, 
                   1 - (embedding <=> ?::vector) as score
            FROM ai_embeddings
            WHERE 1 - (embedding <=> ?::vector) >= ?
            ORDER BY embedding <=> ?::vector
            LIMIT ?
            """;

        List<EmbeddingMatch<TextSegment>> matches = jdbcTemplate.query(sql, (ResultSet rs, int rowNum) -> {
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
        }, vectorStr, vectorStr, minScore, vectorStr, maxResults);

        return new EmbeddingSearchResult<>(matches);
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
}

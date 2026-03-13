package iuh.se.kltn.backend.modules.ai.service;

import dev.langchain4j.data.document.Metadata;
import dev.langchain4j.data.embedding.Embedding;
import dev.langchain4j.data.segment.TextSegment;
import dev.langchain4j.model.embedding.EmbeddingModel;
import dev.langchain4j.store.embedding.EmbeddingMatch;
import dev.langchain4j.store.embedding.EmbeddingStore;
import dev.langchain4j.store.embedding.EmbeddingSearchRequest;
import dev.langchain4j.store.embedding.EmbeddingSearchResult;
import iuh.se.kltn.backend.modules.ai.entity.AiSqlCache;
import iuh.se.kltn.backend.modules.ai.repository.AiSqlCacheRepository;
import jakarta.annotation.PostConstruct;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.Map;

@Service
public class AiOrchestratorService {

    @Autowired
    private SqlGeneratorAi sqlGeneratorAi;

    @Autowired
    private AiSqlCacheRepository cacheRepository;

    @Autowired
    private JdbcTemplate jdbcTemplate;

    @Autowired
    private DataPresenterAi dataPresenterAi;

    @Autowired
    private EmbeddingModel embeddingModel;

    @Autowired
    private EmbeddingStore<TextSegment> embeddingStore;

    /**
     * Tự động chạy khi Spring Boot khởi động.
     * Đọc toàn bộ SQL từ MariaDB, biến thành Vector và đưa lên RAM.
     */
    @PostConstruct
    public void initVectorCache() {
        System.out.println("🔄 Đang nạp Kho tri thức SQL vào Vector Store trên RAM...");
        List<AiSqlCache> allCaches = cacheRepository.findAll();
        for (AiSqlCache cache : allCaches) {
            if (cache.isValid()) {
                addQuestionToVectorStore(cache.getQuestion(), cache.getGeneratedSql());
            }
        }
        System.out.println("✅ Đã nạp xong " + allCaches.size() + " câu SQL vào Vector Store!");
    }

    private void addQuestionToVectorStore(String question, String sql) {
        Embedding embedding = embeddingModel.embed(question).content();
        TextSegment segment = TextSegment.from(question, Metadata.from("sql", sql));
        embeddingStore.add(embedding, segment);
    }

    public Object processDataQuery(String question) {
        String sqlToExecute = null;

        // 1. Chuyển câu hỏi của user thành Vector
        Embedding queryEmbedding = embeddingModel.embed(question).content();

        // 2. TÌM KIẾM NGỮ NGHĨA (SEMANTIC SEARCH) API MỚI NHẤT
        EmbeddingSearchRequest searchRequest = EmbeddingSearchRequest.builder()
                .queryEmbedding(queryEmbedding)
                .maxResults(1)
                .minScore(0.85)
                .build();

        EmbeddingSearchResult<TextSegment> searchResult = embeddingStore.search(searchRequest);
        List<EmbeddingMatch<TextSegment>> matches = searchResult.matches();

        if (!matches.isEmpty()) {
            EmbeddingMatch<TextSegment> bestMatch = matches.get(0);
            sqlToExecute = bestMatch.embedded().metadata().getString("sql");
            System.out.println("⚡ [SEMANTIC CACHE HIT] Độ tương đồng: " + bestMatch.score());
            System.out.println("⚡ Câu hỏi gốc trong DB: " + bestMatch.embedded().text());
            System.out.println("⚡ Lấy SQL từ RAM: " + sqlToExecute);
        } else {
            System.out.println("🐌 [CACHE MISS] Câu hỏi mới, gọi Gemini sinh SQL...");
            sqlToExecute = sqlGeneratorAi.generateSql(question);

            sqlToExecute = sqlToExecute.replace("```sql", "").replace("```", "").trim();

            int selectIndex = sqlToExecute.toUpperCase().indexOf("SELECT");
            if (selectIndex >= 0) {
                sqlToExecute = sqlToExecute.substring(selectIndex);
            }
            System.out.println("🤖 Gemini trả về (Đã làm sạch): " + sqlToExecute);
        }

        // 3. THỰC THI SQL
        try {
            List<Map<String, Object>> results = jdbcTemplate.queryForList(sqlToExecute);

            if (matches.isEmpty()) {
                AiSqlCache newCache = AiSqlCache.builder()
                        .question(question)
                        .generatedSql(sqlToExecute)
                        .isValid(true)
                        .build();
                cacheRepository.save(newCache);

                addQuestionToVectorStore(question, sqlToExecute);
                System.out.println("💾 Đã lưu tri thức mới vào DB và nạp lên Vector Store!");
            }

            String rawDataStr = results.isEmpty() ? "Không tìm thấy dữ liệu." : results.toString();
            System.out.println("Dữ liệu thô: " + rawDataStr);

            return dataPresenterAi.generateNaturalResponse(question, rawDataStr);

        } catch (Exception e) {
            System.err.println("❌ Lỗi thực thi SQL: " + e.getMessage());
            return "Dạ, hệ thống đang gặp chút khó khăn khi tra cứu thông tin này. Bạn vui lòng thử lại sau nhé!";
        }
    }
}
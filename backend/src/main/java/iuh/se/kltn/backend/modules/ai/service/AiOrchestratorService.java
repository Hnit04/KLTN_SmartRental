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
import static dev.langchain4j.store.embedding.filter.MetadataFilterBuilder.metadataKey;
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
        Metadata metadata = Metadata.from("type", "sql").put("sql", sql);
        TextSegment segment = TextSegment.from(question, metadata);
        embeddingStore.add(embedding, segment);
    }

    // 1. Thêm 2 tham số role và userId vào hàm
    public Object processDataQuery(String question, String role, Long userId) {
        String sqlToExecute = null;

        Embedding queryEmbedding = embeddingModel.embed(question).content();

        // TÌM KIẾM NGỮ NGHĨA
        EmbeddingSearchRequest searchRequest = EmbeddingSearchRequest.builder()
                .queryEmbedding(queryEmbedding)
                .maxResults(1)
                .minScore(0.85)
                .filter(metadataKey("type").isEqualTo("sql"))
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
            // 2. Truyền role và userId xuống cho Kỹ sư Data
            sqlToExecute = sqlGeneratorAi.generateSql(question, role, userId);

            sqlToExecute = sqlToExecute.replace("```sql", "").replace("```", "").trim();

            int selectIndex = sqlToExecute.toUpperCase().indexOf("SELECT");
            if (selectIndex >= 0) {
                sqlToExecute = sqlToExecute.substring(selectIndex);
            }
            System.out.println("🤖 Gemini trả về (Đã làm sạch): " + sqlToExecute);
        }

        // ====================================================================
        // 🛡️ LỚP BẢO VỆ 3: JAVA VALIDATOR (CHỐT CHẶN TRƯỚC KHI CHẠY DATABASE)
        // ====================================================================

        // Chặn 1: Nếu AI phát hiện Khách thuê hỏi sai quyền hạn và trả về chữ UNAUTHORIZED
        if (sqlToExecute.trim().equalsIgnoreCase("UNAUTHORIZED")) {
            return "Dạ, em chỉ là trợ lý ảo nên không có quyền cung cấp thông tin bảo mật này cho khách thuê ạ.";
        }

        // Chặn 2: Ngăn chặn Chủ trọ B lấy nhầm Cache của Chủ trọ A
        // Ví dụ: Chủ trọ A (ID=1) hỏi "Có bao nhiêu phòng trống?", Cache lưu: WHERE landlord_id = 1
        // Chủ trọ B (ID=2) hỏi y hệt -> Dính Cache. Nếu chạy luôn thì B sẽ xem được phòng của A!
        if (role.equalsIgnoreCase("LANDLORD") && !matches.isEmpty()) {
            if (!sqlToExecute.contains(userId.toString())) {
                System.out.println("🚨 [SECURITY WARNING] SQL lấy từ Cache không khớp ID Chủ trọ! Đang ép sinh lại...");

                // Ép AI sinh lại SQL mới cho đúng ID của Chủ trọ hiện tại
                sqlToExecute = sqlGeneratorAi.generateSql(question, role, userId);
                sqlToExecute = sqlToExecute.replace("```sql", "").replace("```", "").trim();
                int selectIndex = sqlToExecute.toUpperCase().indexOf("SELECT");
                if (selectIndex >= 0) {
                    sqlToExecute = sqlToExecute.substring(selectIndex);
                }

                // Đánh dấu là Cache Miss để tí nữa hệ thống lưu câu mới này vào Database/RAM
                matches.clear();
            }
        }

        // Chặn 3: Đề phòng AI lỡ "ảo giác" quên chèn luật cho Tenant
        if (role.equalsIgnoreCase("TENANT")) {
            String upperSql = sqlToExecute.toUpperCase();
            // Nếu khách hỏi mà SQL có chữ SUM (tổng tiền) hoặc không bị khóa theo tenant_id -> Chặn!
            if (upperSql.contains("SUM(") || upperSql.contains("REVENUE")) {
                return "Dạ, thông tin này thuộc về nội bộ ban quản lý, em không thể tiết lộ ạ.";
            }
        }
        
        // Chặn 4: Cấm tuyệt đối SQL Injection phá hoại CSDL
        String upperCaseSql = sqlToExecute.toUpperCase();
        if (upperCaseSql.matches(".*\\b(INSERT|UPDATE|DELETE|DROP|ALTER|TRUNCATE)\\b.*")) {
            System.err.println("🚨 [SECURITY ALERT] Phát hiện lệnh cấm mạo danh AI: " + sqlToExecute);
            return "Dạ, yêu cầu của bạn chứa truy vấn không an toàn. Hệ thống đã huỷ bỏ yêu cầu này để bảo mật dữ liệu.";
        }
        // ====================================================================


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

            return dataPresenterAi.generateNaturalResponse(question, rawDataStr, role);

        } catch (Exception e) {
            System.err.println("❌ Lỗi thực thi SQL: " + e.getMessage());
            return "Dạ, hệ thống đang gặp chút khó khăn khi tra cứu thông tin này. Bạn vui lòng thử lại sau nhé!";
        }
    }
}
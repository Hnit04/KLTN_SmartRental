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
import org.springframework.transaction.annotation.Transactional;
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
        // --- TỘI: Fix lỗi Data Truncated cho cột type (Chạy thủ công) ---
        try {
            System.out.println("🛠️ Đang cưỡng bức cập nhật độ dài cột 'type' bảng notifications...");
            jdbcTemplate.execute("ALTER TABLE notifications MODIFY COLUMN type VARCHAR(50)");
            System.out.println("✅ Đã cập nhật xong!");
        } catch (Exception e) {
            System.out.println("ℹ️ Không cần cập nhật: " + e.getMessage());
        }

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

        String roleRules = "";
        if (role.equalsIgnoreCase("TENANT")) {
            roleRules = "1. HỌ KHÔNG ĐƯỢC XEM DOANH THU CỦA CHỦ TRỌ.\n" +
                    "2. Khi họ tìm kiếm thông tin về TẤT CẢ PHÒNG TRỐNG hoặc GIÁ PHÒNG, ĐÂY LÀ DỮ LIỆU CÔNG KHAI, KHÔNG CẦN CHÈN ĐIỀU KIỆN LỌC.\n" +
                    "3. Tuy nhiên, nếu họ hỏi về hóa đơn hay hợp đồng, BẮT BUỘC phải JOIN với bảng contracts và lọc bằng `contracts.tenant_id = {{userId}}`.\n" +
                    "4. Nếu họ thắc mắc về các phòng không thuộc quyền sở hữu của họ, chỉ trả về dữ liệu cơ bản (giá, tên, trạng thái).\n" +
                    "5. MẸO JOIN BẢNG: Nếu cần truy vấn địa điểm (District/City/Address), BẮT BUỘC phải JOIN bảng `rooms` với bảng `properties` (`rooms.property_id = properties.id`).\n" +
                    "6. CHÚ Ý TỪ KHÓA 'cho tôi': Dù Khách thuê (TENANT) nói 'tìm phòng cho tôi', nếu đó là yêu cầu tìm Phòng Trống chung chung, KHÔNG ĐƯỢC lọc theo `contracts.tenant_id`, hãy giữ SQL như tìm kiếm khách ngoài bình thường.";
        } else if (role.equalsIgnoreCase("LANDLORD")) {
            roleRules = "1. BẮT BUỘC phải thêm điều kiện `properties.landlord_id = {{userId}}` vào TẤT CẢ các câu query để họ không xem trộm được nhà trọ của chủ khác.\n" +
                    "2. MẸO JOIN BẢNG: Nếu truy cập bảng rooms, bills, hay contracts, BẮT BUỘC JOIN với properties để có thể lọc `properties.landlord_id`.\n" +
                    "3. LUÔN LUÔN dùng LIKE khi tra cứu địa điểm (address LIKE hoặc district LIKE).";
        } else {
            roleRules = "1. ĐÂY LÀ KHÁCH VÃNG LAI. KHÔNG ĐƯỢC truy cập bảng contracts, bills, hay users.\n" +
                    "2. CẦN JOIN bảng `rooms` với bảng `properties` nếu tra địa điểm.\n" +
                    "3. CHỈ được SELECT từ bảng rooms và properties.";
        }

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
            try {
                sqlToExecute = sqlGeneratorAi.generateSql(question, role, userId, roleRules);
            } catch (Exception llmEx) {
                System.err.println("⚠️ Lỗi gọi mô hình ngôn ngữ sinh SQL (Hết Token/Timeout): " + llmEx.getMessage());
                return "Dạ, máy chủ AI hiện tại đang quá tải. Quý khách vui lòng thử lại sau ít phút hoặc tra cứu thủ công qua Menu ứng dụng nhé!";
            }

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

                try {
                    sqlToExecute = sqlGeneratorAi.generateSql(question, role, userId, roleRules);
                } catch (Exception llmEx) {
                    System.err.println("⚠️ Lỗi gọi AI sinh SQL lại: " + llmEx.getMessage());
                    return "Dạ, máy chủ AI hiện tại đang quá tải. Quý khách vui lòng thử lại sau ạ!";
                }

                sqlToExecute = sqlToExecute.replace("```sql", "").replace("```", "").trim();
                int selectIndex = sqlToExecute.toUpperCase().indexOf("SELECT");
                if (selectIndex >= 0) {
                    sqlToExecute = sqlToExecute.substring(selectIndex);
                }

                matches.clear();
            }
        }

        if (role.equalsIgnoreCase("TENANT")) {
            String upperSql = sqlToExecute.toUpperCase();
            if (upperSql.contains("SUM(") || upperSql.contains("REVENUE")) {
                return "Dạ, thông tin này thuộc về nội bộ ban quản lý, em không thể tiết lộ ạ.";
            }
        }
        
        String upperCaseSql = sqlToExecute.toUpperCase();
        if (upperCaseSql.matches(".*\\b(INSERT|UPDATE|DELETE|DROP|ALTER|TRUNCATE)\\b.*")) {
            System.err.println("🚨 [SECURITY ALERT] Phát hiện lệnh cấm mạo danh AI: " + sqlToExecute);
            return "Dạ, yêu cầu của bạn chứa truy vấn không an toàn. Hệ thống đã huỷ bỏ yêu cầu này để bảo mật dữ liệu.";
        }

        // Chặn 5: Java Regex Security Gate cho SQL (Đảm bảo ID Isolation)
        if (role.equalsIgnoreCase("LANDLORD") && !upperCaseSql.contains("UNAUTHORIZED")) {
            if (!upperCaseSql.contains("LANDLORD_ID")) {
                System.err.println("🚨 [HARD SECURITY ALERT] SQL của Chủ trọ thiếu điều kiện phân quyền: " + sqlToExecute);
                return "Dạ, yêu cầu tra cứu bị từ chối do vi phạm luồng bảo mật dữ liệu.";
            }
        } else if (role.equalsIgnoreCase("TENANT") && !upperCaseSql.contains("UNAUTHORIZED")) {
            if ((upperCaseSql.contains("CONTRACTS") || upperCaseSql.contains("BILLS")) && !upperCaseSql.contains("TENANT_ID")) {
                System.err.println("🚨 [HARD SECURITY ALERT] SQL của Khách thuê truy cập bảng nhạy cảm mà thiếu tenant_id: " + sqlToExecute);
                return "Dạ, yêu cầu tra cứu bị từ chối do vi phạm quyền riêng tư của khách hàng khác.";
            }
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

            try {
                return dataPresenterAi.generateNaturalResponse(question, rawDataStr, role);
            } catch (Exception llmEx) {
                System.err.println("⚠️ Lỗi gọi mô hình ngôn ngữ (Hết Token/Timeout): " + llmEx.getMessage());
                if (results.isEmpty()) {
                    return "Dạ hiện AI đang quá tải, nhưng hệ thống ghi nhận không có dữ liệu nào khớp với yêu cầu của bạn ạ.";
                }
                
                StringBuilder fallbackResponse = new StringBuilder("Dạ hiện AI đang quá tải (Hóa đơn Token), em xin tự động trích xuất kết quả dưới cơ sở dữ liệu lên cho bạn xem nhé:\n\n");
                for (Map<String, Object> row : results) {
                    Object roomId = row.getOrDefault("room_id", row.get("id"));
                    if (roomId != null && row.containsKey("name") && row.containsKey("price")) {
                        fallbackResponse.append(String.format("[ROOM_CARD: %s | %s | %s]\n", roomId, row.get("name"), row.get("price")));
                    } else {
                        fallbackResponse.append("- ").append(row.toString()).append("\n");
                    }
                }
                return fallbackResponse.toString();
            }

        } catch (Exception e) {
            System.err.println("❌ Lỗi thực thi SQL: " + e.getMessage());
            return "Dạ, hệ thống đang gặp chút khó khăn khi tra cứu thông tin này. Bạn vui lòng thử lại sau nhé!";
        }
    }
    @Transactional
    public void clearSqlCache() {
        System.out.println("🧹 Đang xoá bộ nhớ đệm SQL (Cache)...");
        cacheRepository.deleteAll(); // Xoá trong DB
        embeddingStore.removeAll(); // Xoá trên RAM (Vector Store)
        System.out.println("✅ Đã xoá sạch Cache AI.");
    }
}
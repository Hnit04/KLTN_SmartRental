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
            System.out.println("🛠️ Đang cưỡng bức dọn dẹp cấu trúc bảng ai_sql_cache để hỗ trợ FAQ...");
            jdbcTemplate.execute("ALTER TABLE ai_sql_cache MODIFY COLUMN generated_sql VARCHAR(1000) NULL");
            System.out.println("✅ Đã cập nhật database cho chức năng FAQ!");
        } catch (Exception e) {
            System.out.println("ℹ️ Không cần cập nhật DB FAQ: " + e.getMessage());
        }

        System.out.println("🔄 Đang nạp Kho tri thức (SQL & FAQ) vào Vector Store trên RAM...");
        List<AiSqlCache> allCaches = cacheRepository.findAll();
        for (AiSqlCache cache : allCaches) {
            if (cache.isValid()) {
                if ("FAQ".equalsIgnoreCase(cache.getType())) {
                    addFaqToVectorStore(cache.getQuestion(), cache.getAnswer());
                } else {
                    addQuestionToVectorStore(cache.getQuestion(), cache.getGeneratedSql());
                }
            }
        }
        System.out.println("✅ Đã nạp xong " + allCaches.size() + " câu vào Vector Store!");
    }

    private void addQuestionToVectorStore(String question, String sql) {
        Embedding embedding = embeddingModel.embed(question).content();
        Metadata metadata = Metadata.from("type", "SQL").put("sql", sql != null ? sql : "");
        TextSegment segment = TextSegment.from(question, metadata);
        embeddingStore.add(embedding, segment);
    }

    private void addFaqToVectorStore(String question, String answer) {
        Embedding embedding = embeddingModel.embed(question).content();
        Metadata metadata = Metadata.from("type", "FAQ").put("answer", answer != null ? answer : "");
        TextSegment segment = TextSegment.from(question, metadata);
        embeddingStore.add(embedding, segment);
    }

    public String searchFaq(String question) {
        try {
            Embedding queryEmbedding = embeddingModel.embed(question).content();

            EmbeddingSearchRequest searchRequest = EmbeddingSearchRequest.builder()
                    .queryEmbedding(queryEmbedding)
                    .maxResults(1)
                    .minScore(0.88) // Độ chính xác cao một chút để tránh nhận nhầm câu hỏi mới
                    .filter(metadataKey("type").isEqualTo("FAQ"))
                    .build();

            EmbeddingSearchResult<TextSegment> searchResult = embeddingStore.search(searchRequest);
            List<EmbeddingMatch<TextSegment>> matches = searchResult.matches();

            if (!matches.isEmpty()) {
                EmbeddingMatch<TextSegment> bestMatch = matches.get(0);
                String answer = bestMatch.embedded().metadata().getString("answer");
                System.out.println("⚡ [FAQ CACHE HIT] Score: " + bestMatch.score() + " -> " + answer);
                return answer;
            }
        } catch (Exception e) {
            System.err.println("⚠️ Lỗi gọi semantic search cho FAQ: " + e.getMessage());
        }
        return null; // Không tìm thấy FAQ tương tự
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
            roleRules = "1. ĐÂY LÀ KHÁCH VÃNG LAI (GUEST). BẮT BUỘC KHÔNG ĐƯỢC truy cập bảng contracts, bills, hay users.\n" +
                        "2. CHỈ ĐƯỢC PHÉP xem thông tin từ bảng `rooms` và `properties` (Ví dụ: giá phòng, địa chỉ, diện tích).\n" +
                        "3. Luôn lấy cột r.images để GUEST có thể xem ảnh phòng.";
        }

        Embedding queryEmbedding = embeddingModel.embed(question).content();

        // TÌM KIẾM NGỮ NGHĨA
        EmbeddingSearchRequest searchRequest = EmbeddingSearchRequest.builder()
                .queryEmbedding(queryEmbedding)
                .maxResults(1)
                .minScore(0.85)
                .filter(metadataKey("type").isEqualTo("SQL"))
                .build();

        EmbeddingSearchResult<TextSegment> searchResult = embeddingStore.search(searchRequest);
        List<EmbeddingMatch<TextSegment>> matches = searchResult.matches();

        sqlToExecute = null;
        if (!matches.isEmpty()) {
            sqlToExecute = matches.get(0).embedded().metadata().getString("sql");
            System.out.println("⚡ [SEMANTIC CACHE HIT] Độ tương đồng: " + matches.get(0).score());
        } else {
            System.out.println("🐌 [CACHE MISS] Câu hỏi mới, gọi Gemini sinh SQL...");
            try {
                sqlToExecute = sqlGeneratorAi.generateSql(question, role, userId, roleRules);
            } catch (Exception llmEx) {
                System.err.println("⚠️ Lỗi gọi mô hình ngôn ngữ sinh SQL (Hết Token/Timeout): " + llmEx.getMessage());
                return "Dạ, máy chủ AI hiện tại đang quá tải. Quý khách vui lòng thử lại sau ít phút hoặc tra cứu thủ công qua Menu ứng dụng nhé!";
            }
        }

        sqlToExecute = sqlToExecute.replace("```sql", "").replace("```", "").trim();
        int selectIndex = sqlToExecute.toUpperCase().indexOf("SELECT");
        if (selectIndex >= 0) {
            sqlToExecute = sqlToExecute.substring(selectIndex);
        }

        // ====================================================================
        // 🛡️ LỚP BẢO VỆ 3: JAVA VALIDATOR (CHỐT CHẶN TRƯỚC KHI CHẠY DATABASE)
        // ====================================================================

        // Chặn 1: Nếu AI phát hiện Khách thuê hỏi sai quyền hạn và trả về chữ UNAUTHORIZED
        if (sqlToExecute.trim().equalsIgnoreCase("UNAUTHORIZED")) {
            return "Dạ, em chỉ là trợ lý ảo nên không có quyền cung cấp thông tin bảo mật này cho khách thuê ạ.";
        }

        // Chặn 2: Ngăn bảo mật cho GUEST (Khách vãng lai)
        if (role.equalsIgnoreCase("GUEST")) {
            String upperSql = sqlToExecute.toUpperCase();
            if (upperSql.contains("USERS") || upperSql.contains("BILLS") || 
                upperSql.contains("CONTRACTS") || upperSql.contains("APPOINTMENTS")) {
                System.err.println("🚨 SECURITY ALERT: GUEST tried to access restricted tables!");
                return "Dạ, vì lý do bảo mật, khách vãng lai chỉ có thể tra cứu thông tin phòng và khu trọ công khai thôi ạ. Bạn vui lòng đăng nhập để xem các thông tin cá nhân nhé!";
            }
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
                selectIndex = sqlToExecute.toUpperCase().indexOf("SELECT");
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
                        .type("SQL")
                        .isValid(true)
                        .build();
                cacheRepository.save(newCache);

                addQuestionToVectorStore(question, sqlToExecute);
                System.out.println("💾 Đã lưu tri thức SQL mới vào DB và nạp lên Vector Store!");
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
                
                StringBuilder fallbackResponse = new StringBuilder("Dạ hiện AI đang quá tải (Hóa đơn Token), em xin trích xuất kết quả từ hệ thống cho bạn nhé:\n\n");
                for (Map<String, Object> row : results) {
                    Object roomId = row.getOrDefault("room_id", row.get("id"));
                    if (roomId != null && row.containsKey("name") && row.containsKey("price")) {
                        String firstImg = extractFirstImage(row.get("images"));
                        fallbackResponse.append(String.format("[ROOM_CARD: %s | %s | %s | %s]\n", 
                            roomId, row.get("name"), row.get("price"), firstImg));
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
    // Admin: Thống kê AI NLP
    public Map<String, Object> getAnalytics() {
        List<AiSqlCache> allCaches = cacheRepository.findAll();
        long totalQueries = allCaches.size();
        long validQueries = allCaches.stream().filter(AiSqlCache::isValid).count();
        long invalidQueries = totalQueries - validQueries;

        // Phân loại câu hỏi theo keyword
        long roomQueries = allCaches.stream().filter(c -> {
            String q = c.getQuestion().toLowerCase();
            return q.contains("phòng") || q.contains("room");
        }).count();
        long priceQueries = allCaches.stream().filter(c -> {
            String q = c.getQuestion().toLowerCase();
            return q.contains("giá") || q.contains("price") || q.contains("tiền");
        }).count();
        long contractQueries = allCaches.stream().filter(c -> {
            String q = c.getQuestion().toLowerCase();
            return q.contains("hợp đồng") || q.contains("contract");
        }).count();
        long billQueries = allCaches.stream().filter(c -> {
            String q = c.getQuestion().toLowerCase();
            return q.contains("hóa đơn") || q.contains("bill") || q.contains("doanh thu");
        }).count();
        long locationQueries = allCaches.stream().filter(c -> {
            String q = c.getQuestion().toLowerCase();
            return q.contains("quận") || q.contains("district") || q.contains("thành phố") || q.contains("địa chỉ");
        }).count();

        Map<String, Object> result = new java.util.LinkedHashMap<>();
        result.put("totalQueries", totalQueries);
        result.put("validQueries", validQueries);
        result.put("invalidQueries", invalidQueries);

        Map<String, Long> categories = new java.util.LinkedHashMap<>();
        categories.put("Phòng trọ", roomQueries);
        categories.put("Giá cả", priceQueries);
        categories.put("Hợp đồng", contractQueries);
        categories.put("Hoá đơn/Doanh thu", billQueries);
        categories.put("Địa điểm", locationQueries);
        categories.put("Khác", totalQueries - roomQueries - priceQueries - contractQueries - billQueries - locationQueries);
        result.put("categories", categories);

        // Cache entries
        List<Map<String, Object>> entries = new java.util.ArrayList<>();
        for (AiSqlCache c : allCaches) {
            Map<String, Object> entry = new java.util.LinkedHashMap<>();
            entry.put("id", c.getId());
            entry.put("question", c.getQuestion());
            entry.put("generatedSql", c.getGeneratedSql());
            entry.put("isValid", c.isValid());
            entries.add(entry);
        }
        result.put("entries", entries);

        return result;
    }

    // Admin: Sửa cache (Human-in-the-loop)
    @Transactional
    public void updateCacheEntry(Long id, String newSql) {
        AiSqlCache cache = cacheRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Không tìm thấy câu hỏi trong Cache (ID: " + id + ")"));
        
        cache.setGeneratedSql(newSql);
        cache.setValid(true); // Đã sửa bằng tay thì coi như valid
        cacheRepository.save(cache);
        
        System.out.println("✏️ Admin đã sửa SQL cho câu hỏi ID " + id);
        reloadVectorCache();
    }

    // Admin: Xóa 1 dòng cache
    @Transactional
    public void deleteCacheEntry(Long id) {
        if (!cacheRepository.existsById(id)) {
            throw new RuntimeException("Không tìm thấy câu hỏi trong Cache (ID: " + id + ")");
        }
        cacheRepository.deleteById(id);
        System.out.println("🗑️ Admin đã xóa câu hỏi ID " + id);
        reloadVectorCache();
    }

    // Load lại toàn bộ Vector Store từ DB đã được filter valid=true
    private void reloadVectorCache() {
        System.out.println("🔄 Đang load lại Vector Store sau khi có thay đổi từ Admin...");
        embeddingStore.removeAll();
        initVectorCache(); // Gọi lại Logic Load mặc định
    }

    @Transactional
    public void clearSqlCache() {
        System.out.println("🧹 Đang xoá bộ nhớ đệm SQL (Cache)...");
        cacheRepository.deleteAll(); // Xoá trong DB
        embeddingStore.removeAll(); // Xoá trên RAM (Vector Store)
        System.out.println("✅ Đã xoá sạch Cache AI.");
    }

    @Transactional
    public void addFaq(String question, String answer) {
        AiSqlCache newFaq = AiSqlCache.builder()
                .question(question)
                .answer(answer)
                .type("FAQ")
                .isValid(true)
                .build();
        cacheRepository.save(newFaq);

        addFaqToVectorStore(question, answer);
        System.out.println("💾 Đã lưu FAQ mới vào DB và nạp lên Vector Store!");
    }

    private String extractFirstImage(Object imagesObj) {
        if (imagesObj == null) return "";
        String imagesStr = imagesObj.toString();
        if (imagesStr.isEmpty() || imagesStr.equals("[]")) return "";
        
        // Regex đơn giản để lấy nội dung trong dấu ngoặc kép đầu tiên của JSON Array ["url",...]
        java.util.regex.Pattern pattern = java.util.regex.Pattern.compile("\"([^\"]+)\"");
        java.util.regex.Matcher matcher = pattern.matcher(imagesStr);
        if (matcher.find()) {
            return matcher.group(1);
        }
        return "";
    }
}
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
import iuh.se.kltn.backend.modules.ai.entity.AiActionLog;
import iuh.se.kltn.backend.modules.ai.repository.AiSqlCacheRepository;
import iuh.se.kltn.backend.modules.ai.repository.AiActionLogRepository;
import iuh.se.kltn.backend.modules.ai.dto.IntentExtractionResult;
import iuh.se.kltn.backend.modules.ai.service.handler.DynamicQueryEngine;
import iuh.se.kltn.backend.modules.property.repository.PropertyRepository;
import jakarta.annotation.PostConstruct;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.cache.Cache;
import org.springframework.cache.CacheManager;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import static dev.langchain4j.store.embedding.filter.MetadataFilterBuilder.metadataKey;
import java.util.List;
import java.util.Map;
import java.util.TreeMap;

@Service
public class AiOrchestratorService {

    @Autowired
    private SqlGeneratorAi sqlGeneratorAi;

    @Autowired
    private IntentExtractorAi intentExtractorAi;

    @Autowired
    private DynamicQueryEngine dynamicQueryEngine;

    @Autowired
    private AiSqlCacheRepository cacheRepository;

    @Autowired
    private AiActionLogRepository actionLogRepository;

    @Autowired
    private CacheManager cacheManager;

    @Autowired
    private JdbcTemplate jdbcTemplate;

    @Autowired
    private DataPresenterAi dataPresenterAi;

    @Autowired
    private EmbeddingModel embeddingModel;

    @Autowired
    private EmbeddingStore<TextSegment> embeddingStore;

    @Autowired
    private GeocodingService geocodingService;

    @Autowired
    private PropertyRepository propertyRepository;

    private static final double DEFAULT_RADIUS_KM = 3.0;

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

        // 🌱 AUTO-SEED: Nếu DB trống, tự động nạp 204 câu hỏi mẫu
        seedInitialDataIfEmpty();

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

    /**
     * Tự động nạp dữ liệu seed (204 FAQ + SQL Cache) nếu bảng ai_sql_cache đang trống.
     */
    private void seedInitialDataIfEmpty() {
        long count = cacheRepository.count();
        if (count > 0) {
            System.out.println("ℹ️ Kho tri thức đã có " + count + " câu, bỏ qua seed.");
            return;
        }
        System.out.println("🌱 Kho tri thức trống! Đang nạp dữ liệu mẫu từ seed_faq_data.sql...");
        try {
            org.springframework.core.io.ClassPathResource resource =
                    new org.springframework.core.io.ClassPathResource("data/seed_faq_data.sql");
            String sql = new String(resource.getInputStream().readAllBytes(), java.nio.charset.StandardCharsets.UTF_8);
            String[] statements = sql.split(";");
            int executed = 0;
            for (String stmt : statements) {
                String trimmed = stmt.trim();
                if (trimmed.toUpperCase().startsWith("INSERT")) {
                    try {
                        jdbcTemplate.execute(trimmed);
                        executed++;
                    } catch (Exception e) {
                        System.err.println("⚠️ Lỗi seed: " + e.getMessage());
                    }
                }
            }
            System.out.println("✅ Đã seed thành công " + executed + " câu lệnh vào kho tri thức!");
        } catch (Exception e) {
            System.err.println("❌ Lỗi đọc file seed_faq_data.sql: " + e.getMessage());
        }
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

    // Legacy Location Query has been removed and integrated into IntentExtractor pipeline

    private String normalizeText(String text) {
        if (text == null) return "";
        // Chuyển về NFC (Canonical Composition) để đồng nhất các loại dấu tiếng Việt
        return java.text.Normalizer.normalize(text.toLowerCase(), java.text.Normalizer.Form.NFC);
    }

    // 1. Thêm 2 tham số role và userId vào hàm
    public Object processDataQuery(String question, String role, Long userId) {
        String normalizedQuestion = normalizeText(question);

        // 🛡️ BẢO VỆ GUEST: Chặn các từ khóa nhạy cảm ngay từ đầu bằng Regex để chính xác tuyệt đối
        if (role.equalsIgnoreCase("GUEST")) {
            // Regex kiểm tra các từ khóa nhạy cảm: hóa đơn, hợp đồng, lịch hẹn, doanh thu, nợ, thanh toán, của tôi/mình
            String sensitivePattern = ".*(hóa đơn|hoá đơn|bill|hợp đồng|contract|lịch hẹn|appointment|doanh thu|revenue|của tôi|của mình|nợ|thanh toán|trễ|quá hạn|phí).*";
            if (normalizedQuestion.matches(sensitivePattern)) {
                System.out.println("🛡️ [SECURITY GUEST] Chặn truy vấn nhạy cảm: " + question);
                return "Dạ, vì lý do bảo mật, các thông tin cá nhân như hóa đơn, hợp đồng và lịch hẹn chỉ dành cho người dùng đã đăng nhập. Bạn vui lòng Đăng nhập để sử dụng các tính năng này nhé!";
            }
        }

        String sqlToExecute = null;

        String schemaGeneral = "Sơ đồ cơ sở dữ liệu thực tế:\n" +
            "- properties: id, landlord_id, name, address, district, city, latitude, longitude, description, elec_price, water_price, internet_price, status (ENUM: 'PENDING', 'APPROVED', 'REJECTED')\n" +
            "- rooms: id, property_id, name, price, area, max_occupants, current_occupants, type (ENUM: 'STUDIO', 'ONE_BEDROOM', 'TWO_BEDROOM', 'SINGLE_ROOM', 'SHARED_ROOM', 'MEZZANINE_ROOM'), has_mezzanine, has_balcony, status (ENUM: 'AVAILABLE', 'RENTED', 'MAINTENANCE', 'RESERVED', 'HIDDEN'), amenities, default_terms\n";

        String schemaTenantAndLandlord = schemaGeneral +
            "- contracts: id, tenant_id, room_id, actual_price, sign_date, start_date, end_date, deposit_amount, status (ENUM: 'PENDING_SIGNATURE', 'AWAITING_DEPOSIT', 'ACTIVE', 'EXPIRED', 'TERMINATED_EARLY'), is_tenant_signed, is_landlord_signed\n" +
            "- bills: id, contract_id, month, year, old_elec_index, new_elec_index, old_water_index, new_water_index, total_amount, payment_tx_hash, status (ENUM: 'UNPAID', 'PAID', 'LATE', 'PENDING'), penalty_fee, paid_at, additional_fee, discount_amount\n" +
            "- appointments: id, tenant_id, landlord_id, room_id, meet_time, status (ENUM: 'PENDING', 'APPROVED', 'REJECTED', 'CANCELLED', 'COMPLETED'), meeting_link\n" +
            "- reviews: id, contract_id, reviewer_id, target_id, rating, comment, created_at\n";

        String schemaLandlordSpecial = "- users: id, username, full_name, email, phone_number, role, reputation_score, kyc_status\n";

        String schemaContext = "";
        String roleRules = "";

        if (role.equalsIgnoreCase("TENANT")) {
            schemaContext = schemaTenantAndLandlord;
            roleRules = "1. HỌ KHÔNG ĐƯỢC XEM DOANH THU CỦA CHỦ TRỌ.\n" +
                    "2. Khi họ tìm kiếm thông tin về TẤT CẢ PHÒNG TRỐNG hoặc GIÁ PHÒNG, ĐÂY LÀ DỮ LIỆU CÔNG KHAI, KHÔNG CẦN CHÈN ĐIỀU KIỆN LỌC. (Nhớ điều kiện rooms.status='AVAILABLE').\n" +
                    "3. Tuy nhiên, nếu họ hỏi về hóa đơn (bills) hay hợp đồng (contracts), BẮT BUỘC phải lọc bằng `contracts.tenant_id = USER_ID_PLACEHOLDER` (viết chính xác cụm USER_ID_PLACEHOLDER, không tự điền ID thật).\n" +
                    "4. ĐỐI VỚI BẢNG LỊCH HẸN (appointments): BẮT BUỘC chèn điều kiện lọc `appointments.tenant_id = USER_ID_PLACEHOLDER`.\n" +
                    "5. ĐỐI VỚI BẢNG BILLS: Bảng bills không có cột tenant_id. BẮT BUỘC phải JOIN bills với contracts RỒI MỚI lọc bằng `contracts.tenant_id = USER_ID_PLACEHOLDER`. Nếu khách hỏi NỢ TIỀN CHƯA ĐÓNG, lọc thêm bills.status IN ('UNPAID', 'LATE').\n" +
                    "6. Nếu họ thắc mắc về các phòng không thuộc quyền sở hữu của họ, chỉ trả về dữ liệu cơ bản.\n" +
                    "7. MẸO JOIN BẢNG: Nếu cần truy vấn địa điểm, BẮT BUỘC phải JOIN bảng `rooms` với bảng `properties` (`rooms.property_id = properties.id`).\n" +
                    "8. CHÚ Ý TỪ KHÓA 'cho tôi': Dù Khách thuê nói 'tìm phòng cho tôi', nếu đó là yêu cầu tìm Phòng Trống chung chung, KHÔNG ĐƯỢC lọc theo `contracts.tenant_id`.";
        } else if (role.equalsIgnoreCase("LANDLORD")) {
            schemaContext = schemaTenantAndLandlord + schemaLandlordSpecial;
            roleRules = "1. BẮT BUỘC phải thêm điều kiện lọc `landlord_id = USER_ID_PLACEHOLDER` vào MỌI truy vấn cá nhân. Đối với bảng `appointments` nó có sẵn cột `landlord_id`. Đối với `rooms`, `contracts`, `bills` thì BẮT BUỘC phải JOIN qua `properties` để lấy cột `properties.landlord_id = USER_ID_PLACEHOLDER`.\n" +
                    "2. LUÔN LUÔN dùng LIKE khi tra cứu địa điểm.\n" +
                    "3. NGUYÊN TẮC DOANH THU (Revenue): Nếu hỏi DOANH THU, BẮT BUỘC dùng hàm SUM(bills.total_amount) VÀ ĐIỀU KIỆN bills.status = 'PAID'. (Tuyệt đối không cộng gộp hóa đơn chưa thanh toán).\n" +
                    "4. NGUYÊN TẮC CON NỢ (Debtors): Nếu hỏi KHÁCH NỢ TIỀN, lọc bills.status IN ('UNPAID', 'LATE').\n" +
                    "5. NGUYÊN TẮC HỢP ĐỒNG: Nếu hỏi hợp đồng sắp hết hạn, kiểm tra contracts.status = 'ACTIVE'.";
        } else {
            schemaContext = schemaGeneral;
            roleRules = "1. ĐÂY LÀ KHÁCH VÃNG LAI (GUEST). BẮT BUỘC KHÔNG ĐƯỢC truy cập bảng contracts, bills, hay users.\n" +
                        "2. Nếu câu hỏi yêu cầu xem hóa đơn, hợp đồng, lịch hẹn hoặc doanh thu, BẮT BUỘC CHỈ TRẢ VỀ CHỮ: UNAUTHORIZED.\n" +
                        "3. Khi truy vấn phòng trống theo yêu cầu khách, BẮT BUỘC kèm theo điều kiện kép: `rooms.status = 'AVAILABLE'` VÀ `properties.status = 'APPROVED'` để không lấy phòng ảo/đã có người.\n" +
                        "4. Luôn lấy cột r.images để GUEST có thể xem ảnh phòng.";
        }

        // 🌟 NEW HYBRID AI PIPELINE (Strangler Fig Pattern)
        long startTime = System.currentTimeMillis();
        String predictedIntent = "UNKNOWN";
        Double confidence = 0.0;
        boolean fallbackUsed = false;
        boolean success = false;

        try {
            System.out.println("🤖 [HYBRID AI] Calling Intent Extractor...");
            String rawJson = intentExtractorAi.extractIntent(question, role);
            // Cắt bỏ markdown wrapper nếu LLM tự ý bọc
            rawJson = rawJson.replace("```json", "").replace("```", "").trim();
            System.out.println("🤖 [HYBRID AI] Raw JSON: " + rawJson);

            // Parse JSON thủ công bằng Jackson (tin cậy hơn POJO mapping)
            com.fasterxml.jackson.databind.ObjectMapper mapper = new com.fasterxml.jackson.databind.ObjectMapper();
            com.fasterxml.jackson.databind.JsonNode jsonNode = mapper.readTree(rawJson);

            String intentStr = jsonNode.has("intent") ? jsonNode.get("intent").asText() : "UNKNOWN";
            confidence = jsonNode.has("confidenceScore") ? jsonNode.get("confidenceScore").asDouble() : 0.0;
            predictedIntent = intentStr;

            // Parse params thành Map
            Map<String, Object> extractedParams = new java.util.HashMap<>();
            if (jsonNode.has("params") && jsonNode.get("params").isObject()) {
                jsonNode.get("params").fields().forEachRemaining(entry -> {
                    com.fasterxml.jackson.databind.JsonNode val = entry.getValue();
                    if (val.isNumber()) extractedParams.put(entry.getKey(), val.numberValue());
                    else if (val.isBoolean()) extractedParams.put(entry.getKey(), val.booleanValue());
                    else extractedParams.put(entry.getKey(), val.asText());
                });
            }

            // Chuyển đổi String intent thành Enum an toàn
            iuh.se.kltn.backend.modules.ai.enums.SystemIntent systemIntent;
            try {
                systemIntent = iuh.se.kltn.backend.modules.ai.enums.SystemIntent.valueOf(intentStr);
            } catch (IllegalArgumentException e) {
                systemIntent = iuh.se.kltn.backend.modules.ai.enums.SystemIntent.UNKNOWN;
            }

            IntentExtractionResult extraction = new IntentExtractionResult(systemIntent, confidence, extractedParams);
            System.out.println("🤖 [HYBRID AI] Extracted Intent: " + predictedIntent + " (Score: " + confidence + ")");

            if (confidence != null && confidence >= 0.7) {
                if (extraction.getIntent() == iuh.se.kltn.backend.modules.ai.enums.SystemIntent.LOCATION_SEARCH) {
                    System.out.println("✅ [HYBRID AI] Intent match LOCATION_SEARCH! Bypassing LLM generation...");
                    success = true;
                    String locationName = extraction.getParams().containsKey("location") ? extraction.getParams().get("location").toString() : null;
                    Double radius = 3.0;
                    if (extraction.getParams().containsKey("radius")) {
                        try {
                            radius = Double.parseDouble(extraction.getParams().get("radius").toString());
                        } catch (Exception e) {}
                    }
                    
                    System.out.println("📍 [HYBRID AI] LOCATION_SEARCH -> location='" + locationName + "', radius=" + radius + "km");
                    
                    if (locationName == null || locationName.trim().isEmpty()) {
                        saveActionLog(userId, role, question, predictedIntent, confidence, false, startTime, true);
                        return "Dạ, bạn có thể cho mình biết tên địa điểm cụ thể bạn muốn tìm phòng gần đó không ạ?";
                    }

                    GeocodingService.GeoResult geoResult = geocodingService.geocode(locationName);
                    if (geoResult == null) {
                        System.out.println("❌ [HYBRID AI] GeoCache MISS -> '" + locationName + "'");
                        List<String> topSuggestions = geocodingService.getSmartSuggestions(locationName, 3);
                        StringBuilder sb = new StringBuilder("Dạ, mình không tìm thấy địa điểm '" + locationName + "'.\n");
                        if (!topSuggestions.isEmpty()) {
                            sb.append("Bạn có muốn tìm phòng gần các địa điểm sau không?\n");
                            for (String sugg : topSuggestions) {
                                sb.append("- ").append(sugg).append("\n");
                            }
                        }
                        saveActionLog(userId, role, question, predictedIntent, confidence, false, startTime, true);
                        return sb.toString();
                    }

                    List<Map<String, Object>> results = propertyRepository.findNearbyRooms(geoResult.latitude, geoResult.longitude, radius);
                    if (results.isEmpty()) {
                        saveActionLog(userId, role, question, predictedIntent, confidence, false, startTime, true);
                        return "Hiện tại không tìm thấy phòng trống nào trong bán kính " + radius.intValue() + "km quanh '" + geoResult.displayName + "'.";
                    }

                    StringBuilder responseStr = new StringBuilder();
                    responseStr.append("Dạ, mình tìm được ").append(results.size())
                            .append(" phòng trống gần '").append(geoResult.displayName)
                            .append("' (trong bán kính ").append(radius.intValue()).append("km):\n\n");

                    int limit = Math.min(results.size(), 5);
                    for (int i = 0; i < limit; i++) {
                        Map<String, Object> row = results.get(i);
                        Object roomId = row.get("room_id");
                        Object nameObj = row.get("name");
                        String name = nameObj != null ? nameObj.toString() : "";
                        if (name.length() > 35) {
                            name = name.substring(0, 32) + "...";
                        }
                        
                        Object priceObj = row.get("price");
                        String priceStr = "0";
                        if (priceObj instanceof Number) {
                            priceStr = String.valueOf(((Number) priceObj).longValue());
                        } else if (priceObj != null) {
                            try {
                                priceStr = String.valueOf(Double.valueOf(priceObj.toString()).longValue());
                            } catch (Exception e) {
                                priceStr = priceObj.toString();
                            }
                        }

                        Object distance = row.get("distance_km");
                        String firstImg = extractFirstImage(row.get("images"));

                        responseStr.append(String.format("[ROOM_CARD: %s | %s | %s | %s | cách %skm]\n",
                                roomId, name, priceStr, firstImg, distance));
                    }
                    saveActionLog(userId, role, question, predictedIntent, confidence, false, startTime, true);
                    return responseStr.toString();

                } else if (dynamicQueryEngine.canHandle(extraction.getIntent())) {
                    System.out.println("✅ [HYBRID AI] Intent match! Routing to DynamicQueryEngine...");

                // 💾 RESULT CACHE: Kiểm tra cache theo Intent + Params Hash
                String cacheKey = buildCacheKey(predictedIntent, extraction.getParams(), userId, role);
                Cache resultCache = cacheManager.getCache("aiQueryResults");
                if (resultCache != null) {
                    Cache.ValueWrapper cachedResult = resultCache.get(cacheKey);
                    if (cachedResult != null) {
                        System.out.println("⚡ [RESULT CACHE HIT] Key: " + cacheKey);
                        success = true;
                        saveActionLog(userId, role, question, predictedIntent, confidence, false, startTime, true);
                        return cachedResult.get();
                    }
                }

                List<Map<String, Object>> results = dynamicQueryEngine.execute(extraction, userId, role);
                String rawDataStr = results.isEmpty() ? "Không tìm thấy dữ liệu phù hợp." : results.toString();
                try {
                    Object response = dataPresenterAi.generateNaturalResponse(question, rawDataStr, role);
                    // 💾 Ghi cache kết quả
                    if (resultCache != null) {
                        resultCache.put(cacheKey, response);
                        System.out.println("💾 [RESULT CACHE STORED] Key: " + cacheKey);
                    }
                    success = true;
                    saveActionLog(userId, role, question, predictedIntent, confidence, false, startTime, true);
                    return response;
                } catch (Exception llmEx) {
                    System.err.println("⚠️ [HYBRID AI] LLM formatting failed, returning formatted fallback: " + llmEx.getMessage());
                    success = true;
                    saveActionLog(userId, role, question, predictedIntent, confidence, false, startTime, true);
                    // Trả về dữ liệu thô nhưng format dễ đọc hơn
                    if (results.isEmpty()) {
                        return "Dạ, hiện không tìm thấy dữ liệu phù hợp với yêu cầu của bạn.";
                    }
                    StringBuilder sb = new StringBuilder("Dạ, đây là kết quả tra cứu:\n");
                    for (int i = 0; i < results.size(); i++) {
                        Map<String, Object> row = results.get(i);
                        sb.append("\n--- ").append(i + 1).append(" ---\n");
                        for (Map.Entry<String, Object> entry : row.entrySet()) {
                            if (entry.getValue() != null) {
                                sb.append("• ").append(entry.getKey()).append(": ").append(entry.getValue()).append("\n");
                            }
                        }
                    }
                    return sb.toString();
                }
                }
            } else {
                fallbackUsed = true;
                System.out.println("⚠️ [HYBRID AI] Intent not fully supported or Confidence too low (" + confidence + "). Fallback to SqlGeneratorAi.");
            }
        } catch (Exception e) {
            fallbackUsed = true;
            System.err.println("❌ [HYBRID AI] Intent Extractor failed: " + e.getMessage() + ". Fallback to SqlGeneratorAi.");
        }

        // 📝 Ghi log cho luồng Fallback trước khi đi xuống Legacy Pipeline
        saveActionLog(userId, role, question, predictedIntent, confidence, true, startTime, false);

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
                sqlToExecute = sqlGeneratorAi.generateSql(question, role, userId, schemaContext, roleRules);
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
            if ((upperCaseSql.contains("CONTRACTS") || upperCaseSql.contains("BILLS") || upperCaseSql.contains("APPOINTMENTS")) && !upperCaseSql.contains("TENANT_ID")) {
                System.err.println("🚨 [HARD SECURITY ALERT] SQL của Khách thuê truy cập bảng nhạy cảm mà thiếu tenant_id: " + sqlToExecute);
                return "Dạ, yêu cầu tra cứu bị từ chối do vi phạm quyền riêng tư của khách hàng khác.";
            }
        }
        // ====================================================================


        // Cập nhật Placeholder thành User ID thật sự (Tiết kiệm Token hoàn hảo!)
        String finalSql = sqlToExecute.replace("USER_ID_PLACEHOLDER", userId.toString());

        // 3. THỰC THI SQL
        try {
            List<Map<String, Object>> results = jdbcTemplate.queryForList(finalSql);

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

    /**
     * Sinh Cache Key xác định (deterministic) từ Intent + Params + UserId + Role.
     * Dùng TreeMap để đảm bảo thứ tự params luôn nhất quán bất kể thứ tự nhập.
     * VD: "AI_CACHE::SEARCH_ROOM::GUEST::0::{district=Gò Vấp, max_price=3000000}"
     */
    private String buildCacheKey(String intent, Map<String, Object> params, Long userId, String role) {
        Map<String, Object> sortedParams = params != null ? new TreeMap<>(params) : new TreeMap<>();
        return "AI_CACHE::" + intent + "::" + role + "::" + userId + "::" + sortedParams.toString();
    }

    /**
     * Ghi bản ghi Observability vào DB (chạy async để không block response).
     */
    private void saveActionLog(Long userId, String role, String rawQuery,
                               String predictedIntent, Double confidenceScore,
                               boolean fallbackUsed, long startTime, boolean isSuccess) {
        try {
            long executionTimeMs = System.currentTimeMillis() - startTime;
            AiActionLog log = AiActionLog.builder()
                    .userId(userId)
                    .userRole(role)
                    .rawQuery(rawQuery)
                    .predictedIntent(predictedIntent)
                    .confidenceScore(confidenceScore)
                    .isFallbackUsed(fallbackUsed)
                    .executionTimeMs(executionTimeMs)
                    .isSuccess(isSuccess)
                    .build();
            actionLogRepository.save(log);
        } catch (Exception e) {
            // Log Observability không bao giờ được phép làm sập luồng chính
            System.err.println("⚠️ [OBSERVABILITY] Lỗi ghi AiActionLog: " + e.getMessage());
        }
    }
}

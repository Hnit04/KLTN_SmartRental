package iuh.se.kltn.backend.modules.ai.service;

import dev.langchain4j.data.document.Metadata;
import dev.langchain4j.data.embedding.Embedding;
import dev.langchain4j.data.segment.TextSegment;
import dev.langchain4j.model.embedding.EmbeddingModel;
import dev.langchain4j.store.embedding.EmbeddingMatch;
import dev.langchain4j.store.embedding.EmbeddingStore;
import dev.langchain4j.store.embedding.EmbeddingSearchRequest;
import dev.langchain4j.store.embedding.EmbeddingSearchResult;
import iuh.se.kltn.backend.modules.ai.config.AiRuntimeProperties;
import iuh.se.kltn.backend.modules.ai.entity.AiSqlCache;
import iuh.se.kltn.backend.modules.ai.entity.AiActionLog;
import iuh.se.kltn.backend.modules.ai.entity.AiUnrecognizedQuery;
import iuh.se.kltn.backend.modules.ai.dto.AiRawResult;
import iuh.se.kltn.backend.modules.ai.dto.EnrichedQuery;
import iuh.se.kltn.backend.modules.ai.repository.AiSqlCacheRepository;
import iuh.se.kltn.backend.modules.ai.repository.AiActionLogRepository;
import iuh.se.kltn.backend.modules.ai.repository.AiUnrecognizedQueryRepository;
import iuh.se.kltn.backend.modules.ai.dto.IntentExtractionResult;
import iuh.se.kltn.backend.modules.ai.dto.RuleIntentResult;
import iuh.se.kltn.backend.modules.ai.enums.SystemIntent;
import iuh.se.kltn.backend.modules.ai.service.handler.DynamicQueryEngine;
import iuh.se.kltn.backend.modules.property.repository.PropertyRepository;
import jakarta.annotation.PostConstruct;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.cache.Cache;
import org.springframework.cache.CacheManager;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import static dev.langchain4j.store.embedding.filter.MetadataFilterBuilder.metadataKey;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Optional;
import java.util.TreeMap;

@Service
public class AiOrchestratorService {

    @Autowired
    private SqlGeneratorAi sqlGeneratorAi;

    @Autowired
    private SecurityGateService securityGateService;

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
    private RuleIntentRouter ruleIntentRouter;

    @Autowired
    private RuleEntityExtractor ruleEntityExtractor;

    @Autowired
    private QueryContextEnricher queryContextEnricher;

    @Autowired
    private TemplateResponseService templateResponseService;

    @Autowired
    private PresenterDataSanitizer presenterDataSanitizer;

    @Autowired(required = false)
    private AiUnrecognizedQueryRepository aiUnrecognizedQueryRepository;

    @Autowired
    private EmbeddingModel embeddingModel;

    @Autowired
    private EmbeddingStore<TextSegment> embeddingStore;

    @Autowired
    private GeocodingService geocodingService;

    @Autowired
    private PropertyRepository propertyRepository;

    @Autowired
    private AiRuntimeProperties aiRuntimeProperties;

    @Value("${ai.sql-cache.startup.reindex:true}")
    private boolean sqlCacheStartupReindex;

    @Value("${ai.llm.mode:FULL}")
    private String aiLlmMode;

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

        loadSqlFaqVectorCache(false);
    }

    private void loadSqlFaqVectorCache(boolean forceReindex) {
        List<AiSqlCache> allCaches = cacheRepository.findAll();
        List<AiSqlCache> validCaches = allCaches.stream().filter(AiSqlCache::isValid).toList();

        int existingSqlFaqEmbeddings = countSqlFaqEmbeddings();
        if (!forceReindex && !sqlCacheStartupReindex && existingSqlFaqEmbeddings > 0) {
            System.out.println("[AI SQL/FAQ] Startup reindex disabled (ai.sql-cache.startup.reindex=false). Reusing "
                    + existingSqlFaqEmbeddings + " existing embeddings.");
            return;
        }

        System.out.println("[AI SQL/FAQ] Reindexing valid entries into PgVector: " + validCaches.size());

        // Tránh phình dữ liệu do cộng dồn embedding sau mỗi lần restart.
        embeddingStore.removeAll(metadataKey("type").isEqualTo("SQL"));
        embeddingStore.removeAll(metadataKey("type").isEqualTo("FAQ"));

        long startedAt = System.currentTimeMillis();
        int processed = 0;
        int total = validCaches.size();

        for (AiSqlCache cache : validCaches) {
            if ("FAQ".equalsIgnoreCase(cache.getType())) {
                addFaqToVectorStore(cache.getQuestion(), cache.getAnswer());
            } else {
                addQuestionToVectorStore(cache.getQuestion(), cache.getGeneratedSql());
            }

            processed++;
            if (processed % 100 == 0 || processed == total) {
                long elapsed = System.currentTimeMillis() - startedAt;
                System.out.println("[AI SQL/FAQ] Progress " + processed + "/" + total + " (" + elapsed + " ms)");
            }
        }

        long elapsed = System.currentTimeMillis() - startedAt;
        System.out.println("[AI SQL/FAQ] Reindex completed: " + processed + "/" + total + " in " + elapsed + " ms.");
    }

    private int countSqlFaqEmbeddings() {
        try {
            Integer count = jdbcTemplate.queryForObject(
                    "SELECT COUNT(*) FROM ai_embeddings WHERE metadata_json ->> 'type' IN ('SQL','FAQ')",
                    Integer.class
            );
            return count == null ? 0 : count;
        } catch (Exception e) {
            System.out.println("[AI SQL/FAQ] Cannot count existing embeddings: " + e.getMessage());
            return 0;
        }
    }

    /**
     * Tự động nạp dữ liệu seed (204 FAQ + SQL Cache) nếu bảng ai_sql_cache đang
     * trống.
     */
    private void seedInitialDataIfEmpty() {
        long count = cacheRepository.count();
        if (count > 0) {
            System.out.println("ℹ️ Kho tri thức đã có " + count + " câu, bỏ qua seed.");
            return;
        }
        System.out.println("🌱 Kho tri thức trống! Đang nạp dữ liệu mẫu từ seed_faq_data.sql...");
        try {
            org.springframework.core.io.ClassPathResource resource = new org.springframework.core.io.ClassPathResource(
                    "data/seed_faq_data.sql");
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

    // Legacy Location Query has been removed and integrated into IntentExtractor
    // pipeline

    private String normalizeText(String text) {
        if (text == null)
            return "";
        // Chuyển về NFC (Canonical Composition) để đồng nhất các loại dấu tiếng Việt
        return java.text.Normalizer.normalize(text.toLowerCase(), java.text.Normalizer.Form.NFC);
    }

    private boolean isSafeSelectSql(String sql) {
        if (sql == null) {
            return false;
        }
        String trimmed = sql.trim();
        if (trimmed.isEmpty()) {
            return false;
        }
        String upper = trimmed.toUpperCase();
        if (!upper.startsWith("SELECT") && !upper.startsWith("WITH")) {
            return false;
        }
        return !upper.matches(".*\\b(INSERT|UPDATE|DELETE|DROP|ALTER|TRUNCATE|CREATE|GRANT|REVOKE)\\b.*");
    }

    // 1. Thêm 2 tham số role và userId vào hàm
    public Object processDataQuery(String question, String role, Long userId) {
        return processDataQuery(question, role, userId, null, null);
    }

    public Object processDataQuery(String question, String role, Long userId, Double userLatitude, Double userLongitude) {
        String normalizedQuestion = normalizeText(question);
        boolean currentLocationQuery = isNearCurrentLocationQuery(question, role);
        System.out.println("[LOCATION INPUT] query='" + question + "', isCurrentLocationQuery=" + currentLocationQuery
                + ", lat=" + userLatitude + ", lng=" + userLongitude);

        // 🛡️ BẢO VỆ GUEST: Chặn các từ khóa nhạy cảm ngay từ đầu bằng Regex để chính
        // xác tuyệt đối
        if (role.equalsIgnoreCase("GUEST")) {
            // Regex kiểm tra các từ khóa nhạy cảm — PHIÊN BẢN TOÀN DIỆN
            // Phân nhóm rõ ràng để dễ bảo trì
            String sensitivePattern = ".*("
                    // === NHÓM 1: Tài chính & Thanh toán ===
                    + "hóa đơn|hoá đơn|bill|invoice|payment"
                    + "|nợ|thanh toán|trả tiền|chưa trả|đóng tiền|chưa đóng"
                    + "|tiền phòng|tiền thuê|tiền cọc|đặt cọc|cọc"
                    + "|doanh thu|revenue|phí|quá hạn|trễ hạn|trễ"
                    + "|quyết toán|settlement|khấu trừ|deduction|kiểm kê"
                    // === NHÓM 2: Hợp đồng & Pháp lý ===
                    + "|hợp đồng|contract|gia hạn|chấm dứt|terminate"
                    + "|lịch hẹn|appointment|booking"
                    // === NHÓM 3: Tra cứu Người (chống dò theo tên) ===
                    + "|của khách|của người|của ai|của bạn"
                    + "|khách có|khách nào|khách tên|khách ở"
                    + "|người tên|người ở phòng|người nào thuê|người thuê|người đang"
                    + "|có tên là|có tên|tên là"
                    + "|ai thuê|ai ở|ai đang|ai sống|ai mướn"
                    + "|thành viên|member|tenant|khách thuê"
                    // === NHÓM 4: Tra cứu Phòng → Người (reverse lookup) ===
                    + "|phòng của|phòng.*ai ở|phòng.*ai thuê|phòng.*người tên|phòng.*người thuê|phòng.*người nào"
                    + "|ở phòng nào|thuê phòng nào|mướn phòng nào"
                    + "|phòng nào.*đã thuê|phòng nào.*ai.*thuê|phòng nào.*ở|phòng nào.*người"
                    // === NHÓM 5: Chủ trọ & Quản lý ===
                    + "|chủ trọ|chủ nhà|chủ khu|landlord"
                    + "|người dùng|user|admin"
                    // === NHÓM 6: Thông tin Cá nhân & Liên hệ ===
                    + "|số điện thoại|sđt|sdt|phone"
                    + "|email|e-mail|zalo|facebook"
                    + "|liên hệ|liên lạc|contact"
                    + "|hồ sơ|tài khoản|profile|account"
                    + "|mật khẩu|password|ví|wallet"
                    + "|cá nhân|riêng tư|private|bí mật|secret"
                    // === NHÓM 7: Sở hữu cá nhân ===
                    + "|của tôi|của mình|của em|của anh|của chị"
                    + "|phòng tôi|phòng mình"
                    // === NHÓM 8: Blockchain & Bảo mật ===
                    + "|blockchain|on-chain|onchain|smart contract"
                    + "|giao dịch|transaction|ví tiền"
                    // === NHÓM 9: Lịch sử & Thống kê ===
                    + "|lịch sử|history|thống kê|statistic"
                    + "|thông báo|notification"
                    + "|báo cáo|report|xuất dữ liệu|export"
                    // === NHÓM 10: Trích xuất dữ liệu hàng loạt (chỉ chặn khi kết hợp nhạy cảm) ===
                    + "|danh sách.*(khách|người|thuê|hợp đồng|bill|nợ|thanh toán)"
                    + "|liệt kê.*(khách|người|thuê|hợp đồng|bill|nợ|thanh toán|thành viên|user)"
                    + "|show.*all|dump"
                    // === NHÓM 11: Tra cứu theo ID ===
                    + "|id\\s*(?:là|=|:)\\s*\\d+|landlord_id|tenant_id|user_id|contract_id"
                    + ").*";
            if (normalizedQuestion.matches(sensitivePattern)) {
                System.out.println("🛡️ [SECURITY GUEST] Chặn truy vấn nhạy cảm: " + question);
                return "Dạ, vì lý do bảo mật, các thông tin cá nhân như hóa đơn, hợp đồng và lịch hẹn chỉ dành cho người dùng đã đăng nhập. Bạn vui lòng Đăng nhập để sử dụng các tính năng này nhé!";
            }
        }

        // Query-data chi nen tra cuu du lieu co cau truc. Cau hoi mang tinh chinh sach/quy trinh
        // (khong gan voi tai khoan cu the) se duoc uu tien dung FAQ de tranh "lac cau hoi".
        if (isPolicyStyleQuestion(question) && !hasPersonalDataCue(question)) {
            String faqAnswer = searchFaq(question);
            if (faqAnswer != null && !faqAnswer.isBlank()) {
                return sanitizeUserFacingText(faqAnswer);
            }
            return "Dạ, câu hỏi này đang thuộc nhóm chính sách/hướng dẫn. "
                    + "Bạn vui lòng dùng mục chat tư vấn để mình trả lời theo tài liệu hệ thống mới nhất nhé.";
        }

        String sqlToExecute = null;

        String schemaGeneral = "Sơ đồ cơ sở dữ liệu thực tế:\n" +
                "- properties: id, landlord_id, name, address, district, city, latitude, longitude, description, elec_price, water_price, internet_price, status (ENUM: 'PENDING', 'APPROVED', 'REJECTED')\n"
                +
                "- rooms: id, property_id, name, price, area, max_occupants, current_occupants, type (ENUM: 'STUDIO', 'ONE_BEDROOM', 'TWO_BEDROOM', 'SINGLE_ROOM', 'SHARED_ROOM', 'MEZZANINE_ROOM'), has_mezzanine, has_balcony, status (ENUM: 'AVAILABLE', 'RENTED', 'MAINTENANCE', 'RESERVED', 'HIDDEN'), amenities, default_terms\n";

        String schemaTenantAndLandlord = schemaGeneral +
                "- contracts: id, tenant_id, room_id, actual_price, sign_date, start_date, end_date, deposit_amount, status (ENUM: 'PENDING_SIGNATURE', 'AWAITING_DEPOSIT', 'ACTIVE', 'EXPIRED', 'TERMINATED_EARLY'), is_tenant_signed, is_landlord_signed\n"
                +
                "- bills: id, contract_id, month, year, old_elec_index, new_elec_index, old_water_index, new_water_index, total_amount, payment_tx_hash, status (ENUM: 'UNPAID', 'PAID', 'LATE', 'PENDING'), penalty_fee, paid_at, additional_fee, discount_amount\n"
                +
                "- appointments: id, tenant_id, landlord_id, room_id, meet_time, status (ENUM: 'PENDING', 'APPROVED', 'REJECTED', 'CANCELLED', 'COMPLETED'), meeting_link\n"
                +
                "- reviews: id, contract_id, reviewer_id, target_id, rating, comment, created_at\n";

        String schemaLandlordSpecial = "- users: id, username, full_name, email, phone_number, role, reputation_score, kyc_status\n";

        String schemaContext = "";
        String roleRules = "";

        if (role.equalsIgnoreCase("TENANT")) {
            schemaContext = schemaTenantAndLandlord;
            roleRules = "1. HỌ KHÔNG ĐƯỢC XEM DOANH THU CỦA CHỦ TRỌ.\n" +
                    "2. Khi họ tìm kiếm thông tin về TẤT CẢ PHÒNG TRỐNG hoặc GIÁ PHÒNG, ĐÂY LÀ DỮ LIỆU CÔNG KHAI, KHÔNG CẦN CHÈN ĐIỀU KIỆN LỌC. (Nhớ điều kiện rooms.status='AVAILABLE').\n"
                    +
                    "3. Tuy nhiên, nếu họ hỏi về hóa đơn (bills) hay hợp đồng (contracts), BẮT BUỘC phải lọc bằng `contracts.tenant_id = USER_ID_PLACEHOLDER` (viết chính xác cụm USER_ID_PLACEHOLDER, không tự điền ID thật).\n"
                    +
                    "4. ĐỐI VỚI BẢNG LỊCH HẸN (appointments): BẮT BUỘC chèn điều kiện lọc `appointments.tenant_id = USER_ID_PLACEHOLDER`.\n"
                    +
                    "5. ĐỐI VỚI BẢNG BILLS: Bảng bills không có cột tenant_id. BẮT BUỘC phải JOIN bills với contracts RỒI MỚI lọc bằng `contracts.tenant_id = USER_ID_PLACEHOLDER`. Nếu khách hỏi NỢ TIỀN CHƯA ĐÓNG, lọc thêm bills.status IN ('UNPAID', 'LATE').\n"
                    +
                    "6. Nếu họ thắc mắc về các phòng không thuộc quyền sở hữu của họ, chỉ trả về dữ liệu cơ bản.\n" +
                    "7. MẸO JOIN BẢNG: Nếu cần truy vấn địa điểm, BẮT BUỘC phải JOIN bảng `rooms` với bảng `properties` (`rooms.property_id = properties.id`).\n"
                    +
                    "8. CHÚ Ý TỪ KHÓA 'cho tôi': Dù Khách thuê nói 'tìm phòng cho tôi', nếu đó là yêu cầu tìm Phòng Trống chung chung, KHÔNG ĐƯỢC lọc theo `contracts.tenant_id`.";
        } else if (role.equalsIgnoreCase("LANDLORD")) {
            schemaContext = schemaTenantAndLandlord + schemaLandlordSpecial;
            roleRules = "1. BẮT BUỘC phải thêm điều kiện lọc `landlord_id = USER_ID_PLACEHOLDER` vào MỌI truy vấn cá nhân. Đối với bảng `appointments` nó có sẵn cột `landlord_id`. Đối với `rooms`, `contracts`, `bills` thì BẮT BUỘC phải JOIN qua `properties` để lấy cột `properties.landlord_id = USER_ID_PLACEHOLDER`.\n"
                    +
                    "2. LUÔN LUÔN dùng LIKE khi tra cứu địa điểm.\n" +
                    "3. NGUYÊN TẮC DOANH THU (Revenue): Nếu hỏi DOANH THU, BẮT BUỘC dùng hàm SUM(bills.total_amount) VÀ ĐIỀU KIỆN bills.status = 'PAID'. (Tuyệt đối không cộng gộp hóa đơn chưa thanh toán).\n"
                    +
                    "4. NGUYÊN TẮC CON NỢ (Debtors): Nếu hỏi KHÁCH NỢ TIỀN, lọc bills.status IN ('UNPAID', 'LATE').\n" +
                    "5. NGUYÊN TẮC HỢP ĐỒNG: Nếu hỏi hợp đồng sắp hết hạn, kiểm tra contracts.status = 'ACTIVE'.";
        } else {
            schemaContext = schemaGeneral;
            roleRules = "1. ĐÂY LÀ KHÁCH VÃNG LAI (GUEST). BẮT BUỘC KHÔNG ĐƯỢC truy cập bảng contracts, bills, hay users.\n"
                    +
                    "2. Nếu câu hỏi yêu cầu xem hóa đơn, hợp đồng, lịch hẹn hoặc doanh thu, BẮT BUỘC CHỈ TRẢ VỀ CHỮ: UNAUTHORIZED.\n"
                    +
                    "3. Khi truy vấn phòng trống theo yêu cầu khách, BẮT BUỘC kèm theo điều kiện kép: `rooms.status = 'AVAILABLE'` VÀ `properties.status = 'APPROVED'` để không lấy phòng ảo/đã có người.\n"
                    +
                    "4. Luôn lấy cột r.images để GUEST có thể xem ảnh phòng.";
        }

        // 🌟 NEW HYBRID AI PIPELINE (Strangler Fig Pattern)
        long startTime = System.currentTimeMillis();
        String predictedIntent = "UNKNOWN";
        Double confidence = 0.0;
        boolean fallbackUsed = false;
        boolean success = false;

        if (currentLocationQuery) {
            if (hasValidCoordinates(userLatitude, userLongitude)) {
                System.out.println("[LOCATION FLOW] selectedFlow=COORDINATE_CURRENT_POSITION");
                Double radius = extractRadiusKm(question);
                Long maxPrice = extractMaxPriceVnd(question);
                boolean cheapMode = shouldUseCheapMode(question, maxPrice);
                Integer requiredOccupants = extractRequiredOccupantsFromQuestion(question);
                boolean requirePetFriendly = extractRequirePetFriendly(question);
                String currentLocationResponse = handleLocationSearchByCoordinatesFlow(
                        userLatitude,
                        userLongitude,
                        radius,
                        maxPrice,
                        cheapMode,
                        requiredOccupants,
                        requirePetFriendly,
                        question,
                        role,
                        userId,
                        "LOCATION_SEARCH_CURRENT_POSITION",
                        1.0,
                        startTime);
                if (currentLocationResponse != null) {
                    return currentLocationResponse;
                }
            }

            System.out.println("[LOCATION FLOW] selectedFlow=GPS_REQUIRED");
            saveActionLog(userId, role, question, "LOCATION_SEARCH_CURRENT_POSITION", 1.0, false, startTime, true, "LOCATION_GPS", null, null, null, "GPS");
            return buildUserLocationRequiredMessage();
        }
        // Heuristic guard: câu có "gần <địa điểm>" sẽ ưu tiên luồng LOCATION_SEARCH
        // để luôn có distance_km thay vì trả danh sách thường thiếu khoảng cách.
        String heuristicLocation = tryExtractLocationForNearbySearch(question, role);
        if (heuristicLocation != null) {
            System.out.println("[LOCATION FLOW] selectedFlow=LANDMARK_HEURISTIC, heuristicLocation='" + heuristicLocation + "'");
            Double heuristicRadius = extractRadiusKm(question);
            Long heuristicMaxPrice = extractMaxPriceVnd(question);
            boolean heuristicCheapMode = shouldUseCheapMode(question, heuristicMaxPrice);
            Integer heuristicRequiredOccupants = extractRequiredOccupantsFromQuestion(question);
            boolean heuristicRequirePetFriendly = extractRequirePetFriendly(question);
            String heuristicResponse = handleLocationSearchFlow(
                    heuristicLocation,
                    heuristicRadius,
                    heuristicMaxPrice,
                    heuristicCheapMode,
                    heuristicRequiredOccupants,
                    heuristicRequirePetFriendly,
                    question,
                    role,
                    userId,
                    "LOCATION_SEARCH_HEURISTIC",
                    1.0,
                    startTime,
                    true);
            if (heuristicResponse != null) {
                return heuristicResponse;
            }
            System.out.println(
                    "⚠️ [HEURISTIC] Fallback to intent pipeline because geocode miss for: " + heuristicLocation);
        }

        String llmMode = resolveLlmMode();
        boolean templateOnlyMode = "TEMPLATE_ONLY".equals(llmMode);
        boolean presenterOnlyMode = "PRESENTER_ONLY".equals(llmMode);
        boolean fullLlmMode = "FULL".equals(llmMode);

        IntentExtractionResult extraction = null;
        String intentSource = "UNKNOWN";
        Optional<RuleIntentResult> ruleResult = ruleIntentRouter.classify(question, role);
        if (ruleResult.isPresent() && ruleResult.get().matchScore() >= ruleIntentRouter.getAcceptThreshold()) {
            RuleIntentResult matchedRule = ruleResult.get();
            Map<String, Object> ruleParams = new HashMap<>(ruleEntityExtractor.extract(question, matchedRule.intent()));
            extraction = new IntentExtractionResult(matchedRule.intent(), matchedRule.matchScore(), ruleParams);
            predictedIntent = matchedRule.intent().name();
            confidence = matchedRule.matchScore();
            intentSource = matchedRule.source();
            System.out.println("[HYBRID AI] Rule intent matched: " + predictedIntent + " (Score: " + confidence + ")");
        }

        if (extraction == null && fullLlmMode) {
            try {
                System.out.println("[HYBRID AI] Calling intent extractor LLM...");
                String rawJson = intentExtractorAi.extractIntent(question, role);
                rawJson = rawJson.replace("```json", "").replace("```", "").trim();

                com.fasterxml.jackson.databind.ObjectMapper mapper = new com.fasterxml.jackson.databind.ObjectMapper();
                com.fasterxml.jackson.databind.JsonNode jsonNode = mapper.readTree(rawJson);

                String intentStr = jsonNode.has("intent") ? jsonNode.get("intent").asText() : "UNKNOWN";
                confidence = jsonNode.has("confidenceScore") ? jsonNode.get("confidenceScore").asDouble() : 0.0;
                predictedIntent = intentStr;

                Map<String, Object> extractedParams = new HashMap<>();
                if (jsonNode.has("params") && jsonNode.get("params").isObject()) {
                    jsonNode.get("params").fields().forEachRemaining(entry -> {
                        com.fasterxml.jackson.databind.JsonNode val = entry.getValue();
                        if (val.isNumber()) {
                            extractedParams.put(entry.getKey(), val.numberValue());
                        } else if (val.isBoolean()) {
                            extractedParams.put(entry.getKey(), val.booleanValue());
                        } else {
                            extractedParams.put(entry.getKey(), val.asText());
                        }
                    });
                }

                iuh.se.kltn.backend.modules.ai.enums.SystemIntent systemIntent;
                try {
                    systemIntent = iuh.se.kltn.backend.modules.ai.enums.SystemIntent.valueOf(intentStr);
                } catch (IllegalArgumentException e) {
                    systemIntent = iuh.se.kltn.backend.modules.ai.enums.SystemIntent.UNKNOWN;
                }

                extraction = new IntentExtractionResult(systemIntent, confidence, extractedParams);
                intentSource = "LLM";
                System.out.println("[HYBRID AI] Extracted Intent: " + predictedIntent + " (Score: " + confidence + ")");
            } catch (Exception e) {
                fallbackUsed = true;
                System.err.println("[HYBRID AI] Intent extractor failed: " + e.getMessage() + ". Fallback to SQL cache/SQL generation.");
            }
        }

        EnrichedQuery enrichedQuery = queryContextEnricher.enrich(
                question,
                extraction != null ? extraction.getIntent() : SystemIntent.UNKNOWN,
                extraction != null ? extraction.getParams() : null,
                userId,
                role,
                userLatitude,
                userLongitude
        );
        List<String> contextAssumptions = enrichedQuery.getAssumptions() == null ? List.of() : enrichedQuery.getAssumptions();

        if (enrichedQuery.isShouldAskClarification()) {
            success = true;
            saveActionLog(
                    userId,
                    role,
                    question,
                    extraction == null ? "UNKNOWN" : extraction.getIntent().name(),
                    confidence,
                    false,
                    startTime,
                    true,
                    "CONTEXT_CLARIFICATION_REQUIRED",
                    null,
                    null,
                    null,
                    null
            );
            saveUnrecognizedQuery(
                    userId,
                    question,
                    normalizedQuestion,
                    extraction == null ? "UNKNOWN" : extraction.getIntent().name(),
                    confidence,
                    intentSource,
                    llmMode,
                    enrichedQuery.getParams(),
                    "CONTEXT_CLARIFICATION_REQUIRED"
            );
            return sanitizeUserFacingText(enrichedQuery.getClarificationMessage());
        }

        if (extraction != null) {
            if (enrichedQuery.getIntent() != null) {
                extraction.setIntent(enrichedQuery.getIntent());
            }
            extraction.setParams(enrichedQuery.getParams() == null ? new HashMap<>() : new HashMap<>(enrichedQuery.getParams()));
            predictedIntent = extraction.getIntent().name();
            if (!contextAssumptions.isEmpty()) {
                System.out.println("[CONTEXT ENRICHMENT] assumptions=" + contextAssumptions);
            }
        }

        if (extraction != null && confidence != null && confidence >= 0.7) {
            if (isPolicyIntent(extraction.getIntent())) {
                String policyAnswer = resolvePolicyAnswer(question, extraction.getIntent());
                if (policyAnswer != null) {
                    success = true;
                    saveActionLog(userId, role, question, predictedIntent, confidence, false, startTime, true, "POLICY_FAQ", null, null, null, null);
                    return sanitizeUserFacingText(policyAnswer);
                }
            }

            if (extraction.getIntent() == iuh.se.kltn.backend.modules.ai.enums.SystemIntent.LOCATION_SEARCH) {
                success = true;
                String locationName = extraction.getParams().containsKey("location")
                        ? extraction.getParams().get("location").toString()
                        : null;
                Double radius = 3.0;
                if (extraction.getParams().containsKey("radius")) {
                    try {
                        radius = Double.parseDouble(extraction.getParams().get("radius").toString());
                    } catch (Exception ignored) {
                    }
                }
                Long maxPrice = extractMaxPriceFromParams(extraction.getParams(), question);
                boolean cheapMode = shouldUseCheapMode(question, maxPrice);
                Integer requiredOccupants = extractRequiredOccupantsFromParams(extraction.getParams(), question);
                boolean requirePetFriendly = extractRequirePetFriendlyFromParams(extraction.getParams(), question);
                boolean useCurrentLocation = isCurrentLocationCue(locationName) || isNearCurrentLocationQuery(question, role);
                if (useCurrentLocation) {
                    if (hasValidCoordinates(userLatitude, userLongitude)) {
                        return handleLocationSearchByCoordinatesFlow(
                                userLatitude,
                                userLongitude,
                                radius,
                                maxPrice,
                                cheapMode,
                                requiredOccupants,
                                requirePetFriendly,
                                question,
                                role,
                                userId,
                                predictedIntent,
                                confidence,
                                startTime);
                    }
                    return buildUserLocationRequiredMessage();
                }
                return handleLocationSearchFlow(
                        locationName,
                        radius,
                        maxPrice,
                        cheapMode,
                        requiredOccupants,
                        requirePetFriendly,
                        question,
                        role,
                        userId,
                        predictedIntent,
                        confidence,
                        startTime,
                        false);
            }

            if (dynamicQueryEngine.canHandle(extraction.getIntent())) {
                if (role.equalsIgnoreCase("GUEST") && extraction.getIntent() != iuh.se.kltn.backend.modules.ai.enums.SystemIntent.SEARCH_ROOM) {
                    saveActionLog(userId, role, question, predictedIntent, confidence, false, startTime, false, "SECURITY_BLOCKED", null, null, null, null);
                    return "Da, vi ly do bao mat, thong tin nay chi danh cho nguoi dung da dang nhap. Ban vui long dang nhap de su dung tinh nang nay nhe!";
                }
                if (role.equalsIgnoreCase("TENANT")) {
                    iuh.se.kltn.backend.modules.ai.enums.SystemIntent intent = extraction.getIntent();
                    if (intent == iuh.se.kltn.backend.modules.ai.enums.SystemIntent.VIEW_REVENUE
                            || intent == iuh.se.kltn.backend.modules.ai.enums.SystemIntent.VIEW_DEBTORS
                            || intent == iuh.se.kltn.backend.modules.ai.enums.SystemIntent.VIEW_OCCUPANCY
                            || intent == iuh.se.kltn.backend.modules.ai.enums.SystemIntent.VIEW_RISK) {
                        saveActionLog(userId, role, question, predictedIntent, confidence, false, startTime, false, "SECURITY_BLOCKED", null, null, null, null);
                        return "Dạ, thông tin này thuộc về nội bộ quản lý, em không thể tiết lộ.";
                    }
                }

                String cacheKey = buildCacheKey(predictedIntent, extraction.getParams(), userId, role, question);
                Cache resultCache = cacheManager.getCache("aiQueryResults");
                if (resultCache != null) {
                    Cache.ValueWrapper cachedResult = resultCache.get(cacheKey);
                    if (cachedResult != null) {
                        success = true;
                        saveActionLog(userId, role, question, predictedIntent, confidence, false, startTime, true, "RESULT_CACHE_HIT", null, null, null, null);
                        return sanitizeUserFacingResponse(cachedResult.get());
                    }
                }

                List<Map<String, Object>> results = dynamicQueryEngine.execute(extraction, userId, role);
                Object response = buildStructuredResponse(
                        question,
                        role,
                        predictedIntent,
                        intentSource,
                        results,
                        templateOnlyMode,
                        presenterOnlyMode
                );
                response = appendAssumptionsIfNeeded(response, contextAssumptions);
                if (resultCache != null) {
                    resultCache.put(cacheKey, response);
                }
                success = true;
                saveActionLog(userId, role, question, predictedIntent, confidence, false, startTime, true, "DQE_HIT", null, results.size(), null, null);
                return response;
            }
        } else {
            fallbackUsed = true;
            if (extraction != null) {
                System.out.println("[HYBRID AI] Intent confidence low (" + confidence + "). Fallback to SQL cache/SQL generation.");
                saveUnrecognizedQuery(
                        userId,
                        question,
                        normalizedQuestion,
                        predictedIntent,
                        confidence,
                        intentSource,
                        llmMode,
                        extraction.getParams(),
                        "LOW_CONFIDENCE"
                );
            } else {
                System.out.println("[HYBRID AI] No intent match from rule/LLM. Fallback to SQL cache/SQL generation.");
                saveUnrecognizedQuery(
                        userId,
                        question,
                        normalizedQuestion,
                        predictedIntent,
                        confidence,
                        intentSource,
                        llmMode,
                        null,
                        "NO_INTENT_MATCH"
                );
            }
        }

        if (!fullLlmMode) {
            String source = "SQL_FALLBACK_DISABLED_" + llmMode;
            saveActionLog(userId, role, question, predictedIntent, confidence, true, startTime, false,
                    source, null, null, null, null);
            saveUnrecognizedQuery(userId, question, normalizedQuestion, predictedIntent, confidence, intentSource, llmMode, null, source);
            return sanitizeUserFacingText(resolveQueryDataUnsupportedMessage());
        }

        // Fallback tracking variables
        String fallbackResponseSource = null;
        Double fallbackCacheScore = null;

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
            String candidateSql = matches.get(0).embedded().metadata().getString("sql");
            if (isLikelySemanticSqlMatch(question, candidateSql, role)) {
                sqlToExecute = candidateSql;
                fallbackResponseSource = "SQL_CACHE_HIT";
                fallbackCacheScore = (double) matches.get(0).score();
                System.out.println("⚡ [SEMANTIC CACHE HIT] Độ tương đồng: " + matches.get(0).score());
            } else {
                System.out.println("⚠️ [SEMANTIC CACHE MISMATCH] Bỏ qua cache vì lệch ngữ nghĩa câu hỏi.");
            }
        } else {
            System.out.println("🐌 [CACHE MISS] Câu hỏi mới, gọi Gemini sinh SQL...");
        }

        if (sqlToExecute == null || sqlToExecute.isBlank()) {
            if (!isSqlGeneratorEnabled()) {
                saveActionLog(userId, role, question, predictedIntent, confidence, true, startTime, false,
                        "SQL_GENERATOR_DISABLED", null, null, null, null);
                saveUnrecognizedQuery(userId, question, normalizedQuestion, predictedIntent, confidence, intentSource, llmMode, null, "SQL_GENERATOR_DISABLED");
                return sanitizeUserFacingText(resolveQueryDataUnsupportedMessage());
            }

            System.out.println("[SQL GENERATION] Cache miss, calling LLM for SQL generation...");
            try {
                sqlToExecute = sqlGeneratorAi.generateSql(question, role, userId, schemaContext, roleRules);
                fallbackResponseSource = "SQL_GENERATED";
            } catch (Exception llmEx) {
                System.err.println("[SQL GENERATION] LLM call failed: " + llmEx.getMessage());
                saveActionLog(userId, role, question, predictedIntent, confidence, true, startTime, false,
                        "LLM_SQL_GENERATION_ERROR", null, null, null, null);
                return "Da, may chu AI hien tai dang qua tai. Vui long thu lai sau it phut.";
            }
        }

        if (sqlToExecute == null || sqlToExecute.isBlank()) {
            return "Dạ, em chưa tạo được truy vấn phù hợp từ câu hỏi này. Bạn vui lòng diễn đạt rõ hơn để em hỗ trợ chính xác hơn nhé.";
        }

        sqlToExecute = sqlToExecute.replace("```sql", "").replace("```", "").trim();
        int selectIndex = sqlToExecute.toUpperCase().indexOf("SELECT");
        if (selectIndex >= 0) {
            sqlToExecute = sqlToExecute.substring(selectIndex);
        }
        sqlToExecute = normalizeSqlDialectForPostgres(sqlToExecute);

        // ====================================================================
        // 🛡️ SECURITY GATE: Kiểm tra toàn bộ bảo mật qua SecurityGateService
        // ====================================================================
        SecurityGateService.SecurityResult securityResult = securityGateService.validateAndSanitize(sqlToExecute, role);
        if (securityResult.isBlocked()) {
            saveActionLog(userId, role, question, predictedIntent, confidence, true, startTime, false,
                    "SECURITY_BLOCKED", sqlToExecute, null, null, null);
            return securityResult.getMessage();
        }

        // Cập nhật Placeholder thành User ID thật sự
        String finalSql = securityResult.getSanitizedSql().replace("USER_ID_PLACEHOLDER", userId.toString());

        // 3. THỰC THI SQL
        try {
            jdbcTemplate.setQueryTimeout(1); // Chặn DoS: Giới hạn 1 giây cho SQL sinh bởi AI
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

            Object response = buildStructuredResponse(
                    question,
                    role,
                    predictedIntent,
                    fallbackResponseSource != null ? fallbackResponseSource : "SQL_FALLBACK",
                    results,
                    templateOnlyMode,
                    presenterOnlyMode
            );

            saveActionLog(userId, role, question, predictedIntent, confidence, true, startTime, true,
                    fallbackResponseSource, finalSql, results.size(), fallbackCacheScore, null);

            return response;

        } catch (Exception e) {
            System.err.println("❌ Lỗi thực thi SQL: " + e.getMessage());
            saveActionLog(userId, role, question, predictedIntent, confidence, true, startTime, false,
                    "SQL_EXECUTION_ERROR", finalSql, null, fallbackCacheScore, null);
            return "Dạ, hệ thống đang gặp chút khó khăn khi tra cứu thông tin này. Bạn vui lòng thử lại sau nhé!";
        } finally {
            jdbcTemplate.setQueryTimeout(0); // Reset timeout về mặc định cho các nghiệp vụ khác
        }
    }

    // Admin: Thống kê AI NLP
    public String sanitizeForUserFacing(String text) {
        return sanitizeUserFacingText(text);
    }

    private boolean isSqlGeneratorEnabled() {
        if (aiRuntimeProperties == null || aiRuntimeProperties.getSqlGenerator() == null) {
            return false;
        }
        return aiRuntimeProperties.getSqlGenerator().isEnabled();
    }

    private String resolveQueryDataUnsupportedMessage() {
        String unsupported = null;
        if (aiRuntimeProperties != null
                && aiRuntimeProperties.getTemplates() != null
                && aiRuntimeProperties.getTemplates().getQueryData() != null) {
            unsupported = aiRuntimeProperties.getTemplates().getQueryData().getUnsupported();
        }
        if (unsupported == null || unsupported.isBlank()) {
            unsupported = "Dạ, hệ thống chưa đủ dữ liệu để xử lý câu hỏi này ở chế độ hiện tại.";
        }
        return unsupported;
    }

    private String resolveLlmMode() {
        String mode = aiLlmMode;
        AiRuntimeProperties.FeaturePolicy queryDataPolicy = aiRuntimeProperties.getFeatures().getQueryData();
        if (queryDataPolicy != null && queryDataPolicy.getMode() != null && !queryDataPolicy.getMode().isBlank()) {
            mode = queryDataPolicy.getMode();
        }
        if (queryDataPolicy != null && !queryDataPolicy.isLlmEnabled()) {
            return "TEMPLATE_ONLY";
        }
        if (mode == null || mode.isBlank()) {
            return "FULL";
        }
        String normalized = mode.trim().toUpperCase(Locale.ROOT);
        if ("TEMPLATE_ONLY".equals(normalized) || "PRESENTER_ONLY".equals(normalized) || "FULL".equals(normalized)) {
            return normalized;
        }
        return "FULL";
    }

    private boolean isPolicyIntent(iuh.se.kltn.backend.modules.ai.enums.SystemIntent intent) {
        return intent == iuh.se.kltn.backend.modules.ai.enums.SystemIntent.DEPOSIT_POLICY
                || intent == iuh.se.kltn.backend.modules.ai.enums.SystemIntent.PAYMENT_GUIDE
                || intent == iuh.se.kltn.backend.modules.ai.enums.SystemIntent.CONTRACT_POLICY;
    }

    private String resolvePolicyAnswer(String question, iuh.se.kltn.backend.modules.ai.enums.SystemIntent intent) {
        String faqAnswer = searchFaq(question);
        if (faqAnswer != null && !faqAnswer.isBlank()) {
            return faqAnswer;
        }

        return switch (intent) {
            case DEPOSIT_POLICY ->
                    "Dạ, chính sách tiền cọc có thể khác nhau theo từng phòng/khu trọ. Bạn vui lòng xem mục chính sách hoặc liên hệ chủ trọ để được xác nhận điều kiện hoàn cọc và khấu trừ.";
            case PAYMENT_GUIDE ->
                    "Dạ, bạn có thể thanh toán theo hướng dẫn trong hóa đơn hoặc mục thanh toán. Nếu cần, mình có thể hỗ trợ kiểm tra trạng thái thanh toán hiện tại của bạn.";
            case CONTRACT_POLICY ->
                    "Dạ, điều khoản hợp đồng phụ thuộc từng giao dịch cụ thể. Bạn vui lòng xem bản hợp đồng hoặc liên hệ chủ trọ để được giải thích chi tiết từng điều khoản.";
            default -> null;
        };
    }

    private Object buildStructuredResponse(
            String question,
            String role,
            String intent,
            String intentSource,
            List<Map<String, Object>> results,
            boolean templateOnlyMode,
            boolean presenterOnlyMode
    ) {
        String safeIntent = intent == null ? "UNKNOWN" : intent;
        List<Map<String, Object>> safeResults = presenterDataSanitizer.sanitize(safeIntent, role, results);
        if (safeResults == null) {
            safeResults = List.of();
        }
        AiRawResult rawResult = AiRawResult.builder()
                .intent(safeIntent)
                .intentSource(intentSource)
                .userRole(role)
                .rows(safeResults)
                .totalCount(safeResults == null ? 0 : safeResults.size())
                .build();

        if (templateOnlyMode) {
            return sanitizeUserFacingText(templateResponseService.format(rawResult));
        }

        String rawDataStr = safeResults == null || safeResults.isEmpty()
                ? "Khong tim thay du lieu phu hop."
                : safeResults.toString();
        try {
            return sanitizeUserFacingResponse(dataPresenterAi.generateNaturalResponse(question, rawDataStr, role));
        } catch (Exception llmEx) {
            String modeLabel = presenterOnlyMode ? "PRESENTER_ONLY" : "FULL";
            System.err.println("[PRESENTER] LLM formatting failed in mode " + modeLabel + ": " + llmEx.getMessage());
            return sanitizeUserFacingText(templateResponseService.format(rawResult));
        }
    }

    private void saveUnrecognizedQuery(
            Long userId,
            String question,
            String normalizedQuestion,
            String predictedIntent,
            Double matchScore,
            String intentSource,
            String llmMode,
            Map<String, Object> entities,
            String reason
    ) {
        if (aiUnrecognizedQueryRepository == null || question == null || question.isBlank()) {
            return;
        }
        try {
            AiUnrecognizedQuery record = AiUnrecognizedQuery.builder()
                    .userId(userId != null && userId > 0 ? userId : null)
                    .question(question)
                    .normalizedQuestion(normalizedQuestion)
                    .predictedIntent(predictedIntent)
                    .matchScore(matchScore)
                    .intentSource(intentSource)
                    .llmMode(llmMode)
                    .entitiesJson(entities == null ? null : entities.toString())
                    .reason(reason)
                    .status("PENDING")
                    .build();
            aiUnrecognizedQueryRepository.save(record);
        } catch (Exception e) {
            System.err.println("[AI FEEDBACK] Failed to save unrecognized query: " + e.getMessage());
        }
    }

    private Object sanitizeUserFacingResponse(Object response) {
        if (response instanceof String text) {
            return sanitizeUserFacingText(text);
        }
        return response;
    }

    private Object appendAssumptionsIfNeeded(Object response, List<String> assumptions) {
        if (!(response instanceof String text) || assumptions == null || assumptions.isEmpty()) {
            return response;
        }
        List<String> uniqueAssumptions = assumptions.stream()
                .filter(item -> item != null && !item.isBlank())
                .distinct()
                .toList();
        if (uniqueAssumptions.isEmpty()) {
            return response;
        }
        String prefix = String.join(" ", uniqueAssumptions).trim();
        if (prefix.isBlank()) {
            return response;
        }
        return sanitizeUserFacingText(prefix + "\n" + text);
    }

    private String sanitizeUserFacingText(String text) {
        if (text == null || text.isBlank()) {
            return text;
        }

        String sanitized = text;
        String[][] statusReplacements = new String[][] {
                {"PENDING_SIGNATURE", "chờ ký"},
                {"AWAITING_DEPOSIT", "chờ đặt cọc"},
                {"TERMINATED_EARLY", "đã chấm dứt sớm"},
                {"UNPAID", "chưa thanh toán"},
                {"PAID", "đã thanh toán"},
                {"LATE", "trễ hạn"},
                {"PENDING", "đang chờ xử lý"},
                {"APPROVED", "đã duyệt"},
                {"REJECTED", "từ chối"},
                {"COMPLETED", "đã hoàn tất"},
                {"CANCELLED", "đã hủy"},
                {"EXPIRED", "đã hết hạn"},
                {"ACTIVE", "đang hiệu lực"},
                {"AVAILABLE", "còn trống"},
                {"RENTED", "đã cho thuê"},
                {"MAINTENANCE", "bảo trì"},
                {"RESERVED", "đã giữ chỗ"},
                {"HIDDEN", "đang ẩn"}
        };

        for (String[] replacement : statusReplacements) {
            String statusCode = replacement[0];
            String friendlyLabel = replacement[1];
            sanitized = sanitized.replaceAll("(?i)\\b" + java.util.regex.Pattern.quote(statusCode) + "\\b", friendlyLabel);
        }

        sanitized = sanitized.replaceAll("\\(\\s*(?i:PENDING_SIGNATURE|AWAITING_DEPOSIT|TERMINATED_EARLY|UNPAID|PAID|LATE|PENDING|APPROVED|REJECTED|COMPLETED|CANCELLED|EXPIRED|ACTIVE|AVAILABLE|RENTED|MAINTENANCE|RESERVED|HIDDEN)\\s*\\)", "");
        sanitized = sanitized.replaceAll("(?i)\\b(trễ hạn|đã thanh toán|chưa thanh toán|đang chờ xử lý|đã duyệt|từ chối|đã hủy|đã hoàn tất|đã hết hạn|đang hiệu lực|còn trống|đã cho thuê|bảo trì|đã giữ chỗ|đang ẩn)\\s*\\(\\s*\\1\\s*\\)", "$1");
        sanitized = sanitized.replaceAll("\\s{2,}", " ").trim();

        return sanitized;
    }

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
        categories.put("Khác",
                Math.max(0, totalQueries - roomQueries - priceQueries - contractQueries - billQueries - locationQueries));
        result.put("categories", categories);

        // Cache entries + Security scan
        List<Map<String, Object>> entries = new java.util.ArrayList<>();
        List<Map<String, Object>> securityFlags = new java.util.ArrayList<>();
        
        for (AiSqlCache c : allCaches) {
            Map<String, Object> entry = new java.util.LinkedHashMap<>();
            entry.put("id", c.getId());
            entry.put("question", c.getQuestion());
            entry.put("generatedSql", c.getGeneratedSql());
            entry.put("isValid", c.isValid());
            entry.put("type", c.getType());
            entry.put("answer", c.getAnswer());
            entries.add(entry);
            
            // 🛡️ Auto-scan SQL trong cache cho các vấn đề bảo mật
            String sql = c.getGeneratedSql();
            if (sql != null && !sql.isBlank()) {
                String upperSql = sql.toUpperCase();
                List<String> issues = new java.util.ArrayList<>();
                
                // Check 1: Chỉ SELECT/WITH
                if (!upperSql.trim().startsWith("SELECT") && !upperSql.trim().startsWith("WITH")) {
                    issues.add("NON_SELECT: SQL không bắt đầu bằng SELECT/WITH");
                }
                // Check 2: DML/DDL
                if (upperSql.matches(".*\\b(INSERT|UPDATE|DELETE|DROP|ALTER|TRUNCATE|CREATE|GRANT|REVOKE)\\b.*")) {
                    issues.add("DML_DDL: Chứa lệnh nguy hiểm");
                }
                // Check 3: Sensitive columns
                String[] sensitiveColumns = {"PASSWORD", "VERIFICATION_CODE", "WALLET_ADDRESS", "BLOCKCHAIN_PRIVATE", "REFRESH_TOKEN"};
                for (String col : sensitiveColumns) {
                    if (upperSql.contains(col)) {
                        issues.add("SENSITIVE_COL: Chứa cột nhạy cảm " + col);
                        break;
                    }
                }
                // Check 4: Thiếu LIMIT
                if (!upperSql.contains("LIMIT")) {
                    issues.add("NO_LIMIT: Thiếu LIMIT (có thể dump data)");
                }
                
                if (!issues.isEmpty()) {
                    Map<String, Object> flag = new java.util.LinkedHashMap<>();
                    flag.put("id", c.getId());
                    flag.put("question", c.getQuestion());
                    flag.put("sql", sql);
                    flag.put("issues", issues);
                    securityFlags.add(flag);
                }
            }
        }
        result.put("entries", entries);
        result.put("securityFlags", securityFlags);
        result.put("flaggedCount", securityFlags.size());

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

    /**
     * Test chạy thử 1 câu SQL trong cache.
     * Dùng LIMIT 5 + timeout 1s để an toàn.
     */
    public Map<String, Object> testCacheEntry(Long id) {
        AiSqlCache cache = cacheRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Không tìm thấy ID: " + id));

        Map<String, Object> result = new java.util.LinkedHashMap<>();
        result.put("id", cache.getId());
        result.put("question", cache.getQuestion());
        result.put("type", cache.getType());

        // FAQ entries → không cần test SQL
        if ("FAQ".equalsIgnoreCase(cache.getType())) {
            result.put("status", "FAQ");
            result.put("message", "Entry FAQ — không có SQL để test");
            result.put("answer", cache.getAnswer());
            return result;
        }

        String sql = cache.getGeneratedSql();
        if (sql == null || sql.isBlank()) {
            result.put("status", "EMPTY");
            result.put("message", "SQL rỗng — cần thêm SQL hoặc xóa entry");
            return result;
        }

        // Thêm LIMIT 5 nếu chưa có để an toàn
        String testSql = sql.trim().replaceAll(";\\s*$", "");
        if (!testSql.toUpperCase().contains("LIMIT")) {
            testSql += " LIMIT 5";
        }
        // Replace placeholder user IDs with 1 (test)
        testSql = testSql.replace("USER_ID_PLACEHOLDER", "1");

        try {
            jdbcTemplate.setQueryTimeout(1);
            List<Map<String, Object>> rows = jdbcTemplate.queryForList(testSql);
            result.put("status", rows.isEmpty() ? "EMPTY_RESULT" : "OK");
            result.put("rowCount", rows.size());
            result.put("sampleData", rows.stream().limit(3).toList());
            result.put("message", rows.isEmpty() ? "SQL hợp lệ nhưng không có dữ liệu" : "✅ SQL chạy thành công, trả về " + rows.size() + " dòng");
        } catch (Exception e) {
            result.put("status", "ERROR");
            result.put("message", e.getMessage());
            result.put("rowCount", 0);
        }

        return result;
    }

    /**
     * Batch validate: Test tất cả SQL entries trong cache.
     * Tự động đánh dấu isValid=false cho các entry lỗi.
     */
    @Transactional
    public Map<String, Object> batchValidateCache() {
        List<AiSqlCache> allEntries = cacheRepository.findAll();

        int totalSql = 0, ok = 0, empty = 0, error = 0, faq = 0;
        List<Map<String, Object>> failedEntries = new java.util.ArrayList<>();

        for (AiSqlCache cache : allEntries) {
            if ("FAQ".equalsIgnoreCase(cache.getType())) {
                faq++;
                continue;
            }
            totalSql++;

            String sql = cache.getGeneratedSql();
            if (sql == null || sql.isBlank()) {
                empty++;
                failedEntries.add(Map.of(
                        "id", cache.getId(),
                        "question", cache.getQuestion(),
                        "status", "EMPTY",
                        "error", "SQL rỗng"
                ));
                cache.setValid(false);
                continue;
            }

            String testSql = sql.trim().replaceAll(";\\s*$", "");
            if (!testSql.toUpperCase().contains("LIMIT")) {
                testSql += " LIMIT 1";
            }
            testSql = testSql.replace("USER_ID_PLACEHOLDER", "1");

            try {
                jdbcTemplate.setQueryTimeout(1);
                jdbcTemplate.queryForList(testSql);
                ok++;
                if (!cache.isValid()) {
                    cache.setValid(true); // Fix entries sai trạng thái
                }
            } catch (Exception e) {
                error++;
                failedEntries.add(Map.of(
                        "id", cache.getId(),
                        "question", cache.getQuestion(),
                        "status", "ERROR",
                        "error", e.getMessage() != null ? e.getMessage().substring(0, Math.min(e.getMessage().length(), 200)) : "Unknown"
                ));
                cache.setValid(false);
            }
        }

        cacheRepository.saveAll(allEntries);

        Map<String, Object> result = new java.util.LinkedHashMap<>();
        result.put("status", "success");
        result.put("totalEntries", allEntries.size());
        result.put("faqEntries", faq);
        result.put("sqlEntries", totalSql);
        result.put("sqlOk", ok);
        result.put("sqlEmpty", empty);
        result.put("sqlError", error);
        result.put("failedEntries", failedEntries);
        result.put("message", String.format("Kiểm tra xong: %d SQL OK, %d lỗi, %d rỗng, %d FAQ", ok, error, empty, faq));
        return result;
    }

    // Load lại toàn bộ Vector Store từ DB đã được filter valid=true
    private void reloadVectorCache() {
        System.out.println("🔄 Đang load lại Vector Store sau khi có thay đổi từ Admin...");
        loadSqlFaqVectorCache(true);
    }

    @Transactional
    public void clearSqlCache() {
        System.out.println("🧹 Đang xoá bộ nhớ đệm SQL (Cache)...");
        cacheRepository.deleteAll(); // Xoá trong DB
        embeddingStore.removeAll(metadataKey("type").isEqualTo("SQL"));
        embeddingStore.removeAll(metadataKey("type").isEqualTo("FAQ"));
        System.out.println("✅ Đã xoá sạch SQL/FAQ Cache (giữ nguyên RAG documents).");
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

    private String tryExtractLocationForNearbySearch(String question, String role) {
        if (question == null || question.trim().isEmpty()) {
            return null;
        }
        // Chỉ ưu tiên heuristic cho luồng tìm phòng public
        if (!("GUEST".equalsIgnoreCase(role) || "TENANT".equalsIgnoreCase(role))) {
            return null;
        }

        String normalized = normalizeForHeuristic(question);
        if (isNearCurrentLocationQuery(question, role)) {
            return null;
        }
        if (!normalized.matches(".*\\b(gan|near|quanh)\\b.*")) {
            return null;
        }
        if (normalized.matches(
                ".*\\b(hoa don|bill|hop dong|contract|doanh thu|revenue|thanh toan|payment|lich hen|appointment|no tien)\\b.*")) {
            return null;
        }

        String locationPart = null;
        java.util.regex.Matcher nearbyMatcher = java.util.regex.Pattern
                .compile(".*\\b(?:gan|near|quanh)\\b\\s+(.+)")
                .matcher(normalized);
        if (nearbyMatcher.matches()) {
            locationPart = nearbyMatcher.group(1).trim();
        }

        if (locationPart == null || locationPart.isEmpty()) {
            return null;
        }

        if (locationPart.startsWith("dh ")) {
            locationPart = "dai hoc " + locationPart.substring(3).trim();
        }
        locationPart = locationPart.replace("dh cong nghiep", "dai hoc cong nghiep");

        // Cắt đuôi mô tả phụ để giữ tên địa điểm sạch hơn
        String[] delimiters = new String[] { " voi ", " va ", ",", ".", "?" };
        for (String delimiter : delimiters) {
            int cut = locationPart.indexOf(delimiter);
            if (cut > 0) {
                locationPart = locationPart.substring(0, cut).trim();
            }
        }

        if (isCurrentLocationCue(locationPart)) {
            return null;
        }

        if (locationPart.length() < 3) {
            return null;
        }
        return locationPart;
    }

    private Double extractRadiusKm(String question) {
        if (question == null) {
            return 3.0;
        }
        String normalized = normalizeForHeuristic(question);
        java.util.regex.Matcher m = java.util.regex.Pattern
                .compile("(\\d+(?:[\\.,]\\d+)?)\\s*km")
                .matcher(normalized);
        if (m.find()) {
            try {
                return Double.parseDouble(m.group(1).replace(",", "."));
            } catch (Exception ignored) {
                // default below
            }
        }
        if (normalized.contains("rat gan")) {
            return 1.0;
        }
        if (normalized.contains("gan day")) {
            return 3.0;
        }
        return 3.0;
    }

    private Long extractMaxPriceFromParams(Map<String, Object> params, String question) {
        if (params != null) {
            String[] keys = new String[] { "max_price", "maxPrice", "price_max", "budget_max" };
            for (String key : keys) {
                if (params.containsKey(key) && params.get(key) != null) {
                    try {
                        double raw = Double.parseDouble(params.get(key).toString());
                        if (raw > 0) {
                            // Nếu model trả "5" (hiểu là 5 triệu), tự quy đổi cho an toàn.
                            if (raw <= 1000) {
                                return Math.round(raw * 1_000_000d);
                            }
                            return Math.round(raw);
                        }
                    } catch (Exception ignored) {
                        // fallback below
                    }
                }
            }
        }
        return extractMaxPriceVnd(question);
    }

    private Long extractMaxPriceVnd(String question) {
        if (question == null || question.trim().isEmpty()) {
            return null;
        }
        String normalized = normalizeForHeuristic(question);
        return extractExplicitMaxPriceVnd(normalized);
    }

    private Long extractExplicitMaxPriceVnd(String normalized) {
        if (normalized == null || normalized.isBlank()) {
            return null;
        }

        java.util.regex.Matcher compactTrMatcher = java.util.regex.Pattern
                .compile("\\b(\\d+)\\s*tr\\s*(\\d{1,2})\\b")
                .matcher(normalized);
        if (compactTrMatcher.find()) {
            double base = Double.parseDouble(compactTrMatcher.group(1));
            String decimalDigits = compactTrMatcher.group(2);
            double decimalPart = Double.parseDouble(decimalDigits) / Math.pow(10, decimalDigits.length());
            return convertToVnd(base + decimalPart, "tr");
        }

        java.util.regex.Matcher rangeMatcher = java.util.regex.Pattern
                .compile(
                        "(?:tu|from)\\s*(\\d+(?:[\\.,]\\d+)?)\\s*(trieu|tr|cu|k|nghin)?\\s*(?:den|toi|to|-)\\s*(\\d+(?:[\\.,]\\d+)?)\\s*(trieu|tr|cu|k|nghin)?")
                .matcher(normalized);
        if (rangeMatcher.find()) {
            double upperValue = Double.parseDouble(rangeMatcher.group(3).replace(",", "."));
            String upperUnit = rangeMatcher.group(4);
            String lowerUnit = rangeMatcher.group(2);
            return convertToVnd(upperValue, upperUnit != null ? upperUnit : lowerUnit);
        }

        java.util.regex.Pattern[] explicitPatterns = new java.util.regex.Pattern[] {
                java.util.regex.Pattern.compile(
                        "(?:duoi|toi da|khong qua|nho hon|under|<=)\\s*(\\d+(?:[\\.,]\\d+)?)\\s*(trieu|tr|cu|k|nghin)?"),
                java.util.regex.Pattern.compile(
                        "(\\d+(?:[\\.,]\\d+)?)\\s*(trieu|tr|cu|k|nghin)\\s*(?:tro xuong|do lai|hoac thap hon|or less)"),
                java.util.regex.Pattern.compile(
                        "(?:tam|khoang|around|about)\\s*(\\d+(?:[\\.,]\\d+)?)\\s*(trieu|tr|cu|k|nghin)"),
                java.util.regex.Pattern.compile(
                        "\\b(\\d+(?:[\\.,]\\d+)?)\\s*(trieu|tr|cu|k|nghin)\\b")
        };

        for (java.util.regex.Pattern pattern : explicitPatterns) {
            java.util.regex.Matcher matcher = pattern.matcher(normalized);
            if (matcher.find()) {
                double value = Double.parseDouble(matcher.group(1).replace(",", "."));
                String unit = matcher.groupCount() >= 2 ? matcher.group(2) : null;
                Long parsed = convertToVnd(value, unit);
                if (parsed != null && parsed > 0) {
                    return parsed;
                }
            }
        }
        return null;
    }

    private boolean shouldUseCheapMode(String question, Long maxPrice) {
        return (maxPrice == null || maxPrice <= 0) && hasCheapCue(question);
    }

    private boolean hasCheapCue(String question) {
        if (question == null || question.isBlank()) {
            return false;
        }
        String normalized = normalizeForHeuristic(question);
        return containsAny(normalized, "gia re", "gia mem", "tiet kiem", "sinh vien")
                || normalized.matches(".*\\bre\\b.*");
    }

    private Long convertToVnd(double value, String unit) {
        if (value <= 0) {
            return null;
        }
        if (unit == null || unit.isBlank()) {
            return Math.round(value);
        }
        String u = unit.trim().toLowerCase();
        if (u.equals("trieu") || u.equals("tr") || u.equals("cu")) {
            return Math.round(value * 1_000_000d);
        }
        if (u.equals("k") || u.equals("nghin")) {
            return Math.round(value * 1_000d);
        }
        return Math.round(value);
    }

    private Integer extractRequiredOccupantsFromParams(Map<String, Object> params, String question) {
        if (params != null) {
            String[] keys = new String[] { "occupants", "required_occupants", "people", "persons", "max_occupants" };
            for (String key : keys) {
                if (params.containsKey(key) && params.get(key) != null) {
                    try {
                        int value = Integer.parseInt(params.get(key).toString());
                        if (value > 0) {
                            return value;
                        }
                    } catch (Exception ignored) {
                        // fallback below
                    }
                }
            }
        }
        return extractRequiredOccupantsFromQuestion(question);
    }

    private Integer extractRequiredOccupantsFromQuestion(String question) {
        if (question == null || question.trim().isEmpty()) {
            return null;
        }
        String normalized = normalizeForHeuristic(question);
        if (normalized.contains("1 minh") || normalized.contains("mot minh")
                || normalized.contains("o rieng 1 nguoi")) {
            return 1;
        }
        java.util.regex.Pattern[] patterns = new java.util.regex.Pattern[] {
                java.util.regex.Pattern.compile("(?:cho|o|ở|toi da|toi uu|du cho)\\s*(\\d+)\\s*(?:nguoi|ng)"),
                java.util.regex.Pattern.compile("(\\d+)\\s*(?:nguoi|ng)\\s*(?:o|ở)?")
        };
        for (java.util.regex.Pattern pattern : patterns) {
            java.util.regex.Matcher matcher = pattern.matcher(normalized);
            if (matcher.find()) {
                try {
                    int value = Integer.parseInt(matcher.group(1));
                    if (value > 0 && value <= 20) {
                        return value;
                    }
                } catch (Exception ignored) {
                    // continue
                }
            }
        }
        return null;
    }

    private boolean extractRequirePetFriendlyFromParams(Map<String, Object> params, String question) {
        if (params != null) {
            String[] keys = new String[] { "pet_friendly", "allow_pets", "petAllowed", "has_pet" };
            for (String key : keys) {
                if (params.containsKey(key) && params.get(key) != null) {
                    Object value = params.get(key);
                    if (value instanceof Boolean b) {
                        return b;
                    }
                    String text = value.toString().trim().toLowerCase();
                    if (text.equals("true") || text.equals("yes") || text.equals("1")) {
                        return true;
                    }
                    if (text.equals("false") || text.equals("no") || text.equals("0")) {
                        return false;
                    }
                }
            }
        }
        return extractRequirePetFriendly(question);
    }

    private boolean extractRequirePetFriendly(String question) {
        if (question == null || question.trim().isEmpty()) {
            return false;
        }
        String normalized = normalizeForHeuristic(question);
        // Ưu tiên nhận diện phủ định để tránh lọc sai.
        if (normalized.contains("khong nuoi thu cung")
                || normalized.contains("khong can thu cung")
                || normalized.contains("khong co thu cung")
                || normalized.contains("khong nuoi pet")) {
            return false;
        }
        return normalized.contains("nuoi thu cung")
                || normalized.contains("cho nuoi thu cung")
                || normalized.contains("pet friendly")
                || normalized.contains("cho phep thu cung")
                || normalized.contains("cho phep nuoi pet")
                || normalized.contains("nuoi cho")
                || normalized.contains("nuoi meo")
                || normalized.contains("co cho")
                || normalized.contains("co meo");
    }

    private String normalizeForHeuristic(String text) {
        if (text == null) {
            return "";
        }
        String nfd = java.text.Normalizer.normalize(text, java.text.Normalizer.Form.NFD);
        String noAccent = nfd.replaceAll("\\p{M}", "");
        String asciiFriendly = noAccent.replace('\u0111', 'd').replace('\u0110', 'D');
        return (" " + asciiFriendly.toLowerCase() + " ").replaceAll("\\s+", " ").trim();
    }

    /**
     * Chuẩn hóa một số cú pháp SQL kiểu MySQL thường gặp trong seed/cached SQL sang PostgreSQL.
     * Mục tiêu là giảm tỷ lệ query fail do khác biệt dialect.
     */
    private String normalizeSqlDialectForPostgres(String sql) {
        if (sql == null || sql.isBlank()) {
            return sql;
        }
        String normalized = sql;

        // YEAR(CURRENT_DATE), MONTH(CURRENT_DATE) -> PostgreSQL EXTRACT
        normalized = normalized.replaceAll("(?i)\\bYEAR\\s*\\(\\s*CURRENT_DATE\\s*\\)",
                "EXTRACT(YEAR FROM CURRENT_DATE)::int");
        normalized = normalized.replaceAll("(?i)\\bMONTH\\s*\\(\\s*CURRENT_DATE\\s*\\)",
                "EXTRACT(MONTH FROM CURRENT_DATE)::int");

        // YEAR/MONTH trên DATE_SUB(CURRENT_DATE, INTERVAL n MONTH)
        normalized = normalized.replaceAll(
                "(?i)\\bYEAR\\s*\\(\\s*DATE_SUB\\s*\\(\\s*CURRENT_DATE\\s*,\\s*INTERVAL\\s+(\\d+)\\s+MONTH\\s*\\)\\s*\\)",
                "EXTRACT(YEAR FROM (CURRENT_DATE - INTERVAL '$1 month'))::int");
        normalized = normalized.replaceAll(
                "(?i)\\bMONTH\\s*\\(\\s*DATE_SUB\\s*\\(\\s*CURRENT_DATE\\s*,\\s*INTERVAL\\s+(\\d+)\\s+MONTH\\s*\\)\\s*\\)",
                "EXTRACT(MONTH FROM (CURRENT_DATE - INTERVAL '$1 month'))::int");

        // DATE_SUB(CURRENT_DATE, INTERVAL n DAY/MONTH) -> CURRENT_DATE - INTERVAL 'n unit'
        normalized = normalized.replaceAll(
                "(?i)\\bDATE_SUB\\s*\\(\\s*CURRENT_DATE\\s*,\\s*INTERVAL\\s+(\\d+)\\s+DAY\\s*\\)",
                "(CURRENT_DATE - INTERVAL '$1 day')");
        normalized = normalized.replaceAll(
                "(?i)\\bDATE_SUB\\s*\\(\\s*CURRENT_DATE\\s*,\\s*INTERVAL\\s+(\\d+)\\s+MONTH\\s*\\)",
                "(CURRENT_DATE - INTERVAL '$1 month')");

        // DATE_ADD(CURRENT_DATE, INTERVAL N DAY) -> CURRENT_DATE + INTERVAL 'N day'
        normalized = normalized.replaceAll("(?i)\\bDATE_ADD\\s*\\(\\s*CURRENT_DATE\\s*,\\s*INTERVAL\\s+(\\d+)\\s+DAY\\s*\\)",
                "(CURRENT_DATE + INTERVAL '$1 day')");

        // YEAR(expr), MONTH(expr) với expr đơn giản (không lồng hàm) -> EXTRACT
        normalized = normalized.replaceAll("(?i)\\bYEAR\\s*\\(\\s*([^\\(\\)]+?)\\s*\\)",
                "EXTRACT(YEAR FROM $1)::int");
        normalized = normalized.replaceAll("(?i)\\bMONTH\\s*\\(\\s*([^\\(\\)]+?)\\s*\\)",
                "EXTRACT(MONTH FROM $1)::int");

        // DATEDIFF(date_expr, CURRENT_DATE) -> (date_expr::date - CURRENT_DATE)
        normalized = normalized.replaceAll("(?i)\\bDATEDIFF\\s*\\(\\s*([^,]+?)\\s*,\\s*CURRENT_DATE\\s*\\)",
                "($1::date - CURRENT_DATE)");
        // DATEDIFF(date_expr_1, date_expr_2) -> (date_expr_1::date - date_expr_2::date)
        normalized = normalized.replaceAll("(?i)\\bDATEDIFF\\s*\\(\\s*([^,\\)]+?)\\s*,\\s*([^\\)]+?)\\s*\\)",
                "($1::date - $2::date)");

        return normalized;
    }

    /**
     * Chặn semantic cache hit sai ngữ cảnh: câu hỏi "tổng còn phải trả" nhưng SQL lại là
     * "lịch sử đã thanh toán", hoặc câu hỏi "hợp đồng" lại match SQL hóa đơn,...
     */
    private boolean isLikelySemanticSqlMatch(String question, String sql, String role) {
        if (question == null || question.isBlank() || sql == null || sql.isBlank()) {
            return false;
        }

        String normalizedQuestion = normalizeForHeuristic(question);
        String upperSql = sql.toUpperCase(Locale.ROOT);

        // Nhóm hỏi nợ/cần thanh toán -> phải bám UNPAID/LATE hoặc tổng nợ.
        if (containsAny(normalizedQuestion, "con no", "dang no", "can thanh toan", "chua tra", "tong no", "thieu tien")) {
            boolean looksDebtSql = upperSql.contains("UNPAID") || upperSql.contains("LATE") || upperSql.contains("TONG_NO");
            if (!looksDebtSql) {
                return false;
            }
        }

        // Nhóm hỏi đã thanh toán/lịch sử thanh toán -> phải bám PAID.
        if (containsAny(normalizedQuestion, "da thanh toan", "lich su thanh toan", "da tra")) {
            if (!upperSql.contains("PAID")) {
                return false;
            }
        }

        // Nhóm hỏi hợp đồng -> SQL phải động tới contracts.
        if (containsAny(normalizedQuestion, "hop dong")) {
            if (!upperSql.contains("CONTRACT")) {
                return false;
            }
        }

        // Nhóm hỏi lịch hẹn -> SQL phải động tới appointments.
        if (containsAny(normalizedQuestion, "lich hen", "xem phong")) {
            if (!upperSql.contains("APPOINTMENT")) {
                return false;
            }
        }

        // Nhóm hỏi doanh thu (landlord) -> cần SUM + PAID.
        if (containsAny(normalizedQuestion, "doanh thu", "tong thu", "thu nhap")) {
            if (!(upperSql.contains("SUM(") && upperSql.contains("PAID"))) {
                return false;
            }
        }

        // Nhóm hỏi phòng trống/tìm phòng -> SQL nên bám rooms/properties.
        if (containsAny(normalizedQuestion, "tim phong", "phong trong", "khu tro", "quan ")) {
            boolean looksRoomSql = upperSql.contains("FROM ROOMS") || (upperSql.contains("JOIN ROOMS") && upperSql.contains("PROPERTIES"));
            if (!looksRoomSql) {
                return false;
            }
        }

        // Tenant không nên match SQL doanh thu nội bộ chung.
        if ("TENANT".equalsIgnoreCase(role) && containsAny(normalizedQuestion, "doanh thu", "tong thu")) {
            return upperSql.contains("TENANT_ID");
        }

        return true;
    }

    private boolean isPolicyStyleQuestion(String question) {
        if (question == null || question.isBlank()) {
            return false;
        }
        String q = normalizeForHeuristic(question);
        return containsAny(q,
                "la gi",
                "nhu the nao",
                "ra sao",
                "quy dinh",
                "chinh sach",
                "co che");
    }

    private boolean hasPersonalDataCue(String question) {
        if (question == null || question.isBlank()) {
            return false;
        }
        String q = normalizeForHeuristic(question);
        return containsAny(q,
                "cua toi",
                "toi con",
                "hien tai",
                "thang nay",
                "thang ",
                "hop dong cua toi",
                "hoa don cua toi");
    }

    private boolean containsAny(String text, String... tokens) {
        if (text == null || text.isBlank() || tokens == null) {
            return false;
        }
        for (String token : tokens) {
            if (token != null && !token.isBlank() && text.contains(token)) {
                return true;
            }
        }
        return false;
    }

    private boolean hasValidCoordinates(Double latitude, Double longitude) {
        if (latitude == null || longitude == null) {
            return false;
        }
        if (latitude.isNaN() || longitude.isNaN() || latitude.isInfinite() || longitude.isInfinite()) {
            return false;
        }
        return latitude >= -90 && latitude <= 90 && longitude >= -180 && longitude <= 180;
    }

    private boolean isNearCurrentLocationQuery(String question, String role) {
        if (question == null || question.isBlank()) {
            return false;
        }
        if (!("GUEST".equalsIgnoreCase(role) || "TENANT".equalsIgnoreCase(role))) {
            return false;
        }

        String normalized = normalizeForHeuristic(question);
        boolean hasCurrentLocationCue = containsAny(normalized,
                "gan day",
                "quanh day",
                "xung quanh day",
                "gan toi",
                "o gan toi",
                "quanh toi",
                "xung quanh toi",
                "gan vi tri hien tai",
                "near me",
                "around me",
                "nearby",
                "vi tri cua toi",
                "vi tri hien tai");
        if (!hasCurrentLocationCue) {
            return false;
        }

        boolean hasRoomIntent = containsAny(normalized,
                "phong",
                "room",
                "khu tro",
                "nha tro",
                "tim phong",
                "phong trong",
                "can ho");
        if (!hasRoomIntent) {
            return false;
        }

        return !containsAny(normalized,
                "hoa don",
                "bill",
                "hop dong",
                "contract",
                "doanh thu",
                "thanh toan",
                "lich hen",
                "appointment");
    }

    private boolean isCurrentLocationCue(String locationText) {
        if (locationText == null || locationText.isBlank()) {
            return true;
        }
        String normalized = normalizeForHeuristic(locationText);
        return containsAny(normalized,
                "day",
                "o day",
                "tai day",
                "gan day",
                "quanh day",
                "xung quanh day",
                "gan toi",
                "o gan toi",
                "quanh toi",
                "xung quanh toi",
                "gan vi tri hien tai",
                "near me",
                "around me",
                "nearby",
                "vi tri cua toi",
                "vi tri hien tai",
                "hien tai");
    }

    private String buildUserLocationRequiredMessage() {
        return "Dạ, để tìm phòng 'gần đây' chính xác, bạn vui lòng bật quyền vị trí trên trình duyệt rồi thử lại nhé. "
                + "Hoac ban co the nhap moc cu the, vi du: 'gan Dai hoc Cong nghiep'.";
    }

    private String handleLocationSearchFlow(String locationName,
            Double radius,
            Long maxPrice,
            boolean cheapMode,
            Integer requiredOccupants,
            boolean requirePetFriendly,
            String question,
            String role,
            Long userId,
            String predictedIntent,
            Double confidence,
            long startTime,
            boolean fallbackOnGeoMiss) {
        Double safeRadius = (radius == null || radius <= 0) ? 3.0 : radius;
        System.out.println(
                "📍 [LOCATION FLOW] location='" + locationName + "', radius=" + safeRadius + "km, maxPrice=" + maxPrice
                        + ", cheapMode=" + cheapMode + ", requiredOccupants=" + requiredOccupants
                        + ", requirePetFriendly=" + requirePetFriendly);

        if (locationName == null || locationName.trim().isEmpty()) {
            saveActionLog(userId, role, question, predictedIntent, confidence, false, startTime, true, "LOCATION_LANDMARK", null, null, null, "NONE");
            return "Dạ, bạn có thể cho mình biết tên địa điểm cụ thể bạn muốn tìm phòng gần đó không ạ?";
        }

        GeocodingService.GeoResult geoResult = geocodingService.geocode(locationName);
        if (geoResult == null) {
            if (fallbackOnGeoMiss) {
                return null;
            }
            System.out.println("❌ [LOCATION FLOW] Geo miss -> '" + locationName + "'");
            List<String> topSuggestions = geocodingService.getSmartSuggestions(locationName, 3);
            StringBuilder sb = new StringBuilder("Dạ, mình không tìm thấy địa điểm '" + locationName + "'.\n");
            if (!topSuggestions.isEmpty()) {
                sb.append("Bạn có muốn tìm phòng gần các địa điểm sau không?\n");
                for (String sugg : topSuggestions) {
                    sb.append("- ").append(sugg).append("\n");
                }
            }
            saveActionLog(userId, role, question, predictedIntent, confidence, false, startTime, true, "LOCATION_LANDMARK", null, null, null, "LANDMARK");
            return sb.toString();
        }

        List<Map<String, Object>> results = propertyRepository.findNearbyRoomsAdvanced(
                geoResult.latitude,
                geoResult.longitude,
                safeRadius,
                (maxPrice != null && maxPrice > 0) ? maxPrice : Long.MAX_VALUE,
                (requiredOccupants != null && requiredOccupants > 0) ? requiredOccupants : 0,
                requirePetFriendly);
        results = maybeApplyCheapNearbyRanking(results, cheapMode, maxPrice, "LANDMARK");
        if (results.isEmpty()) {
            if (requirePetFriendly) {
                List<Map<String, Object>> relaxedResults = propertyRepository.findNearbyRoomsAdvanced(
                        geoResult.latitude,
                        geoResult.longitude,
                        safeRadius,
                        (maxPrice != null && maxPrice > 0) ? maxPrice : Long.MAX_VALUE,
                        (requiredOccupants != null && requiredOccupants > 0) ? requiredOccupants : 0,
                        false);
                if (!relaxedResults.isEmpty()) {
                    saveActionLog(userId, role, question, predictedIntent, confidence, false, startTime, true, "LOCATION_LANDMARK", null, 0, null, "LANDMARK");
                    return "Hiện tại chưa có phòng trống cho nuôi thú cưng trong bán kính " + safeRadius.intValue()
                            + "km quanh '" + geoResult.displayName + "'. Tuy nhiên, mình có tìm thấy "
                            + relaxedResults.size()
                            + " phòng nếu bỏ điều kiện thú cưng. Bạn muốn mình hiển thị các phòng đó không?";
                }
            }
            saveActionLog(userId, role, question, predictedIntent, confidence, false, startTime, true, "LOCATION_LANDMARK", null, 0, null, "LANDMARK");
            return "Hiện tại không tìm thấy phòng trống nào trong bán kính " + safeRadius.intValue() + "km quanh '"
                    + geoResult.displayName + "'.";
        }

        StringBuilder responseStr = new StringBuilder();
        if (cheapMode) {
            responseStr.append("Minh dang hieu 'gia re' la nhom phong co gia thap trong khu vuc ban tim. ")
                    .append("Ban co the nhap ngan sach cu the nhu 'duoi 3 trieu' de loc chinh xac hon.\n\n");
        }
        responseStr.append("Dạ, mình tìm được ").append(results.size())
                .append(" phòng trống gần '").append(geoResult.displayName)
                .append("' (trong bán kính ").append(safeRadius.intValue()).append("km):\n\n");

        int limit = Math.min(results.size(), 5);
        for (int i = 0; i < limit; i++) {
            Map<String, Object> row = results.get(i);
            Object roomId = row.get("room_id");
            Object nameObj = row.get("name");
            String name = nameObj != null ? nameObj.toString() : "";
            if (name.length() > 35) {
                name = name.substring(0, 32) + "...";
            }

            String priceStr = normalizePriceForCard(row.get("price"));
            String distanceStr = normalizeDistanceForCard(row.get("distance_km"));
            String firstImg = extractFirstImage(row.get("images"));

            responseStr.append(String.format("[ROOM_CARD: %s | %s | %s | %s | cách %skm]\n",
                    roomId, name, priceStr, firstImg, distanceStr));
        }

        saveActionLog(userId, role, question, predictedIntent, confidence, false, startTime, true, "LOCATION_LANDMARK", null, results.size(), null, "LANDMARK");
        return responseStr.toString();
    }

    private String handleLocationSearchByCoordinatesFlow(Double latitude,
            Double longitude,
            Double radius,
            Long maxPrice,
            boolean cheapMode,
            Integer requiredOccupants,
            boolean requirePetFriendly,
            String question,
            String role,
            Long userId,
            String predictedIntent,
            Double confidence,
            long startTime) {
        if (!hasValidCoordinates(latitude, longitude)) {
            return null;
        }

        Double safeRadius = (radius == null || radius <= 0) ? 3.0 : radius;
        System.out.println(
                "[LOCATION FLOW] using current user coordinates, radius=" + safeRadius + "km, maxPrice=" + maxPrice
                        + ", cheapMode=" + cheapMode + ", requiredOccupants=" + requiredOccupants
                        + ", requirePetFriendly=" + requirePetFriendly);

        List<Map<String, Object>> results = propertyRepository.findNearbyRoomsAdvanced(
                latitude,
                longitude,
                safeRadius,
                (maxPrice != null && maxPrice > 0) ? maxPrice : Long.MAX_VALUE,
                (requiredOccupants != null && requiredOccupants > 0) ? requiredOccupants : 0,
                requirePetFriendly);
        results = maybeApplyCheapNearbyRanking(results, cheapMode, maxPrice, "GPS");

        if (results.isEmpty()) {
            if (requirePetFriendly) {
                List<Map<String, Object>> relaxedResults = propertyRepository.findNearbyRoomsAdvanced(
                        latitude,
                        longitude,
                        safeRadius,
                        (maxPrice != null && maxPrice > 0) ? maxPrice : Long.MAX_VALUE,
                        (requiredOccupants != null && requiredOccupants > 0) ? requiredOccupants : 0,
                        false);
                if (!relaxedResults.isEmpty()) {
                    saveActionLog(userId, role, question, predictedIntent, confidence, false, startTime, true, "LOCATION_GPS", null, 0, null, "GPS");
                    return "Hien tai chua co phong trong cho nuoi thu cung trong ban kinh " + safeRadius.intValue()
                            + "km gan vi tri hien tai cua ban. Tuy nhien, minh co tim thay "
                            + relaxedResults.size()
                            + " phong neu bo dieu kien thu cung. Ban co muon xem cac phong do khong?";
                }
            }
            saveActionLog(userId, role, question, predictedIntent, confidence, false, startTime, true, "LOCATION_GPS", null, 0, null, "GPS");
            return "Hiện tại không tìm thấy phòng trống nào trong bán kính " + safeRadius.intValue()
                    + "km gan vi tri hien tai cua ban.";
        }

        StringBuilder responseStr = new StringBuilder();
        if (cheapMode) {
            responseStr.append("Minh dang hieu 'gia re' la nhom phong co gia thap trong khu vuc gan ban. ")
                    .append("Ban co the nhap ngan sach cu the nhu 'duoi 3 trieu' de loc chinh xac hon.\n\n");
        }
        responseStr.append("Da, minh tim duoc ").append(results.size())
                .append(" phòng trống gần vị trí hiện tại của bạn (trong bán kính ")
                .append(safeRadius.intValue()).append("km):\n\n");

        int limit = Math.min(results.size(), 5);
        for (int i = 0; i < limit; i++) {
            Map<String, Object> row = results.get(i);
            Object roomId = row.get("room_id");
            Object nameObj = row.get("name");
            String name = nameObj != null ? nameObj.toString() : "";
            if (name.length() > 35) {
                name = name.substring(0, 32) + "...";
            }

            String priceStr = normalizePriceForCard(row.get("price"));
            String distanceStr = normalizeDistanceForCard(row.get("distance_km"));
            String firstImg = extractFirstImage(row.get("images"));

            responseStr.append(String.format("[ROOM_CARD: %s | %s | %s | %s | cach %skm]\n",
                    roomId, name, priceStr, firstImg, distanceStr));
        }

        saveActionLog(userId, role, question, predictedIntent, confidence, false, startTime, true, "LOCATION_GPS", null, results.size(), null, "GPS");
        return responseStr.toString();
    }

    private List<Map<String, Object>> maybeApplyCheapNearbyRanking(
            List<Map<String, Object>> results,
            boolean cheapMode,
            Long explicitMaxPrice,
            String locationScope) {
        if (!cheapMode || results == null || results.size() <= 1) {
            return results;
        }

        AiRuntimeProperties.Search searchConfig = aiRuntimeProperties != null ? aiRuntimeProperties.getSearch() : null;
        double configuredPriceWeight = searchConfig != null ? searchConfig.getCheapPriceWeight() : 0.60;
        double configuredDistanceWeight = searchConfig != null ? searchConfig.getCheapDistanceWeight() : 0.40;
        double configuredPercentile = searchConfig != null ? searchConfig.getCheapPercentile() : 30.0;
        int configuredMinSamples = searchConfig != null ? searchConfig.getCheapMinSamples() : 5;
        double configuredPercentileBoost = searchConfig != null ? searchConfig.getCheapPercentileBoost() : 0.10;

        double priceWeight = sanitizeWeight(configuredPriceWeight, 0.60);
        double distanceWeight = sanitizeWeight(configuredDistanceWeight, 0.40);
        double weightTotal = priceWeight + distanceWeight;
        if (weightTotal <= 0) {
            priceWeight = 0.60;
            distanceWeight = 0.40;
        } else {
            priceWeight = priceWeight / weightTotal;
            distanceWeight = distanceWeight / weightTotal;
        }
        double cheapPercentile = Math.max(0d, Math.min(100d, configuredPercentile));
        int cheapMinSamples = configuredMinSamples > 1 ? configuredMinSamples : 5;
        double percentileBoost = sanitizeWeight(configuredPercentileBoost, 0.10);

        List<Map<String, Object>> ranked = new ArrayList<>(results);
        List<Double> prices = new ArrayList<>();
        List<Double> distances = new ArrayList<>();
        for (Map<String, Object> row : ranked) {
            double price = parseNumericValue(row.get("price"), Double.NaN);
            double distance = parseNumericValue(row.get("distance_km"), Double.NaN);
            if (!Double.isNaN(price)) {
                prices.add(price);
            }
            if (!Double.isNaN(distance)) {
                distances.add(distance);
            }
        }

        if (prices.isEmpty() || distances.isEmpty()) {
            return ranked;
        }

        double minPrice = prices.stream().min(Double::compareTo).orElse(0d);
        double maxPrice = prices.stream().max(Double::compareTo).orElse(minPrice);
        double minDistance = distances.stream().min(Double::compareTo).orElse(0d);
        double maxDistance = distances.stream().max(Double::compareTo).orElse(minDistance);
        Double cheapThreshold = ranked.size() >= cheapMinSamples ? calculatePercentile(prices, cheapPercentile) : null;
        final double effectivePriceWeight = priceWeight;
        final double effectiveDistanceWeight = distanceWeight;
        final double effectivePercentileBoost = percentileBoost;
        System.out.println("[CHEAP MODE] scope=" + locationScope
                + ", hardMaxPrice=" + (explicitMaxPrice != null ? explicitMaxPrice : "NONE")
                + ", sampleSize=" + ranked.size()
                + ", percentile=" + cheapPercentile
                + ", threshold=" + (cheapThreshold == null ? "N/A" : Math.round(cheapThreshold))
                + ", weights(price=" + roundDouble(effectivePriceWeight) + ",distance=" + roundDouble(effectiveDistanceWeight) + ")"
                + ", minSamples=" + cheapMinSamples);

        ranked.sort((left, right) -> {
            double rightScore = calculateCheapNearbyScore(
                    right,
                    minPrice,
                    maxPrice,
                    minDistance,
                    maxDistance,
                    cheapThreshold,
                    effectivePriceWeight,
                    effectiveDistanceWeight,
                    effectivePercentileBoost);
            double leftScore = calculateCheapNearbyScore(
                    left,
                    minPrice,
                    maxPrice,
                    minDistance,
                    maxDistance,
                    cheapThreshold,
                    effectivePriceWeight,
                    effectiveDistanceWeight,
                    effectivePercentileBoost);
            int scoreCompare = Double.compare(rightScore, leftScore);
            if (scoreCompare != 0) {
                return scoreCompare;
            }
            double leftDistance = parseNumericValue(left.get("distance_km"), Double.MAX_VALUE);
            double rightDistance = parseNumericValue(right.get("distance_km"), Double.MAX_VALUE);
            int distanceCompare = Double.compare(leftDistance, rightDistance);
            if (distanceCompare != 0) {
                return distanceCompare;
            }
            double leftPrice = parseNumericValue(left.get("price"), Double.MAX_VALUE);
            double rightPrice = parseNumericValue(right.get("price"), Double.MAX_VALUE);
            return Double.compare(leftPrice, rightPrice);
        });

        return ranked;
    }

    private double calculateCheapNearbyScore(
            Map<String, Object> room,
            double minPrice,
            double maxPrice,
            double minDistance,
            double maxDistance,
            Double cheapThreshold,
            double priceWeight,
            double distanceWeight,
            double percentileBoost) {
        double price = parseNumericValue(room.get("price"), maxPrice);
        double distance = parseNumericValue(room.get("distance_km"), maxDistance);
        double priceScore = inverseNormalize(price, minPrice, maxPrice);
        double distanceScore = inverseNormalize(distance, minDistance, maxDistance);
        double finalScore = (priceWeight * priceScore) + (distanceWeight * distanceScore);
        if (cheapThreshold != null && price <= cheapThreshold) {
            finalScore += percentileBoost;
        }
        return finalScore;
    }

    private double sanitizeWeight(double value, double fallback) {
        if (Double.isNaN(value) || Double.isInfinite(value) || value < 0) {
            return fallback;
        }
        return value;
    }

    private String roundDouble(double value) {
        return java.math.BigDecimal.valueOf(value)
                .setScale(2, java.math.RoundingMode.HALF_UP)
                .stripTrailingZeros()
                .toPlainString();
    }

    private double inverseNormalize(double value, double min, double max) {
        if (Double.isNaN(value) || Double.isInfinite(value)) {
            return 0.0;
        }
        if (max <= min) {
            return 1.0;
        }
        double normalized = (value - min) / (max - min);
        normalized = Math.max(0.0, Math.min(1.0, normalized));
        return 1.0 - normalized;
    }

    private double parseNumericValue(Object rawValue, double defaultValue) {
        if (rawValue == null) {
            return defaultValue;
        }
        if (rawValue instanceof Number number) {
            double value = number.doubleValue();
            return (Double.isNaN(value) || Double.isInfinite(value)) ? defaultValue : value;
        }
        String normalized = rawValue.toString().trim();
        if (normalized.isEmpty()) {
            return defaultValue;
        }
        normalized = normalized.replace(",", ".");
        try {
            return Double.parseDouble(normalized);
        } catch (Exception ignored) {
            return defaultValue;
        }
    }

    private double calculatePercentile(List<Double> values, double percentile) {
        if (values == null || values.isEmpty()) {
            return 0d;
        }
        List<Double> sorted = new ArrayList<>(values);
        sorted.sort(Double::compareTo);
        if (sorted.size() == 1) {
            return sorted.get(0);
        }
        double safePercentile = Math.max(0d, Math.min(100d, percentile));
        double index = (safePercentile / 100d) * (sorted.size() - 1);
        int lowerIndex = (int) Math.floor(index);
        int upperIndex = (int) Math.ceil(index);
        if (lowerIndex == upperIndex) {
            return sorted.get(lowerIndex);
        }
        double lowerValue = sorted.get(lowerIndex);
        double upperValue = sorted.get(upperIndex);
        double weight = index - lowerIndex;
        return lowerValue + (upperValue - lowerValue) * weight;
    }

    private String extractFirstImage(Object imagesObj) {
        if (imagesObj == null)
            return "";
        String imagesStr = imagesObj.toString();
        if (imagesStr.isEmpty() || imagesStr.equals("[]"))
            return "";

        // Regex đơn giản để lấy nội dung trong dấu ngoặc kép đầu tiên của JSON Array
        // ["url",...]
        java.util.regex.Pattern pattern = java.util.regex.Pattern.compile("\"([^\"]+)\"");
        java.util.regex.Matcher matcher = pattern.matcher(imagesStr);
        if (matcher.find()) {
            return matcher.group(1);
        }
        return "";
    }

    private String normalizePriceForCard(Object priceObj) {
        if (priceObj == null) {
            return "0";
        }
        if (priceObj instanceof Number number) {
            return String.valueOf(number.longValue());
        }

        String raw = priceObj.toString();
        if (raw == null) {
            return "0";
        }
        String trimmed = raw.trim();
        if (trimmed.isEmpty()) {
            return "0";
        }

        String normalized = trimmed
                .replace("đ", "")
                .replace("Đ", "")
                .replace("vnđ", "")
                .replace("VND", "")
                .replace(" ", "");

        try {
            if (normalized.matches("^\\d+(\\.0+)?$")) {
                return String.valueOf((long) Double.parseDouble(normalized));
            }

            String digitsOnly = normalized.replaceAll("[^0-9]", "");
            if (!digitsOnly.isEmpty()) {
                return String.valueOf(Long.parseLong(digitsOnly));
            }
        } catch (Exception ignored) {
            // fall through
        }

        return "0";
    }

    private String normalizeDistanceForCard(Object distanceObj) {
        if (distanceObj == null) {
            return "?";
        }
        if (distanceObj instanceof Number number) {
            double value = number.doubleValue();
            if (Double.isNaN(value) || Double.isInfinite(value)) {
                return "?";
            }
            return java.math.BigDecimal.valueOf(value)
                    .setScale(1, java.math.RoundingMode.HALF_UP)
                    .stripTrailingZeros()
                    .toPlainString();
        }

        String raw = distanceObj.toString();
        if (raw == null || raw.trim().isEmpty()) {
            return "?";
        }
        try {
            return new java.math.BigDecimal(raw.trim())
                    .setScale(1, java.math.RoundingMode.HALF_UP)
                    .stripTrailingZeros()
                    .toPlainString();
        } catch (Exception ignored) {
            return raw.trim();
        }
    }

    /**
     * Sinh Cache Key xác định (deterministic) từ Intent + Params + UserId + Role +
     * Question fingerprint.
     * Dùng TreeMap để đảm bảo thứ tự params luôn nhất quán bất kể thứ tự nhập.
     * Dùng câu hỏi đã normalize để tránh đụng key khi intent/params giống nhau nhưng
     * ý định truy vấn khác.
     */
    private String buildCacheKey(String intent, Map<String, Object> params, Long userId, String role, String question) {
        Map<String, Object> sortedParams = params != null ? new TreeMap<>(params) : new TreeMap<>();
        String normalizedQuestion = normalizeText(question).replaceAll("\\s+", " ").trim();
        return "AI_CACHE::" + intent + "::" + role + "::" + userId + "::" + sortedParams + "::Q="
                + Integer.toHexString(normalizedQuestion.hashCode());
    }

    /**
     * Ghi bản ghi Observability vào DB (chạy async để không block response).
     */
    /**
     * Backward-compatible overload (giữ nguyên cho các callsite chưa cập nhật).
     */
    private void saveActionLog(Long userId, String role, String rawQuery,
            String predictedIntent, Double confidenceScore,
            boolean fallbackUsed, long startTime, boolean isSuccess) {
        saveActionLog(userId, role, rawQuery, predictedIntent, confidenceScore,
                fallbackUsed, startTime, isSuccess, null, null, null, null, null);
    }

    /**
     * 🛡️ Enhanced: Ghi bản ghi Observability với đầy đủ metadata.
     */
    private void saveActionLog(Long userId, String role, String rawQuery,
            String predictedIntent, Double confidenceScore,
            boolean fallbackUsed, long startTime, boolean isSuccess,
            String responseSource, String generatedSql, Integer resultRowCount,
            Double cacheScore, String locationSource) {
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
                    .responseSource(responseSource)
                    .generatedSql(generatedSql)
                    .resultRowCount(resultRowCount)
                    .cacheScore(cacheScore)
                    .locationSource(locationSource)
                    .build();
            actionLogRepository.save(log);
        } catch (Exception e) {
            // Log Observability không bao giờ được phép làm sập luồng chính
            System.err.println("⚠️ [OBSERVABILITY] Lỗi ghi AiActionLog: " + e.getMessage());
        }
    }
}

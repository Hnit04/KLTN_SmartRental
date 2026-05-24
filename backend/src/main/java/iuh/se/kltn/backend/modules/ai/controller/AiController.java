package iuh.se.kltn.backend.modules.ai.controller;

import iuh.se.kltn.backend.modules.ai.dto.request.*;
import iuh.se.kltn.backend.modules.ai.service.AiOrchestratorService;
import iuh.se.kltn.backend.modules.ai.service.AiContextValidator;
import iuh.se.kltn.backend.modules.ai.service.SmartRentalAi;
import iuh.se.kltn.backend.modules.ai.service.RagKnowledgeService;
import dev.langchain4j.model.chat.ChatLanguageModel;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotEmpty;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.ResponseEntity;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.*;

import java.util.Map;
import iuh.se.kltn.backend.common.security.UserPrincipal;
import org.springframework.security.core.annotation.AuthenticationPrincipal;

import iuh.se.kltn.backend.modules.ai.service.DraftReminderAi;
import iuh.se.kltn.backend.modules.contract.repository.BillRepository;
import iuh.se.kltn.backend.modules.contract.entity.Bill;
import iuh.se.kltn.backend.modules.contract.enums.BillStatus;
import iuh.se.kltn.backend.modules.interaction.service.NotificationService;
import iuh.se.kltn.backend.modules.interaction.enums.NotificationType;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.util.List;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.Arrays;
import java.util.Comparator;
import java.util.Objects;
import java.util.stream.Collectors;
import java.time.LocalDateTime;
import java.time.temporal.ChronoUnit;
import iuh.se.kltn.backend.modules.ai.service.AnomalyAi;

@RestController
@RequestMapping("/api/ai")
@Validated
public class AiController {

    @Autowired
    private SmartRentalAi smartRentalAi;

    @Autowired
    private AiOrchestratorService aiOrchestratorService;

    @Autowired
    private ChatLanguageModel geminiChatModel;

    @Autowired
    private DraftReminderAi draftReminderAi;

    @Autowired
    private AnomalyAi anomalyAi;

    @Autowired
    private BillRepository billRepository;

    @Autowired
    private NotificationService notificationService;

    @Autowired
    private iuh.se.kltn.backend.modules.user.repository.UserRepository userRepository;

    @Autowired
    private iuh.se.kltn.backend.modules.ai.repository.AiActionLogRepository aiActionLogRepository;

    @Autowired
    private ObjectMapper objectMapper;

    @Autowired
    private RagKnowledgeService ragKnowledgeService;

    @Autowired
    private iuh.se.kltn.backend.modules.subscription.service.VipSubscriptionService vipSubscriptionService;

    @Value("${ai.llm.mode:FULL}")
    private String aiLlmMode;


    @Autowired
    private AiContextValidator aiContextValidator;

    @PostMapping("/chat")
    public ResponseEntity<?> chatWithAi(
            @Valid @RequestBody AiChatRequest request,
            @AuthenticationPrincipal UserPrincipal currentUser
    ) {
        String message = request.getMessage();
        String sessionId = request.getSessionId() != null ? request.getSessionId() : "default-user";
        
        String roleStr = "GUEST (Khách vãng lai chưa đăng nhập)";
        String userName = "Khách hàng";
        Long userId = -1L;
        
        if (currentUser != null) {
            String roleRaw = currentUser.getAuthorities().iterator().next().getAuthority();
            roleStr = roleRaw.replace("ROLE_", ""); // TENANT hoặc LANDLORD hoặc ADMIN
            userName = currentUser.getUsername(); // Hoặc fullname
            userId = currentUser.getId();
        }

        AiPageContext validatedContext = aiContextValidator.validateAndResolve(request.getPageContext(), roleStr, userId);

        // B1: Thử tìm trong kho tri thức tĩnh (FAQ Cache) trước
        // NHƯNG: Bỏ qua FAQ cho câu hỏi phân tích phòng (dài, chứa dữ liệu phòng cụ thể)
        // vì FAQ vector search dễ bị false-positive với câu hỏi dài/phức tạp.
        String lowerMessage = message.toLowerCase();
        
        // Nhận diện ý định phân tích/đánh giá chung
        boolean hasAnalysisIntent = lowerMessage.contains("phân tích") || lowerMessage.contains("ưu điểm") 
                || lowerMessage.contains("nhược điểm") || lowerMessage.contains("đánh giá") 
                || lowerMessage.contains("lời khuyên") || lowerMessage.contains("tư vấn")
                || lowerMessage.contains("chi tiết phòng");
                
        // Kiểm tra xem người dùng có đang ở trang chi tiết phòng không
        boolean isOnRoomPage = validatedContext != null && "ROOM".equals(validatedContext.getEntityType());
        
        // Nếu đang ở trang phòng VÀ có ý định phân tích -> Chắc chắn là phân tích phòng
        boolean isRoomAnalysis = hasAnalysisIntent && (isOnRoomPage || lowerMessage.contains("diện tích") 
                || lowerMessage.contains("giá thuê") || lowerMessage.contains("tiện nghi") 
                || lowerMessage.contains("m²") || lowerMessage.contains("khu trọ") 
                || lowerMessage.contains("giá dịch vụ") || lowerMessage.contains("khoảng giá") 
                || lowerMessage.contains("tổng số phòng") || lowerMessage.contains("phòng này") 
                || lowerMessage.contains("phòng trọ này") || lowerMessage.contains("căn phòng này"));
        
        if (!isRoomAnalysis) {
            String faqAnswer = aiOrchestratorService.searchFaq(message);
            if (faqAnswer != null) {
                String safeFaqAnswer = aiOrchestratorService.sanitizeForUserFacing(faqAnswer);
                return ResponseEntity.ok(Map.of(
                        "status", "success",
                        "sessionId", sessionId,
                        "reply", safeFaqAnswer,
                        "source", "FAQ_CACHE"
                ));
            }
        } else {
            System.out.println("🏠 [ROUTER] Phát hiện yêu cầu phân tích phòng trọ → Chuyển hướng sang truy vấn dữ liệu động.");
            try {
                Object result = aiOrchestratorService.processDataQuery(
                        message,
                        roleStr,
                        userId,
                        null,
                        null,
                        validatedContext
                );
                if (result instanceof String textResult) {
                    String safeResponse = aiOrchestratorService.sanitizeForUserFacing(textResult);
                    return ResponseEntity.ok(Map.of(
                            "status", "success",
                            "sessionId", sessionId,
                            "reply", safeResponse,
                            "source", "SYSTEM_DB"
                    ));
                }
            } catch (Exception e) {
                System.err.println("❌ [AI DATA ERROR] Lỗi khi xử lý phân tích phòng: " + e.getMessage());
            }
        }

        if (!"FULL".equals(resolveLlmMode())) {
            return ResponseEntity.ok(Map.of(
                    "status", "success",
                    "sessionId", sessionId,
                    "reply", "Da, che do chat AI dang tam tat theo cau hinh hien tai. Ban vui long dung tra cuu du lieu hoac FAQ.",
                    "source", "LLM_DISABLED_MODE"
            ));
        }

        String contextStr = "";
        if (validatedContext != null) {
            contextStr = String.format("Loại trang: %s, Loại đối tượng: %s, ID: %d", 
                validatedContext.getPageType(), validatedContext.getEntityType(), validatedContext.getEntityId());
        }

        // B2: Nếu không thấy, gọi mô hình LLM
        try {
            String response = smartRentalAi.chat(sessionId, roleStr, userName, message, contextStr);
            String safeResponse = aiOrchestratorService.sanitizeForUserFacing(response);
            
            return ResponseEntity.ok(Map.of(
                    "status", "success",
                    "sessionId", sessionId,
                    "reply", safeResponse,
                    "source", "GEMINI_AI"
            ));
        } catch (Throwable t) {
            System.err.println("❌ [AI ERROR] Dịch vụ Gemini đang quá tải hoặc lỗi: " + t.getMessage());
            return ResponseEntity.ok(Map.of(
                    "status", "error",
                    "sessionId", sessionId,
                    "reply", "Dịch vụ AI hiện đang quá tải (Spikes in demand). Vui lòng thử lại sau giây lát. 😅",
                    "source", "ERROR_FALLBACK"
            ));
        }
    }


    @PostMapping("/query-data")
    public ResponseEntity<?> queryDataWithAi(
            @Valid @RequestBody AiDataQueryRequest request,
            @AuthenticationPrincipal UserPrincipal currentUser
    ) {
        String question = request.getQuestion();

        if (question == null || question.trim().isEmpty()) {
            return ResponseEntity.badRequest().body(Map.of("status", "error", "message", "Câu hỏi không được để trống"));
        }

        // Bóc tách Role (Ví dụ từ "ROLE_LANDLORD" thành "LANDLORD")
        String role = "GUEST";
        Long userId = -1L;
        
        if (currentUser != null) {
            role = currentUser.getAuthorities().iterator().next().getAuthority().replace("ROLE_", "");
            userId = currentUser.getId();
        }

        System.out.println("👤 Khách đang tra cứu: ID=" + userId + ", Role=" + role);

        AiPageContext validatedContext = aiContextValidator.validateAndResolve(request.getPageContext(), role, userId);

        try {
            Object result = aiOrchestratorService.processDataQuery(
                    question,
                    role,
                    userId,
                    request.getLatitude(),
                    request.getLongitude(),
                    validatedContext
            );
            boolean verifiable = true;
            if (result instanceof String textResult) {
                String sanitized = aiOrchestratorService.sanitizeForUserFacing(textResult);
                result = sanitized;
                verifiable = isLikelyVerifiableDataAnswer(sanitized);
            }

            return ResponseEntity.ok(Map.of(
                    "status", "success",
                    "question", question,
                    "data", result,
                    "source", verifiable ? "SYSTEM_DB" : "SYSTEM_DB_FALLBACK",
                    "verifiable", verifiable
            ));
        } catch (Throwable t) {
            System.err.println("❌ [AI DATA ERROR] Lỗi khi xử lý truy vấn dữ liệu AI: " + t.getMessage());
            return ResponseEntity.status(503).body(Map.of(
                    "status", "error",
                    "message", "Dịch vụ AI hiện đang quá tải. Không thể phân tích dữ liệu lúc này. Vui lòng thử lại sau."
            ));
        }
    }
    // Admin: Lấy thống kê AI NLP (tất cả cache SQL)
    @GetMapping("/admin/analytics")
    public ResponseEntity<?> getAiAnalytics() {
        return ResponseEntity.ok(aiOrchestratorService.getAnalytics());
    }

    // Admin: Observability — AI pipeline logs with responseSource distribution
    @GetMapping("/admin/observability")
    public ResponseEntity<?> getAiObservability(
            @RequestParam(defaultValue = "200") int limit) {
        try {
            List<iuh.se.kltn.backend.modules.ai.entity.AiActionLog> logs =
                    aiActionLogRepository.findAllByOrderByCreatedAtDesc(
                            org.springframework.data.domain.PageRequest.of(0, Math.min(limit, 200)));

            // Source distribution
            Map<String, Long> sourceDistribution = logs.stream()
                    .filter(l -> l.getResponseSource() != null)
                    .collect(Collectors.groupingBy(
                            iuh.se.kltn.backend.modules.ai.entity.AiActionLog::getResponseSource,
                            Collectors.counting()));

            // Security blocked queries
            List<Map<String, Object>> blockedQueries = logs.stream()
                    .filter(l -> "SECURITY_BLOCKED".equals(l.getResponseSource()))
                    .map(l -> {
                        Map<String, Object> m = new HashMap<>();
                        m.put("query", l.getRawQuery());
                        m.put("role", l.getUserRole());
                        m.put("sql", l.getGeneratedSql());
                        m.put("createdAt", l.getCreatedAt());
                        return m;
                    })
                    .collect(Collectors.toList());

            // Average latency by source
            Map<String, Double> avgLatencyBySource = logs.stream()
                    .filter(l -> l.getResponseSource() != null && l.getExecutionTimeMs() != null)
                    .collect(Collectors.groupingBy(
                            iuh.se.kltn.backend.modules.ai.entity.AiActionLog::getResponseSource,
                            Collectors.averagingLong(iuh.se.kltn.backend.modules.ai.entity.AiActionLog::getExecutionTimeMs)));

            // Recent logs (simplified)
            List<Map<String, Object>> recentLogs = logs.stream()
                    .limit(20)
                    .map(l -> {
                        Map<String, Object> m = new HashMap<>();
                        m.put("id", l.getId());
                        m.put("query", l.getRawQuery());
                        m.put("role", l.getUserRole());
                        m.put("intent", l.getPredictedIntent());
                        m.put("confidence", l.getConfidenceScore());
                        m.put("source", l.getResponseSource());
                        m.put("latencyMs", l.getExecutionTimeMs());
                        m.put("success", l.isSuccess());
                        m.put("rowCount", l.getResultRowCount());
                        m.put("cacheScore", l.getCacheScore());
                        m.put("locationSource", l.getLocationSource());
                        m.put("createdAt", l.getCreatedAt());
                        return m;
                    })
                    .collect(Collectors.toList());

            return ResponseEntity.ok(Map.of(
                    "sourceDistribution", sourceDistribution,
                    "blockedQueries", blockedQueries,
                    "avgLatencyBySource", avgLatencyBySource,
                    "recentLogs", recentLogs,
                    "totalLogs", aiActionLogRepository.count()
            ));
        } catch (Exception e) {
            return ResponseEntity.status(500).body(Map.of("status", "error", "message", e.getMessage()));
        }
    }

    // Admin: Update câu SQL bị AI sinh sai
    @PutMapping("/admin/cache/{id}")
    public ResponseEntity<?> updateCache(@PathVariable Long id, @Valid @RequestBody AiUpdateCacheRequest request) {
        String newSql = request.getGeneratedSql();
        if (newSql == null || newSql.trim().isEmpty()) {
            return ResponseEntity.badRequest().body(Map.of("status", "error", "message", "SQL không được để trống"));
        }
        try {
            aiOrchestratorService.updateCacheEntry(id, newSql);
            return ResponseEntity.ok(Map.of("status", "success", "message", "Đã cập nhật câu lệnh SQL thành công!"));
        } catch (Exception e) {
            return ResponseEntity.status(400).body(Map.of("status", "error", "message", e.getMessage()));
        }
    }

    // Admin: Xóa 1 câu AI đã học
    @DeleteMapping("/admin/cache/{id}")
    public ResponseEntity<?> deleteCache(@PathVariable Long id) {
        try {
            aiOrchestratorService.deleteCacheEntry(id);
            return ResponseEntity.ok(Map.of("status", "success", "message", "Đã xóa câu hỏi khỏi bộ nhớ AI!"));
        } catch (Exception e) {
            return ResponseEntity.status(400).body(Map.of("status", "error", "message", e.getMessage()));
        }
    }

    // Admin: Test chạy thử 1 SQL trong cache
    @PostMapping("/admin/cache/{id}/test")
    public ResponseEntity<?> testCacheSql(@PathVariable Long id) {
        try {
            var result = aiOrchestratorService.testCacheEntry(id);
            return ResponseEntity.ok(result);
        } catch (Exception e) {
            return ResponseEntity.status(400).body(Map.of(
                    "status", "error", "message", e.getMessage()
            ));
        }
    }

    // Admin: Batch validate - kiểm tra tất cả SQL entries
    @PostMapping("/admin/cache/validate-all")
    public ResponseEntity<?> validateAllCache() {
        try {
            var result = aiOrchestratorService.batchValidateCache();
            return ResponseEntity.ok(result);
        } catch (Exception e) {
            return ResponseEntity.status(500).body(Map.of(
                    "status", "error", "message", e.getMessage()
            ));
        }
    }

    // Admin: Thêm mới 1 FAQ vào Tri thức
    @PostMapping("/admin/faq")
    public ResponseEntity<?> addFaqCache(@Valid @RequestBody AiFaqRequest request) {
        String question = request.getQuestion();
        String answer = request.getAnswer();
        if (question == null || answer == null) {
            return ResponseEntity.badRequest().body(Map.of("status", "error", "message", "Thiếu câu hỏi hoặc câu trả lời"));
        }
        try {
            aiOrchestratorService.addFaq(question, answer);
            return ResponseEntity.ok(Map.of("status", "success", "message", "Đã thêm câu hỏi FAQ vào kho tri thức thành công!"));
        } catch (Exception e) {
            return ResponseEntity.status(400).body(Map.of("status", "error", "message", e.getMessage()));
        }
    }

    // Admin: Khởi tạo dữ liệu Vector mẫu (Để test)
    @PostMapping("/admin/rag/documents")
    public ResponseEntity<?> createRagDocument(@Valid @RequestBody RagDocumentRequest request) {
        try {
            return ResponseEntity.ok(ragKnowledgeService.createDocument(request));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("status", "error", "message", e.getMessage()));
        }
    }

    @PutMapping("/admin/rag/documents/{docId}")
    public ResponseEntity<?> updateRagDocument(@PathVariable String docId, @Valid @RequestBody RagDocumentRequest request) {
        try {
            return ResponseEntity.ok(ragKnowledgeService.updateDocument(docId, request));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("status", "error", "message", e.getMessage()));
        }
    }

    @DeleteMapping("/admin/rag/documents/{docId}")
    public ResponseEntity<?> deleteRagDocument(@PathVariable String docId) {
        try {
            return ResponseEntity.ok(ragKnowledgeService.softDeleteDocument(docId));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("status", "error", "message", e.getMessage()));
        }
    }

    @GetMapping("/admin/rag/documents")
    public ResponseEntity<?> listRagDocuments(@RequestParam(defaultValue = "false") boolean includeDeleted) {
        return ResponseEntity.ok(ragKnowledgeService.listDocuments(includeDeleted));
    }

    @PostMapping("/admin/rag/reindex")
    public ResponseEntity<?> reindexAllRagDocuments() {
        try {
            return ResponseEntity.ok(ragKnowledgeService.reindexAll());
        } catch (Exception e) {
            return ResponseEntity.status(500).body(Map.of("status", "error", "message", e.getMessage()));
        }
    }

    @PostMapping("/admin/rag/reindex/{docId}")
    public ResponseEntity<?> reindexOneRagDocument(@PathVariable String docId) {
        try {
            return ResponseEntity.ok(ragKnowledgeService.reindexOne(docId));
        } catch (Exception e) {
            return ResponseEntity.status(500).body(Map.of("status", "error", "message", e.getMessage()));
        }
    }

    @GetMapping("/admin/rag/status")
    public ResponseEntity<?> getRagStatus() {
        return ResponseEntity.ok(ragKnowledgeService.ragStatus());
    }

    @PostMapping("/admin/init-data")
    public ResponseEntity<?> initSampleData() {
        // Code ở đây
        return ResponseEntity.ok("This is a placeholder");
    }

    @PostMapping("/actions/generate-reminders")
    public ResponseEntity<?> generateReminders(
            @RequestParam(defaultValue = "OVERDUE") String scope,
            @RequestParam(defaultValue = "3") Integer daysAhead,
            @AuthenticationPrincipal UserPrincipal currentUser) {
        try {
            if (currentUser == null || !"LANDLORD".equalsIgnoreCase(roleFrom(currentUser))) {
                return ResponseEntity.status(403).body(Map.of(
                        "status", "error",
                        "message", "Chuc nang nhac hoa don chi danh cho chu tro."
                ));
            }

            Long landlordId = currentUser.getId();
            List<Bill> candidateBills = billRepository.findAllByContract_Room_Property_Landlord_IdAndStatusIn(
                    landlordId, Arrays.asList(BillStatus.UNPAID, BillStatus.LATE, BillStatus.PENDING));

            String normalizedScope = normalizeReminderScope(scope);
            int safeDaysAhead = (daysAhead == null || daysAhead < 1) ? 3 : Math.min(daysAhead, 14);
            LocalDateTime now = LocalDateTime.now();

            List<Bill> dueBills = filterBillsByReminderScope(candidateBills, normalizedScope, safeDaysAhead, now);
            sortBillsByReminderScope(dueBills, normalizedScope, now);

            if (dueBills.isEmpty()) {
                String emptyMessage = "OVERDUE".equals(normalizedScope)
                        ? "Không có phòng nào đang nợ hoặc quá hạn thanh toán."
                        : "Khong co hoa don nao sap den han trong khoang thoi gian da chon.";
                return ResponseEntity.ok(Map.of(
                        "status", "success",
                        "scope", normalizedScope,
                        "daysAhead", safeDaysAhead,
                        "data", new ArrayList<>(),
                        "message", emptyMessage
                ));
            }

            List<Map<String, Object>> billDataList = new ArrayList<>();
            for (Bill b : dueBills) {
                Map<String, Object> map = new HashMap<>();
                map.put("billId", b.getId());
                map.put("roomId", b.getContract().getRoom().getId());
                map.put("roomName", b.getContract().getRoom().getName());
                map.put("tenantId", b.getContract().getTenant().getId());
                map.put("tenantName", b.getContract().getTenant().getFullName());
                map.put("totalAmount", b.getTotalAmount() != null ? b.getTotalAmount() : 0);
                map.put("deadline", b.getDeadline() != null ? b.getDeadline().toString() : "");
                map.put("status", b.getStatus().toString());
                map.put("reminderScope", normalizedScope);
                map.put("daysToDeadline", calculateDaysToDeadline(now, b.getDeadline()));
                billDataList.add(map);
            }

            List<Map<String, Object>> draftedReminders;
            if ("FULL".equals(resolveLlmMode())) {
                try {
                    String billsJson = objectMapper.writeValueAsString(billDataList);
                    String aiResultString = draftReminderAi.generateReminders(billsJson);
                    aiResultString = aiResultString.replace("```json", "").replace("```", "").trim();
                    @SuppressWarnings("unchecked")
                    List<Map<String, Object>> aiDrafts = objectMapper.readValue(aiResultString, List.class);
                    draftedReminders = aiDrafts;
                } catch (Exception ex) {
                    System.err.println("[AI REMINDER WARN] fallback to template: " + ex.getMessage());
                    draftedReminders = buildTemplateReminderDrafts(billDataList, normalizedScope);
                }
            } else {
                draftedReminders = buildTemplateReminderDrafts(billDataList, normalizedScope);
            }

            for (Map<String, Object> draft : draftedReminders) {
                Object billIdObj = draft.get("billId");
                if (billIdObj == null) {
                    continue;
                }
                Long billId = Long.valueOf(billIdObj.toString());
                Map<String, Object> matchedBill = billDataList.stream()
                        .filter(b -> Long.valueOf(b.get("billId").toString()).equals(billId))
                        .findFirst().orElse(null);
                if (matchedBill != null) {
                    draft.put("tenantId", matchedBill.get("tenantId"));
                    draft.put("roomName", matchedBill.get("roomName"));
                    if (!draft.containsKey("draftedMessage") || draft.get("draftedMessage") == null) {
                        draft.put("draftedMessage", buildTemplateReminderMessage(matchedBill, normalizedScope));
                    }
                }
            }

            return ResponseEntity.ok(Map.of(
                    "status", "success",
                    "scope", normalizedScope,
                    "daysAhead", safeDaysAhead,
                    "data", draftedReminders
            ));

        } catch (Exception e) {
            System.err.println("[AI REMINDER ERROR] " + e.getMessage());
            return ResponseEntity.status(503).body(Map.of(
                "status", "error",
                "message", "Dich vu AI soan tin nhan dang ban (503). Vui long thu lai sau giay lat."
            ));
        }
    }

    @PostMapping("/actions/analyze-anomalies")
    public ResponseEntity<?> analyzeAnomalies(@AuthenticationPrincipal UserPrincipal currentUser) {
        try {
            Long landlordId = currentUser.getId();
            List<Bill> allBills = billRepository.findAllByContract_Room_Property_Landlord_IdOrderByYearDescMonthDesc(landlordId);

            if (allBills.isEmpty()) {
                return ResponseEntity.ok(Map.of("status", "success", "report", "Chua co du lieu hoa don de phan tich."));
            }

            Bill theLatest = allBills.get(0);
            int latestYear = theLatest.getYear();
            int latestMonth = theLatest.getMonth();

            List<Bill> latestMonthBills = allBills.stream()
                    .filter(b -> b.getYear() == latestYear && b.getMonth() == latestMonth)
                    .collect(Collectors.toList());

            double totalElec = 0;
            double totalWater = 0;
            int countElec = 0;
            int countWater = 0;

            for (Bill b : latestMonthBills) {
                if (b.getNewElecIndex() != null && b.getOldElecIndex() != null) {
                    totalElec += (b.getNewElecIndex() - b.getOldElecIndex());
                    countElec++;
                }
                if (b.getNewWaterIndex() != null && b.getOldWaterIndex() != null) {
                    totalWater += (b.getNewWaterIndex() - b.getOldWaterIndex());
                    countWater++;
                }
            }

            double avgElec = countElec > 0 ? totalElec / countElec : 0;
            double avgWater = countWater > 0 ? totalWater / countWater : 0;

            Map<Long, List<Bill>> billsByRoom = allBills.stream()
                    .collect(Collectors.groupingBy(b -> b.getContract().getRoom().getId()));

            List<Map<String, Object>> anomalies = new ArrayList<>();

            for (Map.Entry<Long, List<Bill>> entry : billsByRoom.entrySet()) {
                List<Bill> roomBills = entry.getValue();
                Bill latestBill = roomBills.stream()
                        .filter(b -> b.getYear() == latestYear && b.getMonth() == latestMonth)
                        .findFirst().orElse(null);

                if (latestBill == null) {
                    continue;
                }

                int currElec = (latestBill.getNewElecIndex() != null && latestBill.getOldElecIndex() != null) ? (latestBill.getNewElecIndex() - latestBill.getOldElecIndex()) : 0;
                int currWater = (latestBill.getNewWaterIndex() != null && latestBill.getOldWaterIndex() != null) ? (latestBill.getNewWaterIndex() - latestBill.getOldWaterIndex()) : 0;

                boolean isAnomaly = false;
                Map<String, Object> anomalyData = new HashMap<>();
                anomalyData.put("roomName", latestBill.getContract().getRoom().getName());
                anomalyData.put("avgElecSystem", Math.round(avgElec));
                anomalyData.put("avgWaterSystem", Math.round(avgWater));

                if (roomBills.size() >= 2) {
                    Bill prevBill = roomBills.get(1);
                    int prevElec = (prevBill.getNewElecIndex() != null && prevBill.getOldElecIndex() != null) ? (prevBill.getNewElecIndex() - prevBill.getOldElecIndex()) : 0;
                    int prevWater = (prevBill.getNewWaterIndex() != null && prevBill.getOldWaterIndex() != null) ? (prevBill.getNewWaterIndex() - prevBill.getOldWaterIndex()) : 0;

                    if (prevElec > 0 && currElec >= prevElec * 1.35) {
                        anomalyData.put("electricityTimeAnomaly", String.format("Tang %d%% so voi thang truoc (tu %d len %d kWh)", ((currElec - prevElec) * 100 / prevElec), prevElec, currElec));
                        isAnomaly = true;
                    }
                    if (prevWater > 0 && currWater >= prevWater * 1.35) {
                        anomalyData.put("waterTimeAnomaly", String.format("Tang %d%% so voi thang truoc (tu %d len %d m3)", ((currWater - prevWater) * 100 / prevWater), prevWater, currWater));
                        isAnomaly = true;
                    }
                }

                if (avgElec > 0 && currElec >= avgElec * 2.0) {
                    anomalyData.put("electricityOutlier", String.format("Vuot 200%% muc trung binh toa nha (%d so voi trung binh %d kWh)", currElec, (int) avgElec));
                    isAnomaly = true;
                }
                if (avgWater > 0 && currWater >= avgWater * 1.5) {
                    anomalyData.put("waterOutlier", String.format("Vuot 150%% muc trung binh toa nha (%d so voi trung binh %d m3)", currWater, (int) avgWater));
                    isAnomaly = true;
                }

                if (isAnomaly) {
                    anomalies.add(anomalyData);
                }
            }

            if (anomalies.isEmpty()) {
                return ResponseEntity.ok(Map.of("status", "success", "report", "He thong khong phat hien dau hieu bat thuong nao trong ky gan nhat."));
            }

            String report;
            if ("FULL".equals(resolveLlmMode())) {
                try {
                    String anomaliesJson = objectMapper.writeValueAsString(anomalies);
                    report = anomalyAi.generateAnomalyReport(anomaliesJson);
                    report = report.replace("```markdown", "").replace("```", "").trim();
                } catch (Exception ex) {
                    System.err.println("[AI ANOMALY WARN] fallback to template: " + ex.getMessage());
                    report = buildTemplateAnomalyReport(anomalies, latestMonth, latestYear);
                }
            } else {
                report = buildTemplateAnomalyReport(anomalies, latestMonth, latestYear);
            }

            return ResponseEntity.ok(Map.of("status", "success", "report", report));
        } catch (Throwable t) {
            System.err.println("[AI ANOMALY ERROR] " + t.getMessage());
            return ResponseEntity.status(503).body(Map.of(
                    "status", "error",
                    "message", "Dich vu phan tich dang ban. Vui long thu lai sau giay lat."
            ));
        }
    }


    @PostMapping("/actions/send-reminders")
    public ResponseEntity<?> sendReminders(@Valid @RequestBody @NotEmpty List<AiReminderApprovalRequest> approvedReminders,
                                           @AuthenticationPrincipal UserPrincipal currentUser) {
        try {
            if (currentUser == null || !"LANDLORD".equalsIgnoreCase(roleFrom(currentUser))) {
                return ResponseEntity.status(403).body(Map.of(
                        "status", "error",
                        "message", "Chuc nang gui nhac hoa don chi danh cho chu tro."
                ));
            }

            Long landlordId = currentUser.getId();
            int count = 0;
            int skipped = 0;
            for (AiReminderApprovalRequest reminder : approvedReminders) {
                Long tenantId = reminder.getTenantId();
                Long billId = reminder.getBillId();
                String message = reminder.getDraftedMessage();
                String roomName = reminder.getRoomName();

                Bill bill = billRepository.findById(billId).orElse(null);
                if (bill == null || !isBillOwnedByLandlord(bill, landlordId)) {
                    skipped++;
                    continue;
                }
                Long actualTenantId = bill.getContract() != null && bill.getContract().getTenant() != null
                        ? bill.getContract().getTenant().getId()
                        : null;
                if (!Objects.equals(actualTenantId, tenantId)) {
                    skipped++;
                    continue;
                }

                iuh.se.kltn.backend.modules.user.entity.User tenant = userRepository.findById(tenantId).orElse(null);
                
                if (tenant != null) {
                    notificationService.createNotification(
                        tenant,
                        "Thông báo nhắc phí phòng " + roomName,
                        message,
                        NotificationType.PAYMENT_REMINDER,
                        billId
                    );
                    count++;
                } else {
                    skipped++;
                }
            }
            return ResponseEntity.ok(Map.of(
                    "status", "success",
                    "sentCount", count,
                    "skippedCount", skipped,
                    "message", "Da gui thong bao thanh cong cho " + count + " phong."
                            + (skipped > 0 ? " Bo qua " + skipped + " muc khong hop le." : "")
            ));
        } catch (Exception e) {
            System.err.println("[AI REMINDER ERROR] " + e.getMessage());
            return ResponseEntity.status(503).body(Map.of(
                "status", "error",
                "message", "Dich vu AI soan tin nhan dang ban (503). Vui long thu lai sau giay lat."
            ));
        }
    }

    @PostMapping("/clear-cache")
    public ResponseEntity<?> clearCache() {
        aiOrchestratorService.clearSqlCache();
        return ResponseEntity.ok(Map.of("status", "success", "message", "Đã xoá bộ nhớ đệm AI thành công!"));
    }

    /**
     * Tạo mô tả phòng trọ tự động bằng AI Gemini.
     * Frontend gửi keywords (tên phòng, diện tích, giá, tiện ích) → AI viết mô tả chuẩn SEO.
     */
    @PostMapping("/generate-room-description")
    public ResponseEntity<?> generateRoomDescription(@Valid @RequestBody AiRoomDescriptionRequest request, @AuthenticationPrincipal UserPrincipal currentUser) {
        if (currentUser != null && "LANDLORD".equals(roleFrom(currentUser))) {
            if (!vipSubscriptionService.canUseAiDescription(currentUser.getId())) {
                return ResponseEntity.status(403).body(Map.of("status", "error", "message", "Vui lòng nâng cấp gói VIP để sử dụng tính năng AI tạo mô tả."));
            }
        }

        String prompt = request.getPrompt();
        if (prompt == null || prompt.trim().isEmpty()) {
            return ResponseEntity.badRequest().body(Map.of("status", "error", "message", "Vui long cung cap thong tin phong"));
        }

        if (!"FULL".equals(resolveLlmMode())) {
            return ResponseEntity.ok(Map.of("description", buildTemplateRoomDescription(prompt)));
        }

        try {
            String aiPrompt = String.format(
                "Bạn là chuyên gia viết nội dung cho website cho thuê phòng trọ. " +
                "Hãy viết một đoạn mô tả phòng trọ hấp dẫn, ngắn gọn (3-5 câu), bằng tiếng Việt, " +
                "dua tren thong tin sau. Chi tra ve noi dung mo ta, KHONG them tieu de hay giai thich gi khac.\n\n" +
                "Thong tin phong: %s", prompt);

            String description = geminiChatModel.generate(aiPrompt);
            return ResponseEntity.ok(Map.of("description", description));
        } catch (Throwable t) {
            System.err.println("AI description fallback template: " + t.getMessage());
            return ResponseEntity.ok(Map.of("description", buildTemplateRoomDescription(prompt)));
        }
    }

    @PostMapping("/suggest-room-price")
    public ResponseEntity<?> suggestRoomPrice(
            @Valid @RequestBody AiSuggestRoomPriceRequest request,
            @AuthenticationPrincipal UserPrincipal currentUser
    ) {
        if (currentUser != null && "LANDLORD".equals(roleFrom(currentUser))) {
            if (!vipSubscriptionService.canUseAiPriceSuggestion(currentUser.getId())) {
                return ResponseEntity.status(403).body(Map.of("status", "error", "message", "Vui lòng nâng cấp gói VIP để sử dụng tính năng AI gợi ý giá."));
            }
        }

        long startTime = System.currentTimeMillis();
        String district = request.getDistrict();
        String city = request.getCity();
        Double area = request.getArea();
        String type = request.getType();
        List<String> amenities = request.getAmenities();

        String amenitiesStr = (amenities != null && !amenities.isEmpty()) ? String.join(", ", amenities) : "Khong co";
        String standardizedQuestion = String.format("PRICE_SUGGEST:%s:%s:%s:%.0f", city, district, type, area);
        String rawQueryForLog = String.format("Gợi ý giá phòng %s, diện tích %.1f m2 tại Quận %s, %s.", type, area, district, city);

        String cachedResponse = aiOrchestratorService.searchFaq(standardizedQuestion);
        if (cachedResponse != null) {
            try {
                saveActionLog(userIdFrom(currentUser), roleFrom(currentUser), rawQueryForLog, "SUGGEST_PRICE", 1.0, false, startTime, true);
                return ResponseEntity.ok(objectMapper.readValue(cachedResponse, Map.class));
            } catch (Exception e) {
                System.err.println("Price cache parse error: " + e.getMessage());
            }
        }

        Map<String, Object> templateSuggestion = buildDeterministicPriceSuggestion(district, city, area, type, amenities);
        if (!"FULL".equals(resolveLlmMode())) {
            try {
                aiOrchestratorService.addFaq(standardizedQuestion, objectMapper.writeValueAsString(templateSuggestion));
            } catch (Exception ignored) {
            }
            saveActionLog(userIdFrom(currentUser), roleFrom(currentUser), rawQueryForLog, "SUGGEST_PRICE", 1.0, false, startTime, true);
            return ResponseEntity.ok(templateSuggestion);
        }

        try {
            String aiPrompt = String.format(
                "Gợi ý KHOẢNG GIÁ thuê (VND) phòng %s, %.1f m2 tại Q.%s, %s. Tiện ích: %s.\n" +
                "Tra ve JSON: {\"suggestion\": \"Khoang gia\", \"reason\": \"Ly do ngan gon\"}. Chi tra ve JSON.",
                type, area, district, city, amenitiesStr
            );

            String response = geminiChatModel.generate(aiPrompt);
            response = response.replace("```json", "").replace("```", "").trim();
            Map<String, Object> parsed = objectMapper.readValue(response, Map.class);
            if (!parsed.containsKey("suggestion")) {
                parsed.putAll(templateSuggestion);
            }
            aiOrchestratorService.addFaq(standardizedQuestion, objectMapper.writeValueAsString(parsed));
            saveActionLog(userIdFrom(currentUser), roleFrom(currentUser), rawQueryForLog, "SUGGEST_PRICE", 1.0, false, startTime, true);
            return ResponseEntity.ok(parsed);
        } catch (Throwable t) {
            System.err.println("AI price suggest fallback deterministic: " + t.getMessage());
            saveActionLog(userIdFrom(currentUser), roleFrom(currentUser), rawQueryForLog, "SUGGEST_PRICE", 0.6, true, startTime, true);
            return ResponseEntity.ok(templateSuggestion);
        }
    }


    private List<Map<String, Object>> buildTemplateReminderDrafts(List<Map<String, Object>> billDataList, String scope) {
        List<Map<String, Object>> drafts = new ArrayList<>();
        for (Map<String, Object> bill : billDataList) {
            Map<String, Object> draft = new HashMap<>();
            draft.put("billId", bill.get("billId"));
            draft.put("roomId", bill.get("roomId"));
            draft.put("tenantName", bill.get("tenantName"));
            draft.put("draftedMessage", buildTemplateReminderMessage(bill, scope));
            drafts.add(draft);
        }
        return drafts;
    }

    private String buildTemplateReminderMessage(Map<String, Object> bill, String scope) {
        String tenantName = String.valueOf(bill.getOrDefault("tenantName", "ban"));
        String roomName = String.valueOf(bill.getOrDefault("roomName", "phong"));
        long amount = parseLongValue(bill.get("totalAmount"));
        String deadline = String.valueOf(bill.getOrDefault("deadline", ""));
        String amountText = formatCurrencyVnd(amount);

        if ("DUE_SOON".equalsIgnoreCase(scope)) {
            return String.format(
                    "Chào %s, phòng %s sắp đến hạn thanh toán. Tổng số tiền kỳ này là %s, hạn cuối %s. Nhớ bạn sắp xếp thanh toán đúng hạn giúp mình nhé.",
                    tenantName, roomName, amountText, deadline
            );
        }

        return String.format(
                "Chào %s, phòng %s hiện đang quá hạn/chưa thanh toán. Tổng số tiền cần thanh toán là %s, hạn %s. Bạn vui lòng thanh toán sớm để tránh phát sinh phí phạt.",
                tenantName, roomName, amountText, deadline
        );
    }

    private String buildTemplateAnomalyReport(List<Map<String, Object>> anomalies, int latestMonth, int latestYear) {
        StringBuilder sb = new StringBuilder();
        sb.append("Bao cao bat thuong dien nuoc thang ").append(latestMonth).append("/").append(latestYear).append("\n\n");
        sb.append("Tổng số phòng cảnh báo: ").append(anomalies.size()).append("\n\n");

        int idx = 1;
        for (Map<String, Object> anomaly : anomalies) {
            if (idx > 10) {
                sb.append("... và ").append(anomalies.size() - 10).append(" phòng cảnh báo khác.\n");
                break;
            }
            sb.append(idx).append(". Phong: ").append(String.valueOf(anomaly.getOrDefault("roomName", "N/A"))).append("\n");
            if (anomaly.get("electricityTimeAnomaly") != null) {
                sb.append("- Dien (time-series): ").append(anomaly.get("electricityTimeAnomaly")).append("\n");
            }
            if (anomaly.get("waterTimeAnomaly") != null) {
                sb.append("- Nuoc (time-series): ").append(anomaly.get("waterTimeAnomaly")).append("\n");
            }
            if (anomaly.get("electricityOutlier") != null) {
                sb.append("- Dien (outlier): ").append(anomaly.get("electricityOutlier")).append("\n");
            }
            if (anomaly.get("waterOutlier") != null) {
                sb.append("- Nuoc (outlier): ").append(anomaly.get("waterOutlier")).append("\n");
            }
            sb.append("- De xuat: Kiem tra thiet bi cong suat lon, ra soat ro ri, va lien he khach thue de xac minh nhu cau su dung thuc te.\n\n");
            idx++;
        }

        sb.append("Khuyen nghi chung:\n");
        sb.append("- Kiểm tra phòng có dấu hiệu tăng đột biến >35% ngay trong kỳ tiếp theo.\n");
        sb.append("- Đặt ngưỡng cảnh báo cho phòng vượt >2.0x điện hoặc >1.5x nước so với trung bình.\n");
        sb.append("- Uu tien xu ly truong hop vuot nguong cao de giam rui ro chay no/ngap nuoc.\n");
        return sb.toString();
    }

    private String buildTemplateRoomDescription(String prompt) {
        String clean = prompt == null ? "" : prompt.replaceAll("\\s+", " ").trim();
        if (clean.length() > 240) {
            clean = clean.substring(0, 240) + "...";
        }
        return "Phong tro co thong tin noi bat: " + clean + ". "
                + "Khong gian duoc toi uu cho nhu cau o lau dai, phu hop sinh hoat hang ngay. "
                + "Muc gia va tien ich duoc can doi de dam bao chi phi hop ly. "
                + "Bạn nên liên hệ xem phòng thực tế để chốt lựa chọn phù hợp nhất.";
    }

    private Map<String, Object> buildDeterministicPriceSuggestion(String district, String city, Double area, String type, List<String> amenities) {
        double safeArea = area == null || area <= 0 ? 20.0 : area;
        String typeNormalized = type == null ? "" : type.trim().toUpperCase();

        double typeMultiplier;
        if (typeNormalized.contains("STUDIO")) {
            typeMultiplier = 1.12;
        } else if (typeNormalized.contains("ONE_BEDROOM") || typeNormalized.contains("1")) {
            typeMultiplier = 1.08;
        } else if (typeNormalized.contains("TWO_BEDROOM") || typeNormalized.contains("2")) {
            typeMultiplier = 1.18;
        } else if (typeNormalized.contains("SHARED") || typeNormalized.contains("GHEP")) {
            typeMultiplier = 0.82;
        } else if (typeNormalized.contains("MEZZANINE") || typeNormalized.contains("GAC")) {
            typeMultiplier = 1.10;
        } else {
            typeMultiplier = 1.0;
        }

        String districtNorm = district == null ? "" : district.toLowerCase();
        double districtMultiplier = 1.0;
        if (districtNorm.contains("quan 1") || districtNorm.contains("quan 3") || districtNorm.contains("binh thanh") || districtNorm.contains("phu nhuan")) {
            districtMultiplier = 1.15;
        } else if (districtNorm.contains("quan 7") || districtNorm.contains("quan 2") || districtNorm.contains("thu duc")) {
            districtMultiplier = 1.10;
        } else if (districtNorm.contains("quan 12") || districtNorm.contains("binh tan") || districtNorm.contains("hoc mon") || districtNorm.contains("cu chi")) {
            districtMultiplier = 0.92;
        }

        int amenityCount = amenities == null ? 0 : amenities.size();
        double amenityBonus = Math.min(amenityCount, 4) * 150000.0;

        double basePerM2 = 110000.0;
        double estimated = (safeArea * basePerM2 * typeMultiplier * districtMultiplier) + amenityBonus;
        long minPrice = Math.round(estimated * 0.9);
        long maxPrice = Math.round(estimated * 1.1);

        Map<String, Object> result = new HashMap<>();
        result.put("suggestion", formatCurrencyVnd(minPrice) + " - " + formatCurrencyVnd(maxPrice) + "/thang");
        result.put("reason", "Uoc tinh theo dien tich, loai phong, khu vuc " + district + ", " + city + " va so tien ich khai bao.");
        result.put("minPrice", minPrice);
        result.put("maxPrice", maxPrice);
        result.put("currency", "VND");
        result.put("source", "RULE_BASED");
        return result;
    }

    private long parseLongValue(Object value) {
        if (value instanceof Number number) {
            return number.longValue();
        }
        if (value == null) {
            return 0L;
        }
        try {
            return Math.round(Double.parseDouble(value.toString()));
        } catch (Exception ex) {
            return 0L;
        }
    }

    private String formatCurrencyVnd(long amount) {
        java.text.NumberFormat nf = java.text.NumberFormat.getInstance(new java.util.Locale("vi", "VN"));
        return nf.format(amount) + "d";
    }

    private void saveActionLog(Long userId, String userRole, String query, String intent, double score, boolean isError, long startTime, boolean isSuccess) {
        if (userId == -1L) return;
        try {
            aiActionLogRepository.save(iuh.se.kltn.backend.modules.ai.entity.AiActionLog.builder()
                    .userId(userId)
                    .userRole(userRole)
                    .rawQuery(query)
                    .predictedIntent(intent)
                    .confidenceScore(score)
                    .executionTimeMs(System.currentTimeMillis() - startTime)
                    .isSuccess(isSuccess)
                    .build());
        } catch (Exception e) {
            System.err.println("Lỗi lưu log AI: " + e.getMessage());
        }
    }

    private Long userIdFrom(UserPrincipal user) { return user != null ? user.getId() : -1L; }
    private String roleFrom(UserPrincipal user) { 
        return user != null ? user.getAuthorities().iterator().next().getAuthority().replace("ROLE_", "") : "GUEST"; 
    }

    private String normalizeReminderScope(String scope) {
        if (scope == null || scope.isBlank()) {
            return "OVERDUE";
        }
        String normalized = scope.trim().toUpperCase();
        return "DUE_SOON".equals(normalized) ? "DUE_SOON" : "OVERDUE";
    }

    private List<Bill> filterBillsByReminderScope(List<Bill> bills, String scope, int daysAhead, LocalDateTime now) {
        if (bills == null || bills.isEmpty()) {
            return new ArrayList<>();
        }
        List<Bill> filtered = new ArrayList<>();
        for (Bill bill : bills) {
            if (bill == null || bill.getStatus() == BillStatus.PAID) {
                continue;
            }
            if ("DUE_SOON".equals(scope)) {
                if (isDueSoonBill(bill, now, daysAhead)) {
                    filtered.add(bill);
                }
            } else if (isOverdueBill(bill, now)) {
                filtered.add(bill);
            }
        }
        return filtered;
    }

    private void sortBillsByReminderScope(List<Bill> bills, String scope, LocalDateTime now) {
        if (bills == null || bills.isEmpty()) {
            return;
        }
        if ("DUE_SOON".equals(scope)) {
            bills.sort(Comparator.comparing(Bill::getDeadline, Comparator.nullsLast(Comparator.naturalOrder())));
            return;
        }
        bills.sort((a, b) -> Long.compare(
                overdueDays(now, b.getDeadline()),
                overdueDays(now, a.getDeadline())
        ));
    }

    private boolean isOverdueBill(Bill bill, LocalDateTime now) {
        if (bill.getStatus() == BillStatus.LATE) {
            return true;
        }
        LocalDateTime deadline = bill.getDeadline();
        if (deadline == null) {
            return false;
        }
        return (bill.getStatus() == BillStatus.UNPAID || bill.getStatus() == BillStatus.PENDING)
                && deadline.isBefore(now);
    }

    private boolean isDueSoonBill(Bill bill, LocalDateTime now, int daysAhead) {
        if (!(bill.getStatus() == BillStatus.UNPAID || bill.getStatus() == BillStatus.PENDING)) {
            return false;
        }
        LocalDateTime deadline = bill.getDeadline();
        if (deadline == null || deadline.isBefore(now)) {
            return false;
        }
        return !deadline.isAfter(now.plusDays(daysAhead));
    }

    private long overdueDays(LocalDateTime now, LocalDateTime deadline) {
        if (deadline == null || !deadline.isBefore(now)) {
            return 0L;
        }
        return Math.max(0, ChronoUnit.DAYS.between(deadline.toLocalDate(), now.toLocalDate()));
    }

    private long calculateDaysToDeadline(LocalDateTime now, LocalDateTime deadline) {
        if (deadline == null) {
            return 0L;
        }
        return ChronoUnit.DAYS.between(now.toLocalDate(), deadline.toLocalDate());
    }

    private boolean isBillOwnedByLandlord(Bill bill, Long landlordId) {
        if (bill == null || landlordId == null || bill.getContract() == null
                || bill.getContract().getRoom() == null || bill.getContract().getRoom().getProperty() == null
                || bill.getContract().getRoom().getProperty().getLandlord() == null) {
            return false;
        }
        return Objects.equals(bill.getContract().getRoom().getProperty().getLandlord().getId(), landlordId);
    }

    private boolean isLikelyVerifiableDataAnswer(String text) {
        if (text == null || text.isBlank()) {
            return false;
        }
        String normalized = java.text.Normalizer.normalize(text, java.text.Normalizer.Form.NFD)
                .replaceAll("\\p{M}+", "")
                .toLowerCase();

        String[] fallbackSignals = new String[] {
                "khong the chuyen thanh truy van",
                "chua tao duoc truy van",
                "dang gap chut kho khan",
                "may chu ai hien tai dang qua tai",
                "he thong dang gap chut kho khan",
                "khong the phan tich du lieu luc nay",
                "vui long thu lai sau",
                "khong the tra cuu thong tin nay"
        };

        for (String signal : fallbackSignals) {
            if (normalized.contains(signal)) {
                return false;
            }
        }
        return true;
    }

    private String resolveLlmMode() {
        if (aiLlmMode == null || aiLlmMode.isBlank()) {
            return "FULL";
        }
        String normalized = aiLlmMode.trim().toUpperCase();
        if ("FULL".equals(normalized) || "PRESENTER_ONLY".equals(normalized) || "TEMPLATE_ONLY".equals(normalized)) {
            return normalized;
        }
        return "FULL";
    }
}

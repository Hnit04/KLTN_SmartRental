package iuh.se.kltn.backend.modules.ai.controller;

import iuh.se.kltn.backend.modules.ai.dto.request.*;
import iuh.se.kltn.backend.modules.ai.service.AiOrchestratorService;
import iuh.se.kltn.backend.modules.ai.service.SmartRentalAi;
import iuh.se.kltn.backend.modules.ai.service.RagKnowledgeService;
import dev.langchain4j.model.chat.ChatLanguageModel;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotEmpty;
import org.springframework.beans.factory.annotation.Autowired;
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
import java.util.stream.Collectors;
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


    @PostMapping("/chat")
    public ResponseEntity<?> chatWithAi(
            @Valid @RequestBody AiChatRequest request,
            @AuthenticationPrincipal UserPrincipal currentUser
    ) {
        String message = request.getMessage();
        String sessionId = request.getSessionId() != null ? request.getSessionId() : "default-user";
        
        String roleStr = "GUEST (Khách vãng lai chưa đăng nhập)";
        String userName = "Khách hàng";
        
        if (currentUser != null) {
            String roleRaw = currentUser.getAuthorities().iterator().next().getAuthority();
            roleStr = roleRaw.replace("ROLE_", ""); // TENANT hoặc LANDLORD hoặc ADMIN
            userName = currentUser.getUsername(); // Hoặc fullname
        }

        // B1: Thử tìm trong kho tri thức tĩnh (FAQ Cache) trước
        // NHƯNG: Bỏ qua FAQ cho câu hỏi phân tích phòng (dài, chứa dữ liệu phòng cụ thể)
        // vì FAQ vector search dễ bị false-positive với câu hỏi dài/phức tạp.
        String lowerMessage = message.toLowerCase();
        boolean isRoomAnalysis = (lowerMessage.contains("phân tích") || lowerMessage.contains("ưu điểm") 
                || lowerMessage.contains("nhược điểm") || lowerMessage.contains("đánh giá") 
                || lowerMessage.contains("lời khuyên") || lowerMessage.contains("tư vấn"))
                && (lowerMessage.contains("diện tích") || lowerMessage.contains("giá thuê") 
                || lowerMessage.contains("tiện nghi") || lowerMessage.contains("m²")
                || lowerMessage.contains("khu trọ") || lowerMessage.contains("giá dịch vụ")
                || lowerMessage.contains("khoảng giá") || lowerMessage.contains("tổng số phòng"));
        
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
            System.out.println("🏠 [ROUTER] Phát hiện yêu cầu phân tích phòng trọ → Bỏ qua FAQ Cache, chuyển thẳng cho SmartRentalAi.");
        }

        // B2: Nếu không thấy, gọi mô hình LLM
        try {
            String response = smartRentalAi.chat(sessionId, roleStr, userName, message);
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

        try {
            Object result = aiOrchestratorService.processDataQuery(question, role, userId);
            if (result instanceof String textResult) {
                result = aiOrchestratorService.sanitizeForUserFacing(textResult);
            }

            return ResponseEntity.ok(Map.of(
                    "status", "success",
                    "question", question,
                    "data", result,
                    "source", "SYSTEM_DB",
                    "verifiable", true
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
    public ResponseEntity<?> generateReminders(@AuthenticationPrincipal UserPrincipal currentUser) {
        try {
            Long landlordId = currentUser.getId();
            List<Bill> dueBills = billRepository.findAllByContract_Room_Property_Landlord_IdAndStatusIn(
                    landlordId, Arrays.asList(BillStatus.UNPAID, BillStatus.LATE));

            if (dueBills.isEmpty()) {
                return ResponseEntity.ok(Map.of(
                        "status", "success",
                        "data", new ArrayList<>(),
                        "message", "Không có phòng nào đang nợ tiền."
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
                billDataList.add(map);
            }

            String billsJson = objectMapper.writeValueAsString(billDataList);
            String aiResultString = draftReminderAi.generateReminders(billsJson);

            // Clean up backticks if any
            aiResultString = aiResultString.replace("```json", "").replace("```", "").trim();

            @SuppressWarnings("unchecked")
            List<Map<String, Object>> draftedReminders = objectMapper.readValue(aiResultString, List.class);

            // Gộp thông tin tenantId và roomName lại cho Client dễ hiển thị
            for (Map<String, Object> draft : draftedReminders) {
                Long billId = Long.valueOf(draft.get("billId").toString());
                Map<String, Object> matchedBill = billDataList.stream()
                        .filter(b -> Long.valueOf(b.get("billId").toString()).equals(billId))
                        .findFirst().orElse(null);
                if (matchedBill != null) {
                    draft.put("tenantId", matchedBill.get("tenantId"));
                    draft.put("roomName", matchedBill.get("roomName"));
                }
            }

            return ResponseEntity.ok(Map.of(
                    "status", "success",
                    "data", draftedReminders
            ));

        } catch (Exception e) {
            System.err.println("❌ [AI REMINDER ERROR] " + e.getMessage());
            return ResponseEntity.status(503).body(Map.of(
                "status", "error", 
                "message", "Dịch vụ AI soạn tin nhắn đang bận (503). Vui lòng thử lại sau giây lát."
            ));
        }
    }

    @PostMapping("/actions/analyze-anomalies")
    public ResponseEntity<?> analyzeAnomalies(@AuthenticationPrincipal UserPrincipal currentUser) {
        try {
            Long landlordId = currentUser.getId();
            List<Bill> allBills = billRepository.findAllByContract_Room_Property_Landlord_IdOrderByYearDescMonthDesc(landlordId);
            
            if (allBills.isEmpty()) {
                return ResponseEntity.ok(Map.of("status", "success", "report", "Chưa có dữ liệu hóa đơn để phân tích."));
            }

            // Lấy thông tin tháng/năm mới nhất có trong DB
            Bill theLatest = allBills.get(0);
            int latestYear = theLatest.getYear();
            int latestMonth = theLatest.getMonth();

            // Tính toán mức tiêu thụ trung bình của toàn bộ khu trọ trong tháng mới nhất (để tìm Outlier)
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

            // Group bills by Room ID để so sánh với tháng trước (Time-series)
            Map<Long, List<Bill>> billsByRoom = allBills.stream()
                    .collect(Collectors.groupingBy(b -> b.getContract().getRoom().getId()));
            
            List<Map<String, Object>> anomalies = new ArrayList<>();

            for (Map.Entry<Long, List<Bill>> entry : billsByRoom.entrySet()) {
                List<Bill> roomBills = entry.getValue();
                Bill latestBill = roomBills.stream()
                        .filter(b -> b.getYear() == latestYear && b.getMonth() == latestMonth)
                        .findFirst().orElse(null);
                
                if (latestBill == null) continue;

                int currElec = (latestBill.getNewElecIndex() != null && latestBill.getOldElecIndex() != null) ? (latestBill.getNewElecIndex() - latestBill.getOldElecIndex()) : 0;
                int currWater = (latestBill.getNewWaterIndex() != null && latestBill.getOldWaterIndex() != null) ? (latestBill.getNewWaterIndex() - latestBill.getOldWaterIndex()) : 0;

                boolean isAnomaly = false;
                Map<String, Object> anomalyData = new HashMap<>();
                anomalyData.put("roomName", latestBill.getContract().getRoom().getName());
                anomalyData.put("avgElecSystem", Math.round(avgElec));
                anomalyData.put("avgWaterSystem", Math.round(avgWater));

                // 1. So sánh với CHÍNH NÓ tháng trước (Time-series)
                if (roomBills.size() >= 2) {
                    // Tìm bill của tháng ngay trước đó (ví dụ: month-1 hoặc year-1 month 12)
                    // Ở đây lấy đơn giản là index 1 vì đã sort Desc, nhưng có thể bị lệch nếu thiếu tháng.
                    // Tuy nhiên với nghiệp vụ trọ thường bill ra hàng tháng nên index 1 là tin cậy.
                    Bill prevBill = roomBills.get(1); 
                    int prevElec = (prevBill.getNewElecIndex() != null && prevBill.getOldElecIndex() != null) ? (prevBill.getNewElecIndex() - prevBill.getOldElecIndex()) : 0;
                    int prevWater = (prevBill.getNewWaterIndex() != null && prevBill.getOldWaterIndex() != null) ? (prevBill.getNewWaterIndex() - prevBill.getOldWaterIndex()) : 0;

                    if (prevElec > 0 && currElec >= prevElec * 1.35) {
                        anomalyData.put("electricityTimeAnomaly", String.format("Tăng %d%% so với tháng trước (Từ %d lên %d kWh)", ((currElec - prevElec) * 100 / prevElec), prevElec, currElec));
                        isAnomaly = true;
                    }
                    if (prevWater > 0 && currWater >= prevWater * 1.35) {
                        anomalyData.put("waterTimeAnomaly", String.format("Tăng %d%% so với tháng trước (Từ %d lên %d m3)", ((currWater - prevWater) * 100 / prevWater), prevWater, currWater));
                        isAnomaly = true;
                    }
                }

                // 2. So sánh với MẶT BẰNG CHUNG tòa nhà (Cross-sectional Outlier)
                // Ngưỡng: Điện 2.0x Avg, Nước 1.5x Avg
                if (avgElec > 0 && currElec >= avgElec * 2.0) {
                    anomalyData.put("electricityOutlier", String.format("Vượt 200%% mức trung bình tòa nhà (%d so với trung bình %d kWh)", currElec, (int)avgElec));
                    isAnomaly = true;
                }
                if (avgWater > 0 && currWater >= avgWater * 1.5) {
                    anomalyData.put("waterOutlier", String.format("Vượt 150%% mức trung bình tòa nhà (%d so với trung bình %d m3)", currWater, (int)avgWater));
                    isAnomaly = true;
                }
                
                if (isAnomaly) {
                    anomalies.add(anomalyData);
                }
            }

            if (anomalies.isEmpty()) {
                return ResponseEntity.ok(Map.of("status", "success", "report", "✅ Hệ thống không phát hiện dấu hiệu bất thường nào. Lượng tiêu thụ điện nước của các phòng đều nằm trong ngưỡng ổn định so với tháng trước và mặt bằng chung của tòa nhà."));
            }

            String anomaliesJson = objectMapper.writeValueAsString(anomalies);
            String report = anomalyAi.generateAnomalyReport(anomaliesJson);
            
            // Clean markdown blocks
            report = report.replace("```markdown", "").replace("```", "").trim();

            return ResponseEntity.ok(Map.of("status", "success", "report", report));
        } catch(Throwable t) {
            System.err.println("❌ [AI ANOMALY ERROR] " + t.getMessage());
            return ResponseEntity.status(503).body(Map.of(
                "status", "error", 
                "message", "Dịch vụ AI phân tích đang bận (503). Vui lòng thử lại sau giây lát."
            ));
        }
    }

    @PostMapping("/actions/send-reminders")
    public ResponseEntity<?> sendReminders(@Valid @RequestBody @NotEmpty List<AiReminderApprovalRequest> approvedReminders,
                                           @AuthenticationPrincipal UserPrincipal currentUser) {
        try {
            int count = 0;
            for (AiReminderApprovalRequest reminder : approvedReminders) {
                Long tenantId = reminder.getTenantId();
                Long billId = reminder.getBillId();
                String message = reminder.getDraftedMessage();
                String roomName = reminder.getRoomName();

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
                }
            }
            return ResponseEntity.ok(Map.of("status", "success", "message", "Đã gửi thông báo thành công cho " + count + " phòng!"));
        } catch (Exception e) {
            System.err.println("❌ [AI REMINDER ERROR] " + e.getMessage());
            return ResponseEntity.status(503).body(Map.of(
                "status", "error", 
                "message", "Dịch vụ AI soạn tin nhắn đang bận (503). Vui lòng thử lại sau giây lát."
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
    public ResponseEntity<?> generateRoomDescription(@Valid @RequestBody AiRoomDescriptionRequest request) {
        String prompt = request.getPrompt();
        if (prompt == null || prompt.trim().isEmpty()) {
            return ResponseEntity.badRequest().body(Map.of("status", "error", "message", "Vui lòng cung cấp thông tin phòng"));
        }

        try {
            String aiPrompt = String.format(
                "Bạn là chuyên gia viết nội dung cho website cho thuê phòng trọ. " +
                "Hãy viết một đoạn mô tả phòng trọ hấp dẫn, ngắn gọn (3-5 câu), bằng tiếng Việt, " +
                "dựa trên thông tin sau. Chỉ trả về nội dung mô tả, KHÔNG thêm tiêu đề hay giải thích gì khác.\n\n" +
                "Thông tin phòng: %s", prompt);

            String description = geminiChatModel.generate(aiPrompt);
            return ResponseEntity.ok(Map.of("description", description));
        } catch (Throwable t) {
            System.err.println("Lỗi AI generate description: " + t.getMessage());
            return ResponseEntity.status(503).body(Map.of(
                "status", "error", 
                "message", "Dịch vụ AI đang bận. Không thể tạo mô tả lúc này. Vui lòng thử lại sau."
            ));
        }
    }

    @PostMapping("/suggest-room-price")
    public ResponseEntity<?> suggestRoomPrice(
            @Valid @RequestBody AiSuggestRoomPriceRequest request,
            @AuthenticationPrincipal UserPrincipal currentUser
    ) {
        long startTime = System.currentTimeMillis();
        String district = request.getDistrict();
        String city = request.getCity();
        Double area = request.getArea();
        String type = request.getType();
        List<String> amenities = request.getAmenities();

        String amenitiesStr = (amenities != null && !amenities.isEmpty()) ? String.join(", ", amenities) : "Không có";
        
        // Tạo câu hỏi chuẩn hóa để tìm trong Cache
        String standardizedQuestion = String.format("PRICE_SUGGEST:%s:%s:%s:%.0f", city, district, type, area);
        String rawQueryForLog = String.format("Gợi ý giá phòng %s, diện tích %.1f m2 tại Quận %s, %s.", type, area, district, city);

        // 1. KIỂM TRA CACHE TRƯỚC (Để tiết kiệm Token)
        String cachedResponse = aiOrchestratorService.searchFaq(standardizedQuestion);
        if (cachedResponse != null) {
            try {
                System.out.println("⚡ [PRICE CACHE HIT] Reusing suggestion for: " + standardizedQuestion);
                saveActionLog(userIdFrom(currentUser), roleFrom(currentUser), rawQueryForLog, "SUGGEST_PRICE", 1.0, false, startTime, true);
                return ResponseEntity.ok(objectMapper.readValue(cachedResponse, Map.class));
            } catch (Exception e) {
                System.err.println("Lỗi parse cache: " + e.getMessage());
            }
        }

        try {
            // 2. NẾU KHÔNG CÓ TRONG CACHE -> GỌI GEMINI
            String aiPrompt = String.format(
                "Gợi ý KHOẢNG GIÁ thuê (VND) phòng %s, %.1f m2 tại Q.%s, %s. Tiện ích: %s.\n" +
                "Trả về JSON: {\"suggestion\": \"Khoảng giá\", \"reason\": \"Lý do ngắn gọn\"}. Chỉ trả về JSON.",
                type, area, district, city, amenitiesStr
            );

            String response = geminiChatModel.generate(aiPrompt);
            response = response.replace("```json", "").replace("```", "").trim();
            
            // 3. LƯU VÀO CACHE FAQ (Dùng làm tri thức cho lần sau)
            aiOrchestratorService.addFaq(standardizedQuestion, response);

            // 4. LƯU LOG
            saveActionLog(userIdFrom(currentUser), roleFrom(currentUser), rawQueryForLog, "SUGGEST_PRICE", 1.0, false, startTime, true);

            return ResponseEntity.ok(objectMapper.readValue(response, Map.class));
        } catch (Throwable t) {
            System.err.println("❌ [AI PRICE SUGGEST ERROR] " + t.getMessage());
            saveActionLog(userIdFrom(currentUser), roleFrom(currentUser), rawQueryForLog, "SUGGEST_PRICE", 0.0, true, startTime, false);

            return ResponseEntity.status(503).body(Map.of(
                "status", "error", 
                "message", "Dịch vụ AI đang bận. Không thể đưa ra gợi ý lúc này."
            ));
        }
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
}

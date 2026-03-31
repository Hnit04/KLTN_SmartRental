package iuh.se.kltn.backend.modules.ai.controller;

import iuh.se.kltn.backend.modules.ai.service.AiOrchestratorService;
import iuh.se.kltn.backend.modules.ai.service.SmartRentalAi;
import dev.langchain4j.model.chat.ChatLanguageModel;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Map;
import java.util.Collection;
import iuh.se.kltn.backend.common.security.UserPrincipal;
import org.springframework.security.core.annotation.AuthenticationPrincipal;

@RestController
@RequestMapping("/api/ai")
public class AiController {

    @Autowired
    private SmartRentalAi smartRentalAi;

    @Autowired
    private AiOrchestratorService aiOrchestratorService;

    @Autowired
    private ChatLanguageModel geminiChatModel;


    @PostMapping("/chat")
    public ResponseEntity<?> chatWithAi(
            @RequestBody Map<String, String> request,
            @AuthenticationPrincipal UserPrincipal currentUser
    ) {
        String message = request.get("message");
        String sessionId = request.getOrDefault("sessionId", "default-user");
        
        String roleStr = "GUEST (Khách vãng lai chưa đăng nhập)";
        String userName = "Khách hàng";
        
        if (currentUser != null) {
            String roleRaw = currentUser.getAuthorities().iterator().next().getAuthority();
            roleStr = roleRaw.replace("ROLE_", ""); // TENANT hoặc LANDLORD hoặc ADMIN
            userName = currentUser.getUsername(); // Hoặc fullname
        }

        String response = smartRentalAi.chat(sessionId, roleStr, userName, message);
        
        return ResponseEntity.ok(Map.of(
                "status", "success",
                "sessionId", sessionId,
                "reply", response
        ));
    }


    @PostMapping("/query-data")
    public ResponseEntity<?> queryDataWithAi(
            @RequestBody Map<String, String> request,
            // Lấy thông tin người dùng đang đăng nhập từ Token
            @AuthenticationPrincipal UserPrincipal currentUser
    ) {
        String question = request.get("question");

        if (question == null || question.trim().isEmpty()) {
            return ResponseEntity.badRequest().body(Map.of("status", "error", "message", "Câu hỏi không được để trống"));
        }

        // Nếu người dùng chưa đăng nhập (Call API không có JWT Token)
        if (currentUser == null) {
            return ResponseEntity.status(401).body(Map.of("status", "error", "message", "Vui lòng đăng nhập để tra cứu số liệu."));
        }

        // Bóc tách Role (Ví dụ từ "ROLE_LANDLORD" thành "LANDLORD")
        String role = currentUser.getAuthorities().iterator().next().getAuthority().replace("ROLE_", "");
        Long userId = currentUser.getId();

        System.out.println("👤 Khách đang tra cứu: ID=" + userId + ", Role=" + role);

        Object result = aiOrchestratorService.processDataQuery(question, role, userId);

        return ResponseEntity.ok(Map.of(
                "status", "success",
                "question", question,
                "data", result
        ));
    }
    // Admin: Lấy thống kê AI NLP (tất cả cache SQL)
    @GetMapping("/admin/analytics")
    public ResponseEntity<?> getAiAnalytics() {
        return ResponseEntity.ok(aiOrchestratorService.getAnalytics());
    }

    // Admin: Update câu SQL bị AI sinh sai
    @PutMapping("/admin/cache/{id}")
    public ResponseEntity<?> updateCache(@PathVariable Long id, @RequestBody Map<String, String> request) {
        String newSql = request.get("generatedSql");
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
    public ResponseEntity<?> generateRoomDescription(@RequestBody Map<String, String> request) {
        String prompt = request.get("prompt");
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
        } catch (Exception e) {
            System.err.println("Lỗi AI generate description: " + e.getMessage());
            return ResponseEntity.status(500).body(Map.of("status", "error", "message", "Không thể tạo mô tả. Vui lòng thử lại."));
        }
    }
}
package iuh.se.kltn.backend.modules.ai.controller;

import iuh.se.kltn.backend.modules.ai.service.AiOrchestratorService;
import iuh.se.kltn.backend.modules.ai.service.SmartRentalAi;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Map;
import iuh.se.kltn.backend.common.security.UserPrincipal;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
@RestController
@RequestMapping("/api/ai")
public class AiController {

    @Autowired
    private SmartRentalAi smartRentalAi;

    @Autowired
    private AiOrchestratorService aiOrchestratorService;


    @PostMapping("/chat")
    public ResponseEntity<?> chatWithAi(@RequestBody Map<String, String> request) {
        String message = request.get("message");
        String sessionId = request.getOrDefault("sessionId", "default-user");
        String response = smartRentalAi.chat(sessionId, message);
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
}
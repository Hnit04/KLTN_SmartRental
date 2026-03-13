package iuh.se.kltn.backend.modules.ai.controller;

import iuh.se.kltn.backend.modules.ai.service.AiOrchestratorService;
import iuh.se.kltn.backend.modules.ai.service.SmartRentalAi;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

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

        String response = smartRentalAi.chat(message);

        return ResponseEntity.ok(Map.of(
                "status", "success",
                "reply", response
        ));
    }


    @PostMapping("/query-data")
    public ResponseEntity<?> queryDataWithAi(@RequestBody Map<String, String> request) {
        String question = request.get("question");

        if (question == null || question.trim().isEmpty()) {
            return ResponseEntity.badRequest().body(Map.of(
                    "status", "error",
                    "message", "Câu hỏi không được để trống"
            ));
        }

        Object result = aiOrchestratorService.processDataQuery(question);

        return ResponseEntity.ok(Map.of(
                "status", "success",
                "question", question,
                "data", result
        ));
    }
}
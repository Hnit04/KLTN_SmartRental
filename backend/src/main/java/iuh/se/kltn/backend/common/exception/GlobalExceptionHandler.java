package iuh.se.kltn.backend.common.exception;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;

import java.util.Map;

@RestControllerAdvice
public class GlobalExceptionHandler {

    @ExceptionHandler(ModerationException.class)
    public ResponseEntity<?> handleModerationException(ModerationException ex) {
        return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                .body(Map.of(
                        "status", "error",
                        "type", "MODERATION_FAILED",
                        "message", ex.getMessage()
                ));
    }

    @ExceptionHandler(RuntimeException.class)
    public ResponseEntity<?> handleRuntimeException(RuntimeException ex) {
        String message = ex.getMessage() != null ? ex.getMessage() : "Lỗi hệ thống không xác định";
        
        // 🛡️ Xử lý đặc biệt cho lỗi AI quá tải (Gemini 503)
        if (message.contains("503") || message.contains("demand") || message.contains("UNAVAILABLE")) {
            System.err.println("🛡️ [GLOBAL AI FALLBACK] Phát hiện lỗi AI quá tải: " + message);
            return ResponseEntity.status(HttpStatus.SERVICE_UNAVAILABLE)
                    .body(Map.of(
                            "status", "error",
                            "message", "Dịch vụ AI hiện đang quá tải. Vui lòng thử lại sau giây lát. 🙏"
                    ));
        }

        System.err.println("SERVER ERROR: " + message);
        ex.printStackTrace();
        return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                .body(Map.of(
                        "status", "error",
                        "message", message
                ));
    }
}

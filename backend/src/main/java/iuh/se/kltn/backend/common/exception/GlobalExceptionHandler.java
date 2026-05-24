package iuh.se.kltn.backend.common.exception;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;

import java.util.Map;
import java.util.stream.Collectors;

import jakarta.validation.ConstraintViolationException;
import org.springframework.web.bind.MethodArgumentNotValidException;

@RestControllerAdvice
public class GlobalExceptionHandler {

    @ExceptionHandler(MethodArgumentNotValidException.class)
    public ResponseEntity<?> handleValidationException(MethodArgumentNotValidException ex) {
        String message = ex.getBindingResult().getFieldErrors().stream()
                .map(error -> error.getField() + ": " + error.getDefaultMessage())
                .collect(Collectors.joining(", "));
        return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                .body(Map.of(
                        "status", "error",
                        "message", "Dữ liệu không hợp lệ: " + message
                ));
    }

    @ExceptionHandler(ConstraintViolationException.class)
    public ResponseEntity<?> handleConstraintViolationException(ConstraintViolationException ex) {
        String message = ex.getConstraintViolations().stream()
                .map(violation -> {
                    String path = violation.getPropertyPath() != null ? violation.getPropertyPath().toString() : "request";
                    return path + ": " + violation.getMessage();
                })
                .collect(Collectors.joining(", "));

        return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                .body(Map.of(
                        "status", "error",
                        "message", "Dữ liệu không hợp lệ: " + message
                ));
    }

    @ExceptionHandler(iuh.se.kltn.backend.modules.subscription.service.VipSubscriptionService.VipLimitExceededException.class)
    public ResponseEntity<?> handleVipLimitException(
            iuh.se.kltn.backend.modules.subscription.service.VipSubscriptionService.VipLimitExceededException ex) {
        return ResponseEntity.status(HttpStatus.FORBIDDEN)
                .body(Map.of(
                        "status", "error",
                        "type", "VIP_LIMIT_EXCEEDED",
                        "message", ex.getMessage(),
                        "currentTier", ex.getCurrentTier(),
                        "limitType", ex.getLimitType(),
                        "currentCount", ex.getCurrentCount(),
                        "maxAllowed", ex.getMaxAllowed()
                ));
    }

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

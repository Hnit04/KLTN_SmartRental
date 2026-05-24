package iuh.se.kltn.backend.common.exception;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.ConstraintViolationException;
import org.hibernate.StaleObjectStateException;
import org.springframework.dao.OptimisticLockingFailureException;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.orm.ObjectOptimisticLockingFailureException;
import org.springframework.transaction.TransactionSystemException;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;

import jakarta.persistence.OptimisticLockException;
import java.time.LocalDateTime;
import java.util.Map;
import java.util.stream.Collectors;

@RestControllerAdvice
public class GlobalExceptionHandler {

    private ApiErrorResponse buildErrorResponse(HttpStatus status, String code, String message, HttpServletRequest request) {
        return ApiErrorResponse.builder()
                .timestamp(LocalDateTime.now())
                .status(status.value())
                .code(code)
                .message(message)
                .path(request.getRequestURI())
                .build();
    }

    @ExceptionHandler(MethodArgumentNotValidException.class)
    public ResponseEntity<ApiErrorResponse> handleValidationException(MethodArgumentNotValidException ex, HttpServletRequest request) {
        String message = ex.getBindingResult().getFieldErrors().stream()
                .map(error -> error.getField() + ": " + error.getDefaultMessage())
                .collect(Collectors.joining(", "));
        return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                .body(buildErrorResponse(HttpStatus.BAD_REQUEST, "VALIDATION_ERROR", "Dữ liệu không hợp lệ: " + message, request));
    }

    @ExceptionHandler(ConstraintViolationException.class)
    public ResponseEntity<ApiErrorResponse> handleConstraintViolationException(ConstraintViolationException ex, HttpServletRequest request) {
        String message = ex.getConstraintViolations().stream()
                .map(violation -> {
                    String path = violation.getPropertyPath() != null ? violation.getPropertyPath().toString() : "request";
                    return path + ": " + violation.getMessage();
                })
                .collect(Collectors.joining(", "));
        return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                .body(buildErrorResponse(HttpStatus.BAD_REQUEST, "VALIDATION_ERROR", "Dữ liệu không hợp lệ: " + message, request));
    }

    @ExceptionHandler(iuh.se.kltn.backend.modules.subscription.service.VipSubscriptionService.VipLimitExceededException.class)
    public ResponseEntity<?> handleVipLimitException(
            iuh.se.kltn.backend.modules.subscription.service.VipSubscriptionService.VipLimitExceededException ex, HttpServletRequest request) {
        // Giữ nguyên map cho FE đang dùng (hoặc có thể dùng ApiErrorResponse nếu muốn, nhưng map an toàn hơn nếu FE đang parse các trường limit)
        return ResponseEntity.status(HttpStatus.FORBIDDEN)
                .body(Map.of(
                        "timestamp", LocalDateTime.now(),
                        "status", HttpStatus.FORBIDDEN.value(),
                        "code", "VIP_LIMIT_EXCEEDED",
                        "message", ex.getMessage(),
                        "path", request.getRequestURI(),
                        "currentTier", ex.getCurrentTier(),
                        "limitType", ex.getLimitType(),
                        "currentCount", ex.getCurrentCount(),
                        "maxAllowed", ex.getMaxAllowed()
                ));
    }

    @ExceptionHandler(ModerationException.class)
    public ResponseEntity<ApiErrorResponse> handleModerationException(ModerationException ex, HttpServletRequest request) {
        return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                .body(buildErrorResponse(HttpStatus.BAD_REQUEST, "MODERATION_FAILED", ex.getMessage(), request));
    }

    // 🚀 OPTIMISTIC LOCKING EXCEPTIONS
    @ExceptionHandler({
        ObjectOptimisticLockingFailureException.class, 
        OptimisticLockException.class, 
        StaleObjectStateException.class,
        OptimisticLockingFailureException.class,
        ResourceVersionConflictException.class
    })
    public ResponseEntity<ApiErrorResponse> handleOptimisticLockingException(Exception ex, HttpServletRequest request) {
        String message = "Dữ liệu đã được thay đổi ở nơi khác. Vui lòng tải lại trước khi lưu.";
        if (ex instanceof ResourceVersionConflictException) {
            message = ex.getMessage();
        }
        return ResponseEntity.status(HttpStatus.CONFLICT)
                .body(buildErrorResponse(HttpStatus.CONFLICT, "CONFLICT_RESOURCE_VERSION", message, request));
    }

    @ExceptionHandler(ResourceNotFoundException.class)
    public ResponseEntity<ApiErrorResponse> handleResourceNotFoundException(ResourceNotFoundException ex, HttpServletRequest request) {
        return ResponseEntity.status(HttpStatus.NOT_FOUND)
                .body(buildErrorResponse(HttpStatus.NOT_FOUND, "NOT_FOUND", ex.getMessage(), request));
    }

    @ExceptionHandler(TransactionSystemException.class)
    public ResponseEntity<ApiErrorResponse> handleTransactionSystemException(TransactionSystemException ex, HttpServletRequest request) {
        Throwable cause = ex.getRootCause();
        if (cause instanceof ConstraintViolationException) {
            ConstraintViolationException cve = (ConstraintViolationException) cause;
            String message = cve.getConstraintViolations().stream()
                    .map(violation -> {
                        String path = violation.getPropertyPath() != null ? violation.getPropertyPath().toString() : "request";
                        return path + ": " + violation.getMessage();
                    })
                    .collect(Collectors.joining(", "));
            return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                    .body(buildErrorResponse(HttpStatus.BAD_REQUEST, "VALIDATION_ERROR", "Lỗi dữ liệu (JPA): " + message, request));
        }
        return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                .body(buildErrorResponse(HttpStatus.INTERNAL_SERVER_ERROR, "TRANSACTION_ERROR", "Lỗi lưu dữ liệu: " + (cause != null ? cause.getMessage() : ex.getMessage()), request));
    }

    @ExceptionHandler(RuntimeException.class)
    public ResponseEntity<ApiErrorResponse> handleRuntimeException(RuntimeException ex, HttpServletRequest request) {
        String message = ex.getMessage() != null ? ex.getMessage() : "Lỗi hệ thống không xác định";
        
        // 🛡️ Xử lý đặc biệt cho lỗi AI quá tải (Gemini 503)
        if (message.contains("503") || message.contains("demand") || message.contains("UNAVAILABLE")) {
            System.err.println("🛡️ [GLOBAL AI FALLBACK] Phát hiện lỗi AI quá tải: " + message);
            return ResponseEntity.status(HttpStatus.SERVICE_UNAVAILABLE)
                    .body(buildErrorResponse(HttpStatus.SERVICE_UNAVAILABLE, "AI_SERVICE_UNAVAILABLE", "Dịch vụ AI hiện đang quá tải. Vui lòng thử lại sau giây lát. 🙏", request));
        }

        System.err.println("SERVER ERROR: " + message);
        ex.printStackTrace();
        return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                .body(buildErrorResponse(HttpStatus.BAD_REQUEST, "INTERNAL_ERROR", message, request));
    }
}

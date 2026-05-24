package iuh.se.kltn.backend.common.exception;

public class ResourceVersionConflictException extends RuntimeException {
    public ResourceVersionConflictException(String message) {
        super(message);
    }
}

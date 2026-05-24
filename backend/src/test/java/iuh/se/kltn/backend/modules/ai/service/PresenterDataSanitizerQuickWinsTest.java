package iuh.se.kltn.backend.modules.ai.service;

import org.junit.jupiter.api.Test;

import java.util.List;
import java.util.Map;

import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

class PresenterDataSanitizerQuickWinsTest {

    private final PresenterDataSanitizer sanitizer = new PresenterDataSanitizer();

    @Test
    void viewAppointmentShouldHideMeetingLinkForGuestRole() {
        List<Map<String, Object>> rows = List.of(
                Map.of(
                        "room_name", "P101",
                        "meet_time", "2026-05-24T10:00:00",
                        "status", "APPROVED",
                        "meeting_link", "https://meet.example.com/abc"
                )
        );

        List<Map<String, Object>> sanitized = sanitizer.sanitize("VIEW_APPOINTMENT", "GUEST", rows);
        assertFalse(sanitized.get(0).containsKey("meeting_link"));
    }

    @Test
    void viewAppointmentShouldAllowMeetingLinkForTenantRole() {
        List<Map<String, Object>> rows = List.of(
                Map.of(
                        "room_name", "P101",
                        "meet_time", "2026-05-24T10:00:00",
                        "status", "APPROVED",
                        "meeting_link", "https://meet.example.com/abc"
                )
        );

        List<Map<String, Object>> sanitized = sanitizer.sanitize("VIEW_APPOINTMENT", "TENANT", rows);
        assertTrue(sanitized.get(0).containsKey("meeting_link"));
    }

    @Test
    void viewRiskShouldKeepRiskFieldsAndDropSensitiveFields() {
        List<Map<String, Object>> rows = List.of(
                Map.of(
                        "room_name", "P101",
                        "risk_level", "HIGH",
                        "days_remaining", 7,
                        "phone_number", "0909123456"
                )
        );

        List<Map<String, Object>> sanitized = sanitizer.sanitize("VIEW_RISK", "LANDLORD", rows);
        assertTrue(sanitized.get(0).containsKey("risk_level"));
        assertFalse(sanitized.get(0).containsKey("phone_number"));
    }
}

package iuh.se.kltn.backend.modules.ai.service;

import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.springframework.test.util.ReflectionTestUtils;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

class AiOrchestratorServicePresenterSanitizationQuickWinsTest {

    @Test
    void viewDebtorsShouldNotSendPhoneNumberToPresenterPrompt() {
        AiOrchestratorService service = new AiOrchestratorService();
        DataPresenterAi presenterAi = mock(DataPresenterAi.class);
        TemplateResponseService templateResponseService = mock(TemplateResponseService.class);

        ReflectionTestUtils.setField(service, "presenterDataSanitizer", new PresenterDataSanitizer());
        ReflectionTestUtils.setField(service, "dataPresenterAi", presenterAi);
        ReflectionTestUtils.setField(service, "templateResponseService", templateResponseService);

        when(presenterAi.generateNaturalResponse(anyString(), anyString(), anyString())).thenReturn("ok");

        Map<String, Object> row = new HashMap<>();
        row.put("tenant_name", "Nguyen Van A");
        row.put("room_name", "P101");
        row.put("total_amount", 2_500_000);
        row.put("phone_number", "0909123456");

        List<Map<String, Object>> results = new ArrayList<>();
        results.add(row);

        Object response = ReflectionTestUtils.invokeMethod(
                service,
                "buildStructuredResponse",
                "xem danh sach no",
                "LANDLORD",
                "VIEW_DEBTORS",
                "RULE",
                results,
                false,
                false
        );

        assertEquals("ok", response);

        ArgumentCaptor<String> rawDataCaptor = ArgumentCaptor.forClass(String.class);
        verify(presenterAi).generateNaturalResponse(eq("xem danh sach no"), rawDataCaptor.capture(), eq("LANDLORD"));

        String presenterPromptData = rawDataCaptor.getValue();
        assertFalse(presenterPromptData.contains("phone_number"));
        assertFalse(presenterPromptData.contains("0909123456"));
    }
}

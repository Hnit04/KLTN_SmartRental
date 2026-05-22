/*
 * Decompiled with CFR 0.152.
 * 
 * Could not load the following classes:
 *  iuh.se.kltn.backend.modules.ai.service.PresenterDataSanitizer
 *  org.junit.jupiter.api.Assertions
 *  org.junit.jupiter.api.BeforeEach
 *  org.junit.jupiter.api.Test
 */
package iuh.se.kltn.backend.modules.ai.service;

import iuh.se.kltn.backend.modules.ai.service.PresenterDataSanitizer;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import org.junit.jupiter.api.Assertions;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

class PresenterDataSanitizerTest {
    private PresenterDataSanitizer sanitizer;

    PresenterDataSanitizerTest() {
    }

    @BeforeEach
    void setUp() {
        this.sanitizer = new PresenterDataSanitizer();
    }

    @Test
    void testSanitize_ViewDebtors_KeepOnlyAllowedFields() {
        ArrayList mockData = new ArrayList();
        HashMap<String, Object> row = new HashMap<String, Object>();
        row.put("tenant_name", "Nguyen Van A");
        row.put("room_name", "P101");
        row.put("total_amount", 5000000.0);
        row.put("phone_number", "0912345678");
        row.put("email", "a@gmail.com");
        mockData.add(row);
        List result = this.sanitizer.sanitize("VIEW_DEBTORS", "LANDLORD", mockData);
        Assertions.assertEquals((int)1, (int)result.size());
        Map safeRow = (Map)result.get(0);
        Assertions.assertTrue((boolean)safeRow.containsKey("tenant_name"));
        Assertions.assertTrue((boolean)safeRow.containsKey("room_name"));
        Assertions.assertTrue((boolean)safeRow.containsKey("total_amount"));
        Assertions.assertFalse((boolean)safeRow.containsKey("phone_number"));
        Assertions.assertFalse((boolean)safeRow.containsKey("email"));
    }

    @Test
    void testSanitize_Default_RemovesPII() {
        ArrayList mockData = new ArrayList();
        HashMap<String, String> row = new HashMap<String, String>();
        row.put("some_random_field", "value");
        row.put("phone_number", "0912345678");
        row.put("meeting_link", "https://meet.google.com/xxx");
        mockData.add(row);
        List result = this.sanitizer.sanitize("UNKNOWN_INTENT", "TENANT", mockData);
        Assertions.assertEquals((int)1, (int)result.size());
        Map safeRow = (Map)result.get(0);
        Assertions.assertTrue((boolean)safeRow.containsKey("some_random_field"));
        Assertions.assertFalse((boolean)safeRow.containsKey("phone_number"));
        Assertions.assertFalse((boolean)safeRow.containsKey("meeting_link"));
    }

    @Test
    void testSanitize_NullInput_ReturnsNull() {
        Assertions.assertNull((Object)this.sanitizer.sanitize("VIEW_DEBTORS", "LANDLORD", null));
    }
}

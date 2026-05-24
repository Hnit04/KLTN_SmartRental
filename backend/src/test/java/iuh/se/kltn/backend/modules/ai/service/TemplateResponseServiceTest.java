/*
 * Decompiled with CFR 0.152.
 * 
 * Could not load the following classes:
 *  iuh.se.kltn.backend.modules.ai.dto.AiRawResult
 *  iuh.se.kltn.backend.modules.ai.service.TemplateResponseService
 *  org.junit.jupiter.api.Assertions
 *  org.junit.jupiter.api.BeforeEach
 *  org.junit.jupiter.api.Test
 */
package iuh.se.kltn.backend.modules.ai.service;

import iuh.se.kltn.backend.modules.ai.dto.AiRawResult;
import iuh.se.kltn.backend.modules.ai.service.TemplateResponseService;
import java.util.ArrayList;
import java.util.HashMap;
import org.junit.jupiter.api.Assertions;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

class TemplateResponseServiceTest {
    private TemplateResponseService service;

    TemplateResponseServiceTest() {
    }

    @BeforeEach
    void setUp() {
        this.service = new TemplateResponseService();
    }

    @Test
    void formatViewDebtors_UsesTenantNameNotFullName() {
        ArrayList rows = new ArrayList();
        HashMap<String, Object> row = new HashMap<String, Object>();
        row.put("tenant_name", "Nguyen Van A");
        row.put("room_name", "P101");
        row.put("total_amount", 5000000);
        rows.add(row);
        AiRawResult result = AiRawResult.builder().intent("VIEW_DEBTORS").rows(rows).totalCount(1).build();
        String response = this.service.format(result);
        Assertions.assertTrue((boolean)response.contains("Nguyen Van A"));
    }

    @Test
    void formatSearchRoom_GeneratesRoomCard() {
        ArrayList rows = new ArrayList();
        HashMap<String, Object> row = new HashMap<String, Object>();
        row.put("id", 1L);
        row.put("name", "Studio VIP");
        row.put("price", 4000000);
        rows.add(row);
        AiRawResult result = AiRawResult.builder().intent("SEARCH_ROOM").rows(rows).totalCount(1).build();
        String response = this.service.format(result);
        Assertions.assertTrue((boolean)response.contains("Studio VIP"));
        Assertions.assertTrue((boolean)response.contains("tr"));
    }

    @Test
    void formatEmptyResult_ReturnsNotFound() {
        AiRawResult result = AiRawResult.builder().intent("SEARCH_ROOM").rows(new ArrayList()).totalCount(0).build();
        String response = this.service.format(result);
        Assertions.assertTrue((boolean)response.contains("kh\u00f4ng t\u00ecm th\u1ea5y"));
    }
}

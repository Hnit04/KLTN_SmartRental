/*
 * Decompiled with CFR 0.152.
 * 
 * Could not load the following classes:
 *  iuh.se.kltn.backend.modules.ai.dto.RuleIntentResult
 *  iuh.se.kltn.backend.modules.ai.enums.SystemIntent
 *  iuh.se.kltn.backend.modules.ai.service.RuleIntentRouter
 *  org.junit.jupiter.api.Assertions
 *  org.junit.jupiter.api.BeforeEach
 *  org.junit.jupiter.api.Test
 */
package iuh.se.kltn.backend.modules.ai.service;

import iuh.se.kltn.backend.modules.ai.dto.RuleIntentResult;
import iuh.se.kltn.backend.modules.ai.enums.SystemIntent;
import iuh.se.kltn.backend.modules.ai.service.RuleIntentRouter;
import java.util.Optional;
import org.junit.jupiter.api.Assertions;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

class RuleIntentRouterTest {
    private RuleIntentRouter router;

    RuleIntentRouterTest() {
    }

    @BeforeEach
    void setUp() {
        this.router = new RuleIntentRouter();
    }

    @Test
    void classify_DepositPolicy() {
        this.assertIntent("ti\u1ec1n c\u1ecdc c\u00f3 \u0111\u01b0\u1ee3c ho\u00e0n kh\u00f4ng", "TENANT", SystemIntent.DEPOSIT_POLICY);
        this.assertIntent("khi n\u00e0o ho\u00e0n c\u1ecdc", "TENANT", SystemIntent.DEPOSIT_POLICY);
    }

    @Test
    void classify_PaymentGuide() {
        this.assertIntent("thanh to\u00e1n ti\u1ec1n ph\u00f2ng nh\u01b0 th\u1ebf n\u00e0o", "TENANT", SystemIntent.PAYMENT_GUIDE);
    }

    @Test
    void classify_ContractPolicy() {
        this.assertIntent("h\u1ee3p \u0111\u1ed3ng c\u00f3 \u0111i\u1ec1u kho\u1ea3n g\u00ec", "TENANT", SystemIntent.CONTRACT_POLICY);
    }

    @Test
    void classify_ViewBill() {
        this.assertIntent("h\u00f3a \u0111\u01a1n th\u00e1ng n\u00e0y", "TENANT", SystemIntent.VIEW_BILL);
        this.assertIntent("t\u1ed5ng thu h\u00f3a \u0111\u01a1n th\u00e1ng n\u00e0y", "LANDLORD", SystemIntent.VIEW_REVENUE);
    }

    @Test
    void classify_ViewDebtors() {
        this.assertIntent("kh\u00e1ch n\u00e0o ch\u01b0a \u0111\u00f3ng ti\u1ec1n", "LANDLORD", SystemIntent.VIEW_DEBTORS);
    }

    @Test
    void classify_SearchRoom() {
        this.assertIntent("c\u00f2n ph\u00f2ng tr\u1ed1ng kh\u00f4ng", "GUEST", SystemIntent.SEARCH_ROOM);
    }

    private void assertIntent(String question, String role, SystemIntent expectedIntent) {
        Optional result = this.router.classify(question, role);
        Assertions.assertTrue((boolean)result.isPresent(), (String)("Expected intent for question: " + question));
        Assertions.assertEquals((Object)expectedIntent, (Object)((RuleIntentResult)result.get()).intent());
    }
}

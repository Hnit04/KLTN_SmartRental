/*
 * Decompiled with CFR 0.152.
 * 
 * Could not load the following classes:
 *  org.springframework.stereotype.Component
 */
package iuh.se.kltn.backend.modules.ai.service;

import iuh.se.kltn.backend.modules.ai.dto.RuleIntentResult;
import iuh.se.kltn.backend.modules.ai.enums.SystemIntent;
import java.text.Normalizer;
import java.util.Optional;
import java.util.regex.Pattern;
import org.springframework.stereotype.Component;

@Component
public class RuleIntentRouter {
    private static final double RULE_ACCEPT_THRESHOLD = 0.85;

    public Optional<RuleIntentResult> classify(String question, String role) {
        if (question == null || question.isBlank()) {
            return Optional.empty();
        }
        String q = this.normalize(question);
        if (this.containsAny(q, "n\u1ee3", "ch\u01b0a tr\u1ea3", "ch\u01b0a \u0111\u00f3ng", "qu\u00e1 h\u1ea1n", "tr\u1ec5 h\u1ea1n", "c\u00f2n n\u1ee3", "n\u1ee3 ti\u1ec1n")) {
            if (this.containsAny(q, "kh\u00e1ch", "ai n\u1ee3", "danh s\u00e1ch n\u1ee3", "ph\u00f2ng n\u00e0o n\u1ee3", "ng\u01b0\u1eddi n\u1ee3")) {
                return Optional.of(RuleIntentResult.of(SystemIntent.VIEW_DEBTORS, 0.92));
            }
            if ("LANDLORD".equalsIgnoreCase(role)) {
                return Optional.of(RuleIntentResult.of(SystemIntent.VIEW_DEBTORS, 0.92));
            }
            return Optional.of(RuleIntentResult.of(SystemIntent.VIEW_DEBT, 0.93));
        }
        if (this.containsAny(q, "c\u1ecdc", "ti\u1ec1n c\u1ecdc", "ho\u00e0n c\u1ecdc", "m\u1ea5t c\u1ecdc", "l\u1ea5y l\u1ea1i c\u1ecdc") && this.containsAny(q, "ho\u00e0n", "l\u1ea5y l\u1ea1i", "m\u1ea5t", "quy \u0111\u1ecbnh", "ch\u00ednh s\u00e1ch", "x\u1eed l\u00fd", "ra sao", "nh\u01b0 th\u1ebf n\u00e0o", "c\u00f3 \u0111\u01b0\u1ee3c")) {
            return Optional.of(RuleIntentResult.of(SystemIntent.DEPOSIT_POLICY, 0.95));
        }
        if (this.containsAny(q, "thanh to\u00e1n", "tr\u1ea3 ti\u1ec1n", "\u0111\u00f3ng ti\u1ec1n") && this.containsAny(q, "nh\u01b0 th\u1ebf n\u00e0o", "ra sao", "c\u00e1ch n\u00e0o", "h\u01b0\u1edbng d\u1eabn", "quy \u0111\u1ecbnh", "ch\u00ednh s\u00e1ch")) {
            return Optional.of(RuleIntentResult.of(SystemIntent.PAYMENT_GUIDE, 0.95));
        }
        if (this.containsAny(q, "h\u1ee3p \u0111\u1ed3ng") && this.containsAny(q, "\u0111i\u1ec1u kho\u1ea3n", "quy \u0111\u1ecbnh", "ch\u00ednh s\u00e1ch", "nh\u01b0 th\u1ebf n\u00e0o", "ra sao", "b\u1eaft bu\u1ed9c")) {
            return Optional.of(RuleIntentResult.of(SystemIntent.CONTRACT_POLICY, 0.95));
        }
        if (this.containsAny(q, "h\u00f3a \u0111\u01a1n", "ho\u00e1 \u0111\u01a1n", "bill", "ti\u1ec1n ph\u00f2ng", "ti\u1ec1n thu\u00ea", "ti\u1ec1n \u0111i\u1ec7n", "ti\u1ec1n n\u01b0\u1edbc")) {
            if ("LANDLORD".equalsIgnoreCase(role)) {
                if (this.containsAny(q, "ch\u01b0a \u0111\u00f3ng", "c\u00f2n n\u1ee3", "qu\u00e1 h\u1ea1n", "n\u1ee3")) {
                    return Optional.of(RuleIntentResult.of(SystemIntent.VIEW_DEBTORS, 0.92));
                }
                if (this.containsAny(q, "doanh thu", "\u0111\u00e3 thu", "t\u1ed5ng ti\u1ec1n thu", "t\u1ed5ng thu")) {
                    return Optional.of(RuleIntentResult.of(SystemIntent.VIEW_REVENUE, 0.92));
                }
                return Optional.empty();
            }
            return Optional.of(RuleIntentResult.of(SystemIntent.VIEW_BILL, 0.92));
        }
        if (this.containsAny(q, "h\u1ee3p \u0111\u1ed3ng", "h\u1ebft h\u1ea1n", "gia h\u1ea1n", "ti\u1ec1n c\u1ecdc", "\u0111\u1eb7t c\u1ecdc", "c\u1ecdc")) {
            return Optional.of(RuleIntentResult.of(SystemIntent.VIEW_CONTRACT, 0.9));
        }
        if (this.containsAny(q, "l\u1ecbch h\u1eb9n", "l\u1ecbch xem ph\u00f2ng", "cu\u1ed9c h\u1eb9n", "h\u1eb9n xem")) {
            return Optional.of(RuleIntentResult.of(SystemIntent.VIEW_APPOINTMENT, 0.9));
        }
        if (this.containsAny(q, "doanh thu", "thu nh\u1eadp", "t\u1ed5ng ti\u1ec1n thu", "ti\u1ec1n \u0111\u00e3 thu", "b\u00e1o c\u00e1o t\u00e0i ch\u00ednh")) {
            return Optional.of(RuleIntentResult.of(SystemIntent.VIEW_REVENUE, 0.92));
        }
        if (this.containsAny(q, "kh\u00e1ch n\u1ee3", "ai ch\u01b0a \u0111\u00f3ng", "ph\u00f2ng ch\u01b0a \u0111\u00f3ng", "danh s\u00e1ch n\u1ee3")) {
            return Optional.of(RuleIntentResult.of(SystemIntent.VIEW_DEBTORS, 0.92));
        }
        if (this.containsAny(q, "t\u1ef7 l\u1ec7 l\u1ea5p \u0111\u1ea7y", "ph\u00f2ng tr\u1ed1ng c\u00f2n", "bao nhi\u00eau ph\u00f2ng tr\u1ed1ng", "occupancy", "ph\u00f2ng \u0111ang b\u1ea3o tr\u00ec")) {
            if ("GUEST".equalsIgnoreCase(role)) {
                return Optional.of(RuleIntentResult.of(SystemIntent.SEARCH_ROOM, 0.9));
            }
            return Optional.of(RuleIntentResult.of(SystemIntent.VIEW_OCCUPANCY, 0.9));
        }
        if (this.containsAny(q, "g\u1ea7n t\u00f4i", "g\u1ea7n \u0111\u00e2y", "g\u1ea7n tr\u01b0\u1eddng", "g\u1ea7n b\u1ec7nh vi\u1ec7n", "b\u00e1n k\u00ednh", "g\u1ea7n ch\u1ed7", "g\u1ea7n \u0111\u1ea1i h\u1ecdc", "g\u1ea7n \u0111h")) {
            return Optional.of(RuleIntentResult.of(SystemIntent.LOCATION_SEARCH, 0.9));
        }
        if (Pattern.compile("g\u1ea7n\\s+[A-Z\u00c0-\u1ef8a-z\u00e0-\u1ef9]").matcher(q).find()) {
            return Optional.of(RuleIntentResult.of(SystemIntent.LOCATION_SEARCH, 0.85));
        }
        if (this.containsAny(q, "t\u00ecm ph\u00f2ng", "ph\u00f2ng tr\u1ed1ng", "ph\u00f2ng cho thu\u00ea", "thu\u00ea ph\u00f2ng", "ph\u00f2ng tr\u1ecd", "cho thu\u00ea", "ph\u00f2ng gi\u00e1", "ph\u00f2ng r\u1ebb", "ph\u00f2ng c\u00f3", "ph\u00f2ng studio", "ph\u00f2ng 1 ng\u01b0\u1eddi", "ph\u00f2ng 2 ng\u01b0\u1eddi", "c\u00f3 g\u00e1c l\u1eedng", "c\u00f3 ban c\u00f4ng", "nu\u00f4i th\u00fa c\u01b0ng", "nu\u00f4i ch\u00f3", "nu\u00f4i m\u00e8o")) {
            return Optional.of(RuleIntentResult.of(SystemIntent.SEARCH_ROOM, 0.88));
        }
        if (Pattern.compile("(d\u01b0\u1edbi|t\u1ea7m|kho\u1ea3ng|t\u1eeb|\\d+)\\s*(tri\u1ec7u|tr|c\u1ee7|tr\u0103m)").matcher(q).find() && !this.containsAny(q, "h\u00f3a \u0111\u01a1n", "n\u1ee3", "doanh thu")) {
            return Optional.of(RuleIntentResult.of(SystemIntent.SEARCH_ROOM, 0.85));
        }
        return Optional.empty();
    }

    public double getAcceptThreshold() {
        return 0.85;
    }

    private String normalize(String text) {
        return Normalizer.normalize(text.toLowerCase().trim(), Normalizer.Form.NFC);
    }

    private boolean containsAny(String text, String ... keywords) {
        for (String kw : keywords) {
            if (!text.contains(kw)) continue;
            return true;
        }
        return false;
    }
}

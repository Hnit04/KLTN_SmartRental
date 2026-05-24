/*
 * Decompiled with CFR 0.152.
 */
package iuh.se.kltn.backend.modules.ai.dto;

import iuh.se.kltn.backend.modules.ai.enums.SystemIntent;

public record RuleIntentResult(SystemIntent intent, double matchScore, String source) {
    public static RuleIntentResult of(SystemIntent intent, double matchScore) {
        return new RuleIntentResult(intent, matchScore, "RULE");
    }
}

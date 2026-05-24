package iuh.se.kltn.backend.modules.ai.service;

import dev.langchain4j.data.message.AiMessage;
import dev.langchain4j.data.message.Content;
import dev.langchain4j.data.message.ImageContent;
import dev.langchain4j.data.message.TextContent;
import dev.langchain4j.data.message.UserMessage;
import dev.langchain4j.model.chat.ChatLanguageModel;
import dev.langchain4j.model.output.Response;
import iuh.se.kltn.backend.modules.ai.config.AiRuntimeProperties;
import iuh.se.kltn.backend.modules.ai.dto.ModerationResult;
import iuh.se.kltn.backend.modules.ai.dto.ModerationScoreDetail;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.util.ArrayList;
import java.util.List;
import java.util.Locale;

@Service
public class ModerationService {

    @Autowired
    private ChatLanguageModel geminiChatModel;

    @Autowired
    private RuleBasedModerationScorer ruleBasedModerationScorer;

    @Autowired(required = false)
    private AiRuntimeProperties aiRuntimeProperties;

    @Value("${ai.llm.mode:FULL}")
    private String aiLlmMode;

    public ModerationResult checkContent(String type, String text, List<String> imageUrls) {
        return checkContent(type, text, imageUrls, null, null, null, null, null, null, null, null, null, null, null, null);
    }

    public ModerationResult checkContent(
            String type,
            String text,
            List<String> imageUrls,
            List<String> panoramaImageUrls,
            Double price,
            Float area,
            String address,
            String district,
            String city,
            List<String> amenities,
            String roomType,
            Integer maxOccupants,
            Double elecPrice,
            Double waterPrice,
            Double internetPrice
    ) {
        String safeType = type == null || type.isBlank() ? "Phòng trọ" : type;
        String safeText = text == null ? "" : text;

        ModerationScoreDetail detail = ruleBasedModerationScorer.score(
                safeType,
                safeText,
                imageUrls,
                panoramaImageUrls,
                price,
                area,
                address,
                district,
                city,
                amenities,
                roomType,
                maxOccupants,
                elecPrice,
                waterPrice,
                internetPrice
        );

        boolean isSafe = ruleBasedModerationScorer.isSafe(detail);
        String ruleReason = buildRuleReason(detail);

        boolean llmEnabled = isModerationLlmEnabled();
        String aiNote = null;
        if (llmEnabled) {
            aiNote = generateAiModerationNote(safeType, safeText, imageUrls, detail);
        }

        if (aiNote != null && !aiNote.isBlank()) {
            detail.setSource("RULE_GEMINI");
        } else {
            detail.setSource("RULE");
        }

        String finalReason = composeFinalReason(ruleReason, aiNote, llmEnabled);
        return new ModerationResult(isSafe, detail.getTotalScore(), finalReason);
    }

    public ModerationResult checkContent(String text) {
        return checkContent("Phòng trọ", text, null);
    }

    public ModerationResult checkContent(String type, String text) {
        return checkContent(type, text, null);
    }

    public boolean isSafe(String text) {
        return checkContent(text).isSafe();
    }

    private boolean isModerationLlmEnabled() {
        String normalizedMode = aiLlmMode == null ? "FULL" : aiLlmMode.trim().toUpperCase(Locale.ROOT);
        if ("TEMPLATE_ONLY".equals(normalizedMode)) {
            return false;
        }
        if (aiRuntimeProperties == null || aiRuntimeProperties.getFeatures() == null
                || aiRuntimeProperties.getFeatures().getModeration() == null) {
            return false;
        }
        return aiRuntimeProperties.getFeatures().getModeration().isLlmEnabled();
    }

    private String generateAiModerationNote(String type, String text, List<String> imageUrls, ModerationScoreDetail detail) {
        try {
            String prompt = "Bạn là trợ lý kiểm duyệt. Hãy viết tối đa 3 nhận xét ngắn để hỗ trợ Admin xem lại bài đăng. "
                    + "Không được thay đổi điểm. Không được kết luận thay Admin. "
                    + "Chỉ trả về văn bản ngắn, không dùng JSON.\n\n"
                    + "Loại bài đăng: " + type + "\n"
                    + "SafetyScore(rule): " + detail.getTotalScore() + "/100\n"
                    + "RiskLevel(rule): " + detail.getRiskLevel() + "\n"
                    + "Rule reasons: " + String.join("; ", detail.getRuleReasons()) + "\n"
                    + "Nội dung: " + text;

            UserMessage userMessage;
            if (imageUrls != null && !imageUrls.isEmpty()) {
                List<Content> contents = new ArrayList<>();
                contents.add(TextContent.from(prompt));
                int added = 0;
                for (String url : imageUrls) {
                    if (url == null || url.isBlank()) {
                        continue;
                    }
                    if (added >= 3) {
                        break;
                    }
                    try {
                        contents.add(ImageContent.from(url));
                        added++;
                    } catch (Exception ignored) {
                        // Skip invalid image URL for AI note.
                    }
                }
                userMessage = UserMessage.from(contents);
            } else {
                userMessage = UserMessage.from(prompt);
            }

            Response<AiMessage> aiResponse = geminiChatModel.generate(userMessage);
            if (aiResponse == null || aiResponse.content() == null || aiResponse.content().text() == null) {
                return null;
            }
            String note = aiResponse.content().text().trim();
            if (note.startsWith("```") && note.endsWith("```")) {
                note = note.replace("```", "").trim();
            }
            return note.isBlank() ? null : note;
        } catch (Exception ex) {
            System.err.println("[MODERATION] Gemini note không khả dụng: " + ex.getMessage());
            return null;
        }
    }

    private String buildRuleReason(ModerationScoreDetail detail) {
        StringBuilder sb = new StringBuilder();
        sb.append("[RULE] SafetyScore=")
                .append(detail.getTotalScore()).append("/100, ")
                .append("contentScore=").append(detail.getContentScore()).append("/25, ")
                .append("imageScore=").append(detail.getImageScore()).append("/25, ")
                .append("completenessScore=").append(detail.getCompletenessScore()).append("/30, ")
                .append("policyScore=").append(detail.getPolicyScore()).append("/20");

        if (detail.getRuleReasons() != null && !detail.getRuleReasons().isEmpty()) {
            sb.append(" - Rule notes: ");
            sb.append(String.join(" | ", detail.getRuleReasons()));
        }
        return sb.toString();
    }

    private String composeFinalReason(String ruleReason, String aiNote, boolean llmEnabled) {
        if (aiNote != null && !aiNote.isBlank()) {
            return ruleReason + "\n[AI NOTE] " + aiNote;
        }
        if (llmEnabled) {
            return ruleReason + "\n[AI NOTE] Gemini không khả dụng, sử dụng kết quả RULE.";
        }
        return ruleReason + "\n[AI NOTE] Gemini đang tắt, sử dụng kết quả RULE.";
    }
}

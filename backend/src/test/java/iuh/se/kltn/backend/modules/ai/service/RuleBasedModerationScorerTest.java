package iuh.se.kltn.backend.modules.ai.service;

import iuh.se.kltn.backend.modules.ai.config.AiRuntimeProperties;
import iuh.se.kltn.backend.modules.ai.dto.ImageSceneClassificationResult;
import iuh.se.kltn.backend.modules.ai.dto.ModerationScoreDetail;
import org.junit.jupiter.api.Test;
import org.springframework.test.util.ReflectionTestUtils;

import java.util.List;
import java.util.Locale;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

class RuleBasedModerationScorerTest {

    private final RuleBasedModerationScorer scorer = new RuleBasedModerationScorer();

    @Test
    void fullRoomInfoWithManyImages_shouldScoreLowRisk() {
        ModerationScoreDetail detail = scorer.score(
                "Phong tro",
                "Phong studio day du noi that, co may lanh, wifi, wc rieng, ban cong, khu vuc an ninh va gan cho.",
                List.of(
                        "https://img.example.com/room-1.jpg",
                        "https://img.example.com/room-2.jpg",
                        "https://img.example.com/room-3.jpg",
                        "https://img.example.com/room-4.jpg",
                        "https://img.example.com/room-5.jpg"
                ),
                List.of("https://img.example.com/room-360.jpg"),
                3_500_000d,
                25.0f,
                "12 Nguyen Van Bao",
                "Go Vap",
                "TP.HCM",
                List.of("wifi", "may lanh", "wc rieng"),
                "STUDIO",
                2,
                3500d,
                100_000d,
                120_000d
        );

        assertTrue(detail.getTotalScore() >= 80);
        assertEquals("LOW_RISK", detail.getRiskLevel());
    }

    @Test
    void missingDescriptionAndNoImage_shouldScoreHighRisk() {
        ModerationScoreDetail detail = scorer.score(
                "Phong tro",
                "asd",
                List.of(),
                List.of(),
                null,
                null,
                null,
                null,
                null,
                List.of(),
                null,
                null,
                null,
                null,
                null
        );

        assertTrue(detail.getTotalScore() < 50);
        assertEquals("HIGH_RISK", detail.getRiskLevel());
    }

    @Test
    void policyRiskKeywords_shouldReducePolicyScore() {
        ModerationScoreDetail detail = scorer.score(
                "Phong tro",
                "Phong dep, chuyen coc truoc qua zalo 0909123456 de giu cho nhanh.",
                List.of("https://img.example.com/a.jpg"),
                List.of(),
                2_500_000d,
                18.0f,
                "88 Le Van Sy",
                "Phu Nhuan",
                "TP.HCM",
                List.of("wifi"),
                "SINGLE_ROOM",
                2,
                3500d,
                100_000d,
                100_000d
        );

        assertTrue(detail.getPolicyScore() <= 10);
    }

    @Test
    void spamAndOutsideLink_shouldLowerContentScore() {
        ModerationScoreDetail detail = scorer.score(
                "Phong tro",
                "asdf asdf asdf 123123 http://spam.example.com",
                List.of("https://img.example.com/a.jpg"),
                List.of(),
                2_000_000d,
                15.0f,
                "1 Tran Quang Dieu",
                "Quan 3",
                "TP.HCM",
                List.of(),
                null,
                null,
                null,
                null,
                null
        );

        assertTrue(detail.getContentScore() <= 10);
    }

    @Test
    void averageRoom_shouldScoreMediumRisk() {
        ModerationScoreDetail detail = scorer.score(
                "Phong tro",
                "Phong gon gang, gia hop ly, co wifi va cho de xe.",
                List.of("https://img.example.com/one.jpg"),
                List.of(),
                2_800_000d,
                16.0f,
                "35 Duong so 5",
                "Binh Thanh",
                "TP.HCM",
                List.of("wifi"),
                null,
                null,
                3500d,
                null,
                null
        );

        assertTrue(detail.getTotalScore() >= 50 && detail.getTotalScore() <= 79);
        assertEquals("MEDIUM_RISK", detail.getRiskLevel());
    }

    @Test
    void sceneClassifier_roomLikeMajority_shouldIncreaseImageScore() {
        List<String> images = List.of(
                "https://img.example.com/r1.jpg",
                "https://img.example.com/r2.jpg",
                "https://img.example.com/r3.jpg"
        );

        RuleBasedModerationScorer disabledScorer = buildScorer(false, null);
        ModerationScoreDetail baseline = disabledScorer.score(
                "Phong tro",
                "Phong co noi that co ban.",
                images,
                List.of(),
                2_800_000d,
                16.0f,
                "35 Duong so 5",
                "Binh Thanh",
                "TP.HCM",
                List.of("wifi"),
                "STUDIO",
                2,
                3500d,
                100000d,
                120000d
        );

        ImageSceneClassifier roomLikeClassifier = imageUrls -> ImageSceneClassificationResult.builder()
                .enabled(true)
                .source("TEST")
                .predictions(List.of(
                        prediction(imageUrls.get(0), "ROOM_INTERIOR", 0.91),
                        prediction(imageUrls.get(1), "BATHROOM", 0.85),
                        prediction(imageUrls.get(2), "KITCHEN", 0.88)
                ))
                .build();
        RuleBasedModerationScorer sceneScorer = buildScorer(true, roomLikeClassifier);
        ModerationScoreDetail improved = sceneScorer.score(
                "Phong tro",
                "Phong co noi that co ban.",
                images,
                List.of(),
                2_800_000d,
                16.0f,
                "35 Duong so 5",
                "Binh Thanh",
                "TP.HCM",
                List.of("wifi"),
                "STUDIO",
                2,
                3500d,
                100000d,
                120000d
        );

        assertTrue(improved.getImageScore() > baseline.getImageScore());
        assertTrue(containsReason(improved, "scene classifier: da so anh"));
    }

    @Test
    void sceneClassifier_suspiciousMajority_shouldReduceImageScore_andNeedsReviewReason() {
        List<String> images = List.of(
                "https://img.example.com/a1.jpg",
                "https://img.example.com/a2.jpg",
                "https://img.example.com/a3.jpg"
        );

        RuleBasedModerationScorer baselineScorer = buildScorer(false, null);
        ModerationScoreDetail baseline = baselineScorer.score(
                "Phong tro",
                "Phong on dinh.",
                images,
                List.of(),
                3_000_000d,
                18.0f,
                "88 Le Van Sy",
                "Phu Nhuan",
                "TP.HCM",
                List.of("wifi"),
                "SINGLE_ROOM",
                2,
                3500d,
                100000d,
                120000d
        );

        ImageSceneClassifier suspiciousClassifier = imageUrls -> ImageSceneClassificationResult.builder()
                .enabled(true)
                .source("TEST")
                .predictions(List.of(
                        prediction(imageUrls.get(0), "DOCUMENT", 0.90),
                        prediction(imageUrls.get(1), "OTHER", 0.87),
                        prediction(imageUrls.get(2), "OTHER", 0.82)
                ))
                .build();
        RuleBasedModerationScorer sceneScorer = buildScorer(true, suspiciousClassifier);
        ModerationScoreDetail degraded = sceneScorer.score(
                "Phong tro",
                "Phong on dinh.",
                images,
                List.of(),
                3_000_000d,
                18.0f,
                "88 Le Van Sy",
                "Phu Nhuan",
                "TP.HCM",
                List.of("wifi"),
                "SINGLE_ROOM",
                2,
                3500d,
                100000d,
                120000d
        );

        assertTrue(degraded.getImageScore() < baseline.getImageScore());
        assertTrue(containsReason(degraded, "document/other"));
    }

    @Test
    void sceneClassifierDisabled_shouldKeepCurrentScoringBehavior() {
        List<String> images = List.of(
                "https://img.example.com/c1.jpg",
                "https://img.example.com/c2.jpg",
                "https://img.example.com/c3.jpg"
        );

        ImageSceneClassifier suspiciousClassifier = imageUrls -> ImageSceneClassificationResult.builder()
                .enabled(true)
                .source("TEST")
                .predictions(List.of(
                        prediction(imageUrls.get(0), "DOCUMENT", 0.91),
                        prediction(imageUrls.get(1), "OTHER", 0.90),
                        prediction(imageUrls.get(2), "OTHER", 0.88)
                ))
                .build();

        RuleBasedModerationScorer scorerNoScene = buildScorer(false, null);
        RuleBasedModerationScorer scorerDisabledButInjected = buildScorer(false, suspiciousClassifier);

        ModerationScoreDetail base = scorerNoScene.score(
                "Phong tro",
                "Phong tien nghi.",
                images,
                List.of(),
                3_200_000d,
                19.0f,
                "12 Nguyen Van Bao",
                "Go Vap",
                "TP.HCM",
                List.of("wifi"),
                "STUDIO",
                2,
                3500d,
                100000d,
                120000d
        );
        ModerationScoreDetail disabled = scorerDisabledButInjected.score(
                "Phong tro",
                "Phong tien nghi.",
                images,
                List.of(),
                3_200_000d,
                19.0f,
                "12 Nguyen Van Bao",
                "Go Vap",
                "TP.HCM",
                List.of("wifi"),
                "STUDIO",
                2,
                3500d,
                100000d,
                120000d
        );

        assertEquals(base.getImageScore(), disabled.getImageScore());
        assertFalse(containsReason(disabled, "scene classifier"));
    }

    @Test
    void lowConfidencePredictions_shouldBecomeUnknown_andApplyLightReviewPenalty() {
        List<String> images = List.of(
                "https://img.example.com/u1.jpg",
                "https://img.example.com/u2.jpg",
                "https://img.example.com/u3.jpg"
        );

        RuleBasedModerationScorer baselineScorer = buildScorer(false, null);
        ModerationScoreDetail baseline = baselineScorer.score(
                "Phong tro",
                "Phong gon gang.",
                images,
                List.of(),
                2_900_000d,
                17.0f,
                "35 Duong so 5",
                "Binh Thanh",
                "TP.HCM",
                List.of("wifi"),
                "STUDIO",
                2,
                3500d,
                100000d,
                120000d
        );

        ImageSceneClassifier lowConfidenceClassifier = imageUrls -> ImageSceneClassificationResult.builder()
                .enabled(true)
                .source("TEST")
                .predictions(List.of(
                        prediction(imageUrls.get(0), "ROOM_INTERIOR", 0.30),
                        prediction(imageUrls.get(1), "BATHROOM", 0.40),
                        prediction(imageUrls.get(2), "KITCHEN", 0.20)
                ))
                .build();
        RuleBasedModerationScorer sceneScorer = buildScorer(true, lowConfidenceClassifier);
        ModerationScoreDetail result = sceneScorer.score(
                "Phong tro",
                "Phong gon gang.",
                images,
                List.of(),
                2_900_000d,
                17.0f,
                "35 Duong so 5",
                "Binh Thanh",
                "TP.HCM",
                List.of("wifi"),
                "STUDIO",
                2,
                3500d,
                100000d,
                120000d
        );

        assertTrue(result.getImageScore() < baseline.getImageScore());
        assertTrue(containsReason(result, "confidence thap/unknown"));
    }

    private RuleBasedModerationScorer buildScorer(boolean sceneEnabled, ImageSceneClassifier classifier) {
        RuleBasedModerationScorer customScorer = new RuleBasedModerationScorer();
        AiRuntimeProperties runtime = new AiRuntimeProperties();
        runtime.getModeration().getSceneClassifier().setEnabled(sceneEnabled);
        runtime.getModeration().getSceneClassifier().setRoomLikeThreshold(0.60);
        runtime.getModeration().getSceneClassifier().setMinConfidence(0.50);
        runtime.getModeration().getSceneClassifier().setSuspiciousLabels(List.of("DOCUMENT", "OTHER"));
        runtime.getModeration().getImageQuality().setEnabled(false);

        ReflectionTestUtils.setField(customScorer, "aiRuntimeProperties", runtime);
        ReflectionTestUtils.setField(customScorer, "imageQualityInspector", null);
        ReflectionTestUtils.setField(customScorer, "imageSceneClassifier", classifier);
        return customScorer;
    }

    private ImageSceneClassificationResult.ImageScenePrediction prediction(String url, String label, double confidence) {
        return ImageSceneClassificationResult.ImageScenePrediction.builder()
                .imageUrl(url)
                .label(label)
                .confidence(confidence)
                .build();
    }

    private boolean containsReason(ModerationScoreDetail detail, String keyword) {
        if (detail == null || detail.getRuleReasons() == null || keyword == null) {
            return false;
        }
        String lowerKeyword = keyword.toLowerCase(Locale.ROOT);
        return detail.getRuleReasons().stream()
                .filter(item -> item != null)
                .anyMatch(item -> item.toLowerCase(Locale.ROOT).contains(lowerKeyword));
    }
}

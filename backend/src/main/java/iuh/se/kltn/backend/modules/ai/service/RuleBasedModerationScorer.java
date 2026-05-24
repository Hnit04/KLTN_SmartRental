package iuh.se.kltn.backend.modules.ai.service;

import iuh.se.kltn.backend.modules.ai.config.AiRuntimeProperties;
import iuh.se.kltn.backend.modules.ai.dto.ImageQualityResult;
import iuh.se.kltn.backend.modules.ai.dto.ImageSceneClassificationResult;
import iuh.se.kltn.backend.modules.ai.dto.ModerationScoreDetail;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.text.Normalizer;
import java.util.ArrayList;
import java.util.HashSet;
import java.util.List;
import java.util.Locale;
import java.util.Set;
import java.util.regex.Pattern;
import java.util.stream.Collectors;

@Service
public class RuleBasedModerationScorer {

    private static final Set<String> ROOM_LIKE_LABELS = Set.of(
            "ROOM_INTERIOR",
            "BATHROOM",
            "KITCHEN",
            "EXTERIOR",
            "CORRIDOR"
    );

    @Autowired(required = false)
    private ImageQualityInspector imageQualityInspector;

    @Autowired(required = false)
    private ImageSceneClassifier imageSceneClassifier;

    @Autowired(required = false)
    private AiRuntimeProperties aiRuntimeProperties;

    private static final Pattern IMAGE_URL_PATTERN = Pattern.compile("^(https?://).+\\.(jpg|jpeg|png|webp|gif)(\\?.*)?$", Pattern.CASE_INSENSITIVE);
    private static final Pattern PHONE_PATTERN = Pattern.compile("(?<!\\d)(0\\d{8,10}|\\+84\\d{8,10})(?!\\d)");
    private static final Pattern SPAM_SEQUENCE_PATTERN = Pattern.compile("([^\\\\d])\\\\1{4,}");
    private static final Pattern ONLY_DIGIT_PATTERN = Pattern.compile("^\\d+$");

    public ModerationScoreDetail score(
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
        List<String> reasons = new ArrayList<>();
        String safeType = safe(type);
        String safeText = safe(text);
        String normalizedText = normalizeForSearch(safeText);
        List<String> safeImages = sanitizeList(imageUrls);
        List<String> safePanoramaImages = sanitizeList(panoramaImageUrls);
        List<String> safeAmenities = sanitizeList(amenities);
        boolean propertyPost = normalizeForSearch(safeType).contains("khu tro");

        int contentScore = evaluateContentScore(safeText, normalizedText, safeAmenities, reasons);
        double[] sceneRatios = new double[]{0.0, 0.0}; // [roomLikeRatio, suspiciousRatio]
        int imageScore = evaluateImageScore(normalizedText, safeImages, safePanoramaImages, reasons, sceneRatios);
        int completenessScore = evaluateCompletenessScore(
                propertyPost,
                price,
                area,
                address,
                district,
                city,
                safeAmenities,
                roomType,
                maxOccupants,
                elecPrice,
                waterPrice,
                internetPrice,
                safeImages,
                safePanoramaImages,
                reasons
        );
        int policyScore = evaluatePolicyScore(normalizedText, reasons);

        int totalScore = clamp(contentScore, 0, 25)
                + clamp(imageScore, 0, 25)
                + clamp(completenessScore, 0, 30)
                + clamp(policyScore, 0, 20);

        // Apply risk caps
        totalScore = applyRiskCaps(totalScore, safeImages, reasons, sceneRatios);

        return ModerationScoreDetail.builder()
                .totalScore(clamp(totalScore, 0, 100))
                .contentScore(clamp(contentScore, 0, 25))
                .imageScore(clamp(imageScore, 0, 25))
                .completenessScore(clamp(completenessScore, 0, 30))
                .policyScore(clamp(policyScore, 0, 20))
                .riskLevel(resolveRiskLevel(totalScore))
                .ruleReasons(reasons)
                .source("RULE")
                .build();
    }

    private int applyRiskCaps(int baseScore, List<String> imageUrls, List<String> reasons, double[] sceneRatios) {
        int finalScore = baseScore;
        boolean needsReview = reasons.stream().anyMatch(r -> r.contains("⚠️") || r.contains("NEEDS_REVIEW") || r.contains("cần Admin") || r.contains("bất thường") || r.contains("cần xem lại"));

        // Config values
        int lowRoomLikeCapScore = 69;
        double highSuspiciousRatio = 0.50;
        int highSuspiciousCapScore = 59;
        double severeSuspiciousRatio = 0.75;
        int severeSuspiciousCapScore = 49;
        int maxLowRiskWhenNeedsReview = 79;
        double roomLikeRatioThreshold1 = 0.40;
        double roomLikeRatioThreshold2 = 0.25;

        if (aiRuntimeProperties != null && aiRuntimeProperties.getModeration() != null
                && aiRuntimeProperties.getModeration().getSceneClassifier() != null) {
            lowRoomLikeCapScore = aiRuntimeProperties.getModeration().getSceneClassifier().getLowRoomLikeCapScore();
            highSuspiciousRatio = aiRuntimeProperties.getModeration().getSceneClassifier().getHighSuspiciousRatio();
            highSuspiciousCapScore = aiRuntimeProperties.getModeration().getSceneClassifier().getHighSuspiciousCapScore();
            severeSuspiciousRatio = aiRuntimeProperties.getModeration().getSceneClassifier().getSevereSuspiciousRatio();
            severeSuspiciousCapScore = aiRuntimeProperties.getModeration().getSceneClassifier().getSevereSuspiciousCapScore();
            maxLowRiskWhenNeedsReview = aiRuntimeProperties.getModeration().getSceneClassifier().getMaxLowRiskWhenNeedsReview();
        }

        // Cap 1: No room image
        if (imageUrls.isEmpty()) {
            finalScore = Math.min(finalScore, 55);
        }

        // Cap 2: Scene ratios
        double roomLikeRatio = sceneRatios[0];
        double suspiciousRatio = sceneRatios[1];

        if (isSceneClassifierEnabled()) {
            if (roomLikeRatio < roomLikeRatioThreshold2 && !imageUrls.isEmpty()) {
                finalScore = Math.min(finalScore, 59);
                reasons.add("🚫 Tỷ lệ ảnh phòng quá thấp (dưới 25%).");
            } else if (roomLikeRatio < roomLikeRatioThreshold1 && !imageUrls.isEmpty()) {
                finalScore = Math.min(finalScore, lowRoomLikeCapScore);
                reasons.add("🚫 Tỷ lệ ảnh phòng thấp (dưới 40%).");
            }

            if (suspiciousRatio >= severeSuspiciousRatio) {
                finalScore = Math.min(finalScore, severeSuspiciousCapScore);
                reasons.add("🚫 Đa số ảnh không hợp lệ hoặc đáng ngờ.");
            } else if (suspiciousRatio >= highSuspiciousRatio) {
                finalScore = Math.min(finalScore, highSuspiciousCapScore);
                reasons.add("🚫 Tỷ lệ ảnh không hợp lệ/đáng ngờ cao.");
            }
        }
        
        // Cap 3: Plausibility (Giá/diện tích/sức chứa vô lý mạnh)
        boolean hasImplausibleData = reasons.stream().anyMatch(r -> 
                r.contains("bat thuong") || r.contains("bất thường") || r.contains("khong hop ly") || r.contains("không hợp lý") || r.contains("không hợp lý"));
        if (hasImplausibleData) {
            finalScore = Math.min(finalScore, 45);
            reasons.add("🚫 Dữ liệu giá/diện tích/sức chứa vô lý.");
        }

        // Cap 4: Needs review
        if (needsReview) {
            finalScore = Math.min(finalScore, maxLowRiskWhenNeedsReview);
        }

        return finalScore;
    }

    public boolean isSafe(ModerationScoreDetail detail) {
        if (detail == null) {
            return false;
        }
        return detail.getTotalScore() >= 80 || "LOW_RISK".equalsIgnoreCase(detail.getRiskLevel());
    }

    private int evaluateContentScore(
            String text,
            String normalizedText,
            List<String> amenities,
            List<String> reasons
    ) {
        int score = 0;
        int length = text.trim().length();

        if (length >= 50) {
            score += 10;
        } else if (length >= 20) {
            score += 5;
            reasons.add("Nội dung mô tả còn ngắn, nên bổ sung thêm thông tin cụ thể.");
        } else {
            reasons.add("Nội dung mô tả quá ngắn, khó đánh giá chất lượng phòng.");
        }

        if (containsUsefulDetail(normalizedText, amenities)) {
            score += 5;
        } else {
            reasons.add("Thiếu từ khóa tiện ích/không gian (wifi, máy lạnh, wc riêng, ...).");
        }

        if (!looksLikeSpam(text, normalizedText)) {
            score += 5;
        } else {
            reasons.add("Nội dung có dấu hiệu spam hoặc văn bản kém chất lượng.");
        }

        if (isReadable(normalizedText)) {
            score += 5;
        } else {
            reasons.add("Câu chữ chưa rõ ràng, cần viết lại để người thuê dễ hiểu.");
        }

        return score;
    }

    private int evaluateImageScore(
            String normalizedText,
            List<String> imageUrls,
            List<String> panoramaImageUrls,
            List<String> reasons,
            double[] sceneRatios
    ) {
        int score = 0;
        int imageCount = imageUrls.size();

        if (imageCount >= 3) {
            score += 10;
        } else if (imageCount >= 1) {
            score += 5;
            reasons.add("Nên có ít nhất 3 ảnh để tăng độ tin cậy.");
        } else {
            reasons.add("Chưa có ảnh phòng/khu trọ.");
        }

        int validUrlCount = 0;
        for (String url : imageUrls) {
            if (isLikelyImageUrl(url)) {
                validUrlCount++;
            }
        }
        if (imageCount > 0 && validUrlCount == imageCount) {
            score += 5;
        } else if (validUrlCount > 0) {
            score += 3;
            reasons.add("Một số URL ảnh chưa đúng định dạng ảnh hợp lệ.");
        } else if (imageCount > 0) {
            reasons.add("URL ảnh chưa hợp lệ (yêu cầu http/https và đuôi ảnh).");
        }

        boolean hasPanorama = !panoramaImageUrls.isEmpty()
                || normalizedText.contains("360")
                || normalizedText.contains("panorama");
        if (hasPanorama) {
            score += 5;
        } else {
            reasons.add("Không có ảnh 360/panorama (không bắt buộc nhưng nên có).");
        }

        if (imageCount > 1) {
            Set<String> unique = new HashSet<>(imageUrls);
            if (unique.size() == imageCount) {
                score += 5;
            } else {
                score += 2;
                reasons.add("Danh sách ảnh có trùng lặp.");
            }
        } else if (imageCount == 1) {
            score += 2;
        }

        ImageQualityResult qualityResult = inspectImageQualitySafely(imageUrls, reasons);
        if (qualityResult != null && qualityResult.isEnabled()) {
            if (qualityResult.getInvalidUrlCount() > 0) {
                score -= 2;
            }
            if (qualityResult.getBlockedUrlCount() > 0) {
                score -= 3;
            }
            if (qualityResult.getDuplicateUrlCount() > 0) {
                score -= 1;
            }
            if (qualityResult.getLowResolutionCount() > 0) {
                score -= 3;
            }
            if (qualityResult.getLowQualityCount() > 0) {
                score -= 3;
            }
            if (qualityResult.getDownloadFailedCount() > 0) {
                score -= 1;
            }
            if (qualityResult.getInspectedImageCount() > 0
                    && qualityResult.getLowResolutionCount() == 0
                    && qualityResult.getLowQualityCount() == 0) {
                score += 2;
            }
        }

        ImageSceneClassificationResult sceneResult = classifySceneSafely(imageUrls, reasons);
        if (sceneResult != null && sceneResult.isEnabled()) {
            int classifiedCount = Math.max(0, sceneResult.getClassifiedCount());
            int roomLikeCount = Math.max(0, sceneResult.getRoomLikeCount());
            int suspiciousCount = Math.max(0, sceneResult.getSuspiciousCount());
            int unknownCount = Math.max(0, sceneResult.getUnknownCount());
            int knownCount = Math.max(0, classifiedCount - unknownCount);
            double threshold = resolveRoomLikeThreshold();

            if (classifiedCount == 0) {
                reasons.add("⚠️ Không đủ dữ liệu phân loại ảnh phòng trọ.");
            } else {
                if (knownCount == 0) {
                    reasons.add("NEEDS_REVIEW: Scene classifier: da so ket qua la UNKNOWN, can them anh ro hon.");
                } else {
                    double roomLikeRatio = ((double) roomLikeCount) / knownCount;
                    sceneRatios[0] = roomLikeRatio;
                    if (roomLikeRatio >= threshold) {
                        score += 2;
                        reasons.add("Đa số ảnh có ngữ cảnh phòng trọ/nội thất. ✓");
                    } else if (roomLikeRatio < 0.30) {
                        score -= 2;
                        reasons.add("⚠️ Ảnh có tỷ lệ phòng trọ thấp, cần Admin xem lại.");
                    } else {
                        reasons.add("Scene classifier: ket qua trung tinh, can them anh de xac thuc.");
                    }
                }

                double suspiciousRatio = knownCount > 0 ? ((double) suspiciousCount / knownCount) : 0;
                sceneRatios[1] = suspiciousRatio;
                if (knownCount > 0 && (suspiciousCount >= 2 || suspiciousRatio >= 0.50)) {
                    score -= 2;
                    reasons.add("⚠️ Phát hiện nhiều ảnh tài liệu/không phải phòng, cần Admin xem lại.");
                }

                if (unknownCount > 0) {
                    score -= 1;
                    reasons.add("NEEDS_REVIEW: Scene classifier: mot so anh confidence thap/UNKNOWN.");
                }
            }
        }

        return clamp(score, 0, 25);
    }

    private ImageQualityResult inspectImageQualitySafely(List<String> imageUrls, List<String> reasons) {
        if (!isImageQualityEnabled()) {
            return ImageQualityResult.builder().enabled(false).build();
        }
        try {
            ImageQualityResult result = imageQualityInspector.inspect(imageUrls);
            if (result != null && result.getReasons() != null && !result.getReasons().isEmpty()) {
                reasons.addAll(result.getReasons());
            }
            return result;
        } catch (Exception ex) {
            reasons.add("Image quality inspector gap loi, su dung fallback rule.");
            return ImageQualityResult.builder()
                    .enabled(true)
                    .downloadFailedCount(1)
                    .needsReview(true)
                    .build();
        }
    }

    private boolean isImageQualityEnabled() {
        if (imageQualityInspector == null || aiRuntimeProperties == null
                || aiRuntimeProperties.getModeration() == null
                || aiRuntimeProperties.getModeration().getImageQuality() == null) {
            return false;
        }
        return aiRuntimeProperties.getModeration().getImageQuality().isEnabled();
    }

    private ImageSceneClassificationResult classifySceneSafely(List<String> imageUrls, List<String> reasons) {
        if (!isSceneClassifierEnabled()) {
            return ImageSceneClassificationResult.builder()
                    .enabled(false)
                    .source("DISABLED")
                    .build();
        }

        try {
            ImageSceneClassificationResult result = imageSceneClassifier.classify(imageUrls);
            if (result == null) {
                reasons.add("NEEDS_REVIEW: Scene classifier tra ve ket qua rong.");
                return ImageSceneClassificationResult.builder()
                        .enabled(true)
                        .source("NULL_RESULT")
                        .classifiedCount(0)
                        .needsReview(true)
                        .build();
            }

            normalizeSceneResult(result);
            if (result.getReasons() != null && !result.getReasons().isEmpty()) {
                reasons.addAll(result.getReasons());
            }
            return result;
        } catch (Exception ex) {
            reasons.add("NEEDS_REVIEW: Scene classifier gap loi, su dung fallback moderation.");
            return ImageSceneClassificationResult.builder()
                    .enabled(true)
                    .source("ERROR")
                    .classifiedCount(0)
                    .needsReview(true)
                    .reasons(List.of("NEEDS_REVIEW: Scene classifier loi: " + ex.getClass().getSimpleName()))
                    .build();
        }
    }

    private boolean isSceneClassifierEnabled() {
        if (imageSceneClassifier == null || aiRuntimeProperties == null
                || aiRuntimeProperties.getModeration() == null
                || aiRuntimeProperties.getModeration().getSceneClassifier() == null) {
            return false;
        }
        return aiRuntimeProperties.getModeration().getSceneClassifier().isEnabled();
    }

    private double resolveRoomLikeThreshold() {
        if (aiRuntimeProperties == null || aiRuntimeProperties.getModeration() == null
                || aiRuntimeProperties.getModeration().getSceneClassifier() == null) {
            return 0.60;
        }
        double value = aiRuntimeProperties.getModeration().getSceneClassifier().getRoomLikeThreshold();
        if (Double.isNaN(value) || Double.isInfinite(value)) {
            return 0.60;
        }
        return Math.max(0.0, Math.min(1.0, value));
    }

    private Set<String> resolveSuspiciousLabels() {
        if (aiRuntimeProperties == null || aiRuntimeProperties.getModeration() == null
                || aiRuntimeProperties.getModeration().getSceneClassifier() == null
                || aiRuntimeProperties.getModeration().getSceneClassifier().getSuspiciousLabels() == null
                || aiRuntimeProperties.getModeration().getSceneClassifier().getSuspiciousLabels().isEmpty()) {
            return Set.of("DOCUMENT", "OTHER");
        }
        return aiRuntimeProperties.getModeration().getSceneClassifier().getSuspiciousLabels()
                .stream()
                .filter(item -> item != null && !item.isBlank())
                .map(item -> item.trim().toUpperCase(Locale.ROOT))
                .collect(Collectors.toSet());
    }

    private void normalizeSceneResult(ImageSceneClassificationResult result) {
        if (result.getClassifiedCount() > 0) {
            return;
        }
        if (result.getPredictions() == null || result.getPredictions().isEmpty()) {
            return;
        }

        double minConfidence = 0.50;
        if (aiRuntimeProperties != null && aiRuntimeProperties.getModeration() != null
                && aiRuntimeProperties.getModeration().getSceneClassifier() != null) {
            minConfidence = aiRuntimeProperties.getModeration().getSceneClassifier().getMinConfidence();
        }
        if (Double.isNaN(minConfidence) || Double.isInfinite(minConfidence)) {
            minConfidence = 0.50;
        }
        minConfidence = Math.max(0.0, Math.min(1.0, minConfidence));

        Set<String> suspiciousLabels = resolveSuspiciousLabels();
        int classifiedCount = 0;
        int unknownCount = 0;
        int roomLikeCount = 0;
        int suspiciousCount = 0;

        for (ImageSceneClassificationResult.ImageScenePrediction prediction : result.getPredictions()) {
            if (prediction == null) {
                continue;
            }
            String rawLabel = prediction.getLabel() == null ? "UNKNOWN" : prediction.getLabel().trim().toUpperCase(Locale.ROOT);
            double confidence = prediction.getConfidence();
            if (Double.isNaN(confidence) || Double.isInfinite(confidence)) {
                confidence = 0.0;
            }
            if (confidence < minConfidence) {
                rawLabel = "UNKNOWN";
            }
            classifiedCount++;
            if ("UNKNOWN".equals(rawLabel)) {
                unknownCount++;
                continue;
            }
            if (ROOM_LIKE_LABELS.contains(rawLabel)) {
                roomLikeCount++;
            }
            if (suspiciousLabels.contains(rawLabel)) {
                suspiciousCount++;
            }
        }

        result.setClassifiedCount(classifiedCount);
        result.setUnknownCount(unknownCount);
        result.setRoomLikeCount(roomLikeCount);
        result.setSuspiciousCount(suspiciousCount);
    }

    private int evaluateCompletenessScore(
            boolean propertyPost,
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
            Double internetPrice,
            List<String> imageUrls,
            List<String> panoramaImageUrls,
            List<String> reasons
    ) {
        int score = 0;

        if (propertyPost) {
            score += 5; // N/A for property-level moderation
            score += 5; // N/A for property-level moderation
        } else {
            if (price != null && price > 0) {
                score += 5;
            } else {
                reasons.add("Thiếu giá thuê hợp lệ (>0).");
            }

            if (area != null && area > 0) {
                score += 5;
            } else {
                reasons.add("Thiếu diện tích hợp lệ (>0).");
            }
        }

        if (hasAnyText(address, district, city)) {
            score += 5;
        } else {
            reasons.add("Thiếu thông tin địa chỉ/khu vực.");
        }

        if (!amenities.isEmpty()) {
            score += 5;
        } else {
            reasons.add("Thiếu thông tin tiện ích.");
        }

        if (propertyPost || hasAnyText(roomType) || (maxOccupants != null && maxOccupants > 0)) {
            score += 3;
        } else {
            reasons.add("Thiếu loại phòng hoặc số người tối đa.");
        }

        boolean hasAllUtilities = elecPrice != null && elecPrice > 0
                && waterPrice != null && waterPrice > 0
                && internetPrice != null && internetPrice > 0;
        boolean hasAnyUtilities = (elecPrice != null && elecPrice > 0)
                || (waterPrice != null && waterPrice > 0)
                || (internetPrice != null && internetPrice > 0);
        if (hasAllUtilities) {
            score += 4;
        } else if (hasAnyUtilities) {
            score += 2;
            reasons.add("Nên khai báo đầy đủ giá điện/nước/internet.");
        } else {
            reasons.add("Thiếu thông tin giá điện/nước/internet.");
        }

        if (imageUrls.size() >= 4 || !panoramaImageUrls.isEmpty()) {
            score += 3;
        } else {
            reasons.add("Nên bổ sung thêm ảnh hoặc ảnh 360 để tăng độ đầy đủ.");
        }

        Double areaValue = parseNumber(area);
        Double priceValue = parseNumber(price);
        Double maxOccupantsValue = parseNumber(maxOccupants);

        if (priceValue != null && (priceValue < 500_000d || priceValue > 100_000_000d)) {
            score -= 8;
            reasons.add("Giá thuê bất thường so với mặt bằng thị trường.");
        }

        if (areaValue != null && (areaValue < 8d || areaValue > 120d)) {
            score -= 6;
            reasons.add("Diện tích bất thường cho phòng trọ.");
        }

        if (maxOccupantsValue != null && (maxOccupantsValue <= 0d || maxOccupantsValue > 12d)) {
            score -= 8;
            reasons.add("Số người tối đa không hợp lý.");
        }

        if (priceValue != null && areaValue != null && areaValue > 0d) {
            double pricePerM2 = priceValue / areaValue;
            if (pricePerM2 < 30_000d || pricePerM2 > 600_000d) {
                score -= 8;
                reasons.add("Giá/m² bất thường.");
            }
        }

        if (areaValue != null && maxOccupantsValue != null && maxOccupantsValue > 0d) {
            double areaPerPerson = areaValue / maxOccupantsValue;
            if (areaPerPerson < 4d) {
                score -= 8;
                reasons.add("Mật độ người ở quá cao so với diện tích.");
            }
        }

        if (imageUrls.isEmpty()) {
            score -= 12;
            reasons.add("Không có ảnh phòng hợp lệ.");
        } else if (imageUrls.size() < 3 && panoramaImageUrls.isEmpty()) {
            score -= 6;
            reasons.add("Số lượng ảnh phòng quá ít để xác thực.");
        }

        return clamp(score, 0, 30);
    }

    private int evaluatePolicyScore(String normalizedText, List<String> reasons) {
        int score = 0;

        if (!containsHighRiskPolicyCue(normalizedText)) {
            score += 10;
        } else {
            reasons.add("Có dấu hiệu nội dung rủi ro chính sách (ví dụ: chuyển cọc trước/không hợp đồng).");
        }

        if (!containsExternalContactCue(normalizedText)) {
            score += 5;
        } else {
            reasons.add("Phát hiện thông tin liên hệ ngoài luồng (SĐT/Zalo/link).");
        }

        if (!containsDiscriminatoryCue(normalizedText)) {
            score += 5;
        } else {
            reasons.add("Có dấu hiệu nội dung phân biệt/nhạy cảm.");
        }

        return clamp(score, 0, 20);
    }

    public String resolveRiskLevel(int totalScore) {
        if (totalScore < 60) {
            return "HIGH_RISK";
        }
        if (totalScore >= 80) {
            return "LOW_RISK";
        }
        return "MEDIUM_RISK";
    }

    private boolean containsUsefulDetail(String normalizedText, List<String> amenities) {
        if (!amenities.isEmpty()) {
            return true;
        }
        return containsAny(normalizedText,
                "wifi",
                "may lanh",
                "dieu hoa",
                "wc",
                "ve sinh",
                "ban cong",
                "giu xe",
                "noi that",
                "thang may",
                "camera",
                "bao ve");
    }

    private boolean looksLikeSpam(String rawText, String normalizedText) {
        String compact = normalizedText.replace(" ", "");
        if (compact.length() <= 5) {
            return true;
        }
        if (SPAM_SEQUENCE_PATTERN.matcher(rawText).find()) {
            return true;
        }
        if (ONLY_DIGIT_PATTERN.matcher(compact).matches()) {
            return true;
        }
        String[] tokens = normalizedText.split("\\s+");
        if (tokens.length >= 6) {
            int repeated = 0;
            for (int i = 1; i < tokens.length; i++) {
                if (tokens[i].equals(tokens[i - 1])) {
                    repeated++;
                }
            }
            if (repeated >= 3) {
                return true;
            }
        }
        return false;
    }

    private boolean isReadable(String normalizedText) {
        if (normalizedText.isBlank()) {
            return false;
        }
        String[] tokens = normalizedText.split("\\s+");
        if (tokens.length < 4) {
            return false;
        }
        return !containsAny(normalizedText, "asdf", "qwer", "zxcv", "test test test", "123123");
    }

    private boolean containsHighRiskPolicyCue(String normalizedText) {
        return containsAny(normalizedText,
                "chuyen coc truoc",
                "dat coc truoc",
                "ck truoc",
                "khong hop dong",
                "bao dau",
                "gia ao",
                "lien he rieng",
                "vi tien ao");
    }

    private boolean containsExternalContactCue(String normalizedText) {
        if (containsAny(normalizedText,
                "zalo",
                "telegram",
                "facebook",
                "fb",
                "t.me",
                "wa.me",
                "http://",
                "https://",
                "www.")) {
            return true;
        }
        return PHONE_PATTERN.matcher(normalizedText.replace(" ", "")).find();
    }

    private boolean containsDiscriminatoryCue(String normalizedText) {
        return containsAny(normalizedText,
                "chi nhan nu",
                "chi nhan nam",
                "khong nhan nguoi",
                "cam nguoi",
                "khong tiep");
    }

    private boolean isLikelyImageUrl(String value) {
        if (value == null || value.isBlank()) {
            return false;
        }
        return IMAGE_URL_PATTERN.matcher(value.trim()).matches();
    }

    private List<String> sanitizeList(List<String> values) {
        if (values == null || values.isEmpty()) {
            return List.of();
        }
        List<String> safe = new ArrayList<>();
        for (String item : values) {
            if (item != null && !item.isBlank()) {
                safe.add(item.trim());
            }
        }
        return safe;
    }

    private boolean hasAnyText(String... values) {
        if (values == null || values.length == 0) {
            return false;
        }
        for (String value : values) {
            if (value != null && !value.isBlank()) {
                return true;
            }
        }
        return false;
    }

    private boolean containsAny(String source, String... tokens) {
        if (source == null || source.isBlank() || tokens == null) {
            return false;
        }
        for (String token : tokens) {
            if (token != null && !token.isBlank() && source.contains(token)) {
                return true;
            }
        }
        return false;
    }

    private Double parseNumber(Object value) {
        if (value == null) {
            return null;
        }
        try {
            String raw = String.valueOf(value).trim();
            if (raw.isEmpty()) {
                return null;
            }
            return Double.parseDouble(raw);
        } catch (Exception ignored) {
            return null;
        }
    }

    private String normalizeForSearch(String value) {
        if (value == null || value.isBlank()) {
            return "";
        }
        String lower = value.toLowerCase(Locale.ROOT);
        String noAccent = Normalizer.normalize(lower, Normalizer.Form.NFD).replaceAll("\\p{M}+", "");
        return noAccent.replaceAll("[^a-z0-9\\s:/._+-]", " ").replaceAll("\\s+", " ").trim();
    }

    private String safe(String value) {
        return value == null ? "" : value;
    }

    private int clamp(int value, int min, int max) {
        return Math.max(min, Math.min(max, value));
    }
}


      
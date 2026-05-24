package iuh.se.kltn.backend.modules.ai.config;

import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.stereotype.Component;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

@Component
@ConfigurationProperties(prefix = "ai.runtime")
public class AiRuntimeProperties {

    private Features features = new Features();
    private Templates templates = new Templates();
    private PriceSuggestion priceSuggestion = new PriceSuggestion();
    private Dictionaries dictionaries = new Dictionaries();
    private Moderation moderation = new Moderation();
    private Search search = new Search();
    private SqlGenerator sqlGenerator = new SqlGenerator();

    public Features getFeatures() {
        return features;
    }

    public void setFeatures(Features features) {
        this.features = features;
    }

    public Templates getTemplates() {
        return templates;
    }

    public void setTemplates(Templates templates) {
        this.templates = templates;
    }

    public PriceSuggestion getPriceSuggestion() {
        return priceSuggestion;
    }

    public void setPriceSuggestion(PriceSuggestion priceSuggestion) {
        this.priceSuggestion = priceSuggestion;
    }

    public Dictionaries getDictionaries() {
        return dictionaries;
    }

    public void setDictionaries(Dictionaries dictionaries) {
        this.dictionaries = dictionaries;
    }

    public Moderation getModeration() {
        return moderation;
    }

    public void setModeration(Moderation moderation) {
        this.moderation = moderation;
    }

    public Search getSearch() {
        return search;
    }

    public void setSearch(Search search) {
        this.search = search;
    }

    public SqlGenerator getSqlGenerator() {
        return sqlGenerator;
    }

    public void setSqlGenerator(SqlGenerator sqlGenerator) {
        this.sqlGenerator = sqlGenerator;
    }

    public static class Features {
        private FeaturePolicy chat = new FeaturePolicy();
        private FeaturePolicy queryData = new FeaturePolicy();
        private FeaturePolicy generateRoomDescription = new FeaturePolicy();
        private FeaturePolicy suggestRoomPrice = new FeaturePolicy();
        private FeaturePolicy anomalyReport = new FeaturePolicy();
        private FeaturePolicy reminderDraft = new FeaturePolicy();
        private FeaturePolicy moderation = new FeaturePolicy();

        public FeaturePolicy getChat() {
            return chat;
        }

        public void setChat(FeaturePolicy chat) {
            this.chat = chat;
        }

        public FeaturePolicy getQueryData() {
            return queryData;
        }

        public void setQueryData(FeaturePolicy queryData) {
            this.queryData = queryData;
        }

        public FeaturePolicy getGenerateRoomDescription() {
            return generateRoomDescription;
        }

        public void setGenerateRoomDescription(FeaturePolicy generateRoomDescription) {
            this.generateRoomDescription = generateRoomDescription;
        }

        public FeaturePolicy getSuggestRoomPrice() {
            return suggestRoomPrice;
        }

        public void setSuggestRoomPrice(FeaturePolicy suggestRoomPrice) {
            this.suggestRoomPrice = suggestRoomPrice;
        }

        public FeaturePolicy getAnomalyReport() {
            return anomalyReport;
        }

        public void setAnomalyReport(FeaturePolicy anomalyReport) {
            this.anomalyReport = anomalyReport;
        }

        public FeaturePolicy getReminderDraft() {
            return reminderDraft;
        }

        public void setReminderDraft(FeaturePolicy reminderDraft) {
            this.reminderDraft = reminderDraft;
        }

        public FeaturePolicy getModeration() {
            return moderation;
        }

        public void setModeration(FeaturePolicy moderation) {
            this.moderation = moderation;
        }
    }

    public static class FeaturePolicy {
        private boolean llmEnabled = true;
        private String fallback = "TEMPLATE";
        private String mode = "";

        public boolean isLlmEnabled() {
            return llmEnabled;
        }

        public void setLlmEnabled(boolean llmEnabled) {
            this.llmEnabled = llmEnabled;
        }

        public String getFallback() {
            return fallback;
        }

        public void setFallback(String fallback) {
            this.fallback = fallback;
        }

        public String getMode() {
            return mode;
        }

        public void setMode(String mode) {
            this.mode = mode;
        }
    }

    public static class Templates {
        private QueryData queryData = new QueryData();
        private Reminder reminder = new Reminder();
        private Anomaly anomaly = new Anomaly();
        private RoomDescription roomDescription = new RoomDescription();

        public QueryData getQueryData() {
            return queryData;
        }

        public void setQueryData(QueryData queryData) {
            this.queryData = queryData;
        }

        public Reminder getReminder() {
            return reminder;
        }

        public void setReminder(Reminder reminder) {
            this.reminder = reminder;
        }

        public Anomaly getAnomaly() {
            return anomaly;
        }

        public void setAnomaly(Anomaly anomaly) {
            this.anomaly = anomaly;
        }

        public RoomDescription getRoomDescription() {
            return roomDescription;
        }

        public void setRoomDescription(RoomDescription roomDescription) {
            this.roomDescription = roomDescription;
        }
    }

    public static class QueryData {
        private String unsupported = "Da, he thong chua du du lieu de xu ly cau hoi nay o che do hien tai.";

        public String getUnsupported() {
            return unsupported;
        }

        public void setUnsupported(String unsupported) {
            this.unsupported = unsupported;
        }
    }

    public static class Reminder {
        private String dueSoon = "Chào {tenantName}, phòng {roomName} sắp đến hạn thanh toán. Tổng số tiền kỳ này là {amount}, hạn cuối {deadline}. Nhớ bạn thanh toán đúng hạn giúp mình.";
        private String overdue = "Chào {tenantName}, phòng {roomName} hiện đang quá hạn/chưa thanh toán. Tổng số tiền cần thanh toán là {amount}, hạn {deadline}. Bạn vui lòng thanh toán sớm để tránh phát sinh phí phạt.";

        public String getDueSoon() {
            return dueSoon;
        }

        public void setDueSoon(String dueSoon) {
            this.dueSoon = dueSoon;
        }

        public String getOverdue() {
            return overdue;
        }

        public void setOverdue(String overdue) {
            this.overdue = overdue;
        }
    }

    public static class Anomaly {
        private String header = "Bao cao bat thuong dien nuoc thang {month}/{year}";
        private String recommendation = "De xuat: Kiem tra thiet bi cong suat lon, ra soat ro ri, va lien he khach thue de xac minh nhu cau su dung thuc te.";
        private List<String> summary = new ArrayList<>(List.of(
                "Kiểm tra phòng có dấu hiệu tăng đột biến >35% ngay trong kỳ tiếp theo.",
                "Đặt ngưỡng cảnh báo cho phòng vượt >2.0x điện hoặc >1.5x nước so với trung bình.",
                "Uu tien xu ly truong hop vuot nguong cao de giam rui ro chay no/ngap nuoc."
        ));

        public String getHeader() {
            return header;
        }

        public void setHeader(String header) {
            this.header = header;
        }

        public String getRecommendation() {
            return recommendation;
        }

        public void setRecommendation(String recommendation) {
            this.recommendation = recommendation;
        }

        public List<String> getSummary() {
            return summary;
        }

        public void setSummary(List<String> summary) {
            this.summary = summary;
        }
    }

    public static class RoomDescription {
        private String base = "Phòng trọ có thông tin nổi bật: {prompt}. Không gian được tối ưu cho nhu cầu ở lâu dài, phù hợp sinh hoạt hàng ngày. Mức giá và tiện ích được cân đối để đảm bảo chi phí hợp lý.";

        public String getBase() {
            return base;
        }

        public void setBase(String base) {
            this.base = base;
        }
    }

    public static class PriceSuggestion {
        private double basePerM2 = 110000.0;
        private double rangeMinFactor = 0.9;
        private double rangeMaxFactor = 1.1;
        private double amenityBonusPerItem = 150000.0;
        private int amenityBonusCapItems = 4;
        private Map<String, Double> typeMultipliers = new HashMap<>(Map.of(
                "STUDIO", 1.12,
                "ONE_BEDROOM", 1.08,
                "TWO_BEDROOM", 1.18,
                "SHARED_ROOM", 0.82,
                "MEZZANINE_ROOM", 1.10,
                "DEFAULT", 1.0
        ));
        private Map<String, Double> districtKeywordMultipliers = new HashMap<>(Map.ofEntries(
                Map.entry("quan 1", 1.15),
                Map.entry("quan 3", 1.15),
                Map.entry("binh thanh", 1.15),
                Map.entry("phu nhuan", 1.15),
                Map.entry("quan 7", 1.10),
                Map.entry("quan 2", 1.10),
                Map.entry("thu duc", 1.10),
                Map.entry("quan 12", 0.92),
                Map.entry("binh tan", 0.92),
                Map.entry("hoc mon", 0.92),
                Map.entry("cu chi", 0.92)
        ));

        public double getBasePerM2() {
            return basePerM2;
        }

        public void setBasePerM2(double basePerM2) {
            this.basePerM2 = basePerM2;
        }

        public double getRangeMinFactor() {
            return rangeMinFactor;
        }

        public void setRangeMinFactor(double rangeMinFactor) {
            this.rangeMinFactor = rangeMinFactor;
        }

        public double getRangeMaxFactor() {
            return rangeMaxFactor;
        }

        public void setRangeMaxFactor(double rangeMaxFactor) {
            this.rangeMaxFactor = rangeMaxFactor;
        }

        public double getAmenityBonusPerItem() {
            return amenityBonusPerItem;
        }

        public void setAmenityBonusPerItem(double amenityBonusPerItem) {
            this.amenityBonusPerItem = amenityBonusPerItem;
        }

        public int getAmenityBonusCapItems() {
            return amenityBonusCapItems;
        }

        public void setAmenityBonusCapItems(int amenityBonusCapItems) {
            this.amenityBonusCapItems = amenityBonusCapItems;
        }

        public Map<String, Double> getTypeMultipliers() {
            return typeMultipliers;
        }

        public void setTypeMultipliers(Map<String, Double> typeMultipliers) {
            this.typeMultipliers = typeMultipliers;
        }

        public Map<String, Double> getDistrictKeywordMultipliers() {
            return districtKeywordMultipliers;
        }

        public void setDistrictKeywordMultipliers(Map<String, Double> districtKeywordMultipliers) {
            this.districtKeywordMultipliers = districtKeywordMultipliers;
        }
    }

    public static class Dictionaries {
        private Map<String, String> districtAliases = new HashMap<>();

        public Map<String, String> getDistrictAliases() {
            return districtAliases;
        }

        public void setDistrictAliases(Map<String, String> districtAliases) {
            this.districtAliases = districtAliases;
        }
    }

    public static class Moderation {
        private ImageQuality imageQuality = new ImageQuality();
        private SceneClassifier sceneClassifier = new SceneClassifier();

        public ImageQuality getImageQuality() {
            return imageQuality;
        }

        public void setImageQuality(ImageQuality imageQuality) {
            this.imageQuality = imageQuality;
        }

        public SceneClassifier getSceneClassifier() {
            return sceneClassifier;
        }

        public void setSceneClassifier(SceneClassifier sceneClassifier) {
            this.sceneClassifier = sceneClassifier;
        }

        public static class ImageQuality {
            private boolean enabled = true;
            private int minWidth = 640;
            private int minHeight = 480;
            private int maxDownloadBytes = 3_000_000;
            private int timeoutMs = 3000;
            private int maxImagesToInspect = 6;
            private boolean requireHttps = true;
            private boolean blockPrivateNetwork = true;
            private List<String> allowedHosts = new ArrayList<>();

            public boolean isEnabled() {
                return enabled;
            }

            public void setEnabled(boolean enabled) {
                this.enabled = enabled;
            }

            public int getMinWidth() {
                return minWidth;
            }

            public void setMinWidth(int minWidth) {
                this.minWidth = minWidth;
            }

            public int getMinHeight() {
                return minHeight;
            }

            public void setMinHeight(int minHeight) {
                this.minHeight = minHeight;
            }

            public int getMaxDownloadBytes() {
                return maxDownloadBytes;
            }

            public void setMaxDownloadBytes(int maxDownloadBytes) {
                this.maxDownloadBytes = maxDownloadBytes;
            }

            public int getTimeoutMs() {
                return timeoutMs;
            }

            public void setTimeoutMs(int timeoutMs) {
                this.timeoutMs = timeoutMs;
            }

            public int getMaxImagesToInspect() {
                return maxImagesToInspect;
            }

            public void setMaxImagesToInspect(int maxImagesToInspect) {
                this.maxImagesToInspect = maxImagesToInspect;
            }

            public boolean isRequireHttps() {
                return requireHttps;
            }

            public void setRequireHttps(boolean requireHttps) {
                this.requireHttps = requireHttps;
            }

            public boolean isBlockPrivateNetwork() {
                return blockPrivateNetwork;
            }

            public void setBlockPrivateNetwork(boolean blockPrivateNetwork) {
                this.blockPrivateNetwork = blockPrivateNetwork;
            }

            public List<String> getAllowedHosts() {
                return allowedHosts;
            }

            public void setAllowedHosts(List<String> allowedHosts) {
                this.allowedHosts = allowedHosts;
            }
        }

        public static class SceneClassifier {
            private boolean enabled = false;
            private String modelPath = "models/scene-classifier/model.onnx";
            private String labelsPath = "models/scene-classifier/labels.txt";
            private int maxImagesToClassify = 5;
            private int timeoutMs = 3000;
            private double minConfidence = 0.50;
            private double roomLikeThreshold = 0.60;
            private List<String> suspiciousLabels = new ArrayList<>(List.of("DOCUMENT", "OTHER"));
            private int inputWidth = 224;
            private int inputHeight = 224;
            
            // New risk gate properties
            private int lowRoomLikeCapScore = 69;
            private double highSuspiciousRatio = 0.50;
            private int highSuspiciousCapScore = 59;
            private double severeSuspiciousRatio = 0.75;
            private int severeSuspiciousCapScore = 49;
            private int maxLowRiskWhenNeedsReview = 79;
            
            private Map<String, String> labelMapping = new HashMap<>();

            public boolean isEnabled() {
                return enabled;
            }

            public void setEnabled(boolean enabled) {
                this.enabled = enabled;
            }

            public String getModelPath() {
                return modelPath;
            }

            public void setModelPath(String modelPath) {
                this.modelPath = modelPath;
            }

            public String getLabelsPath() {
                return labelsPath;
            }

            public void setLabelsPath(String labelsPath) {
                this.labelsPath = labelsPath;
            }

            public int getMaxImagesToClassify() {
                return maxImagesToClassify;
            }

            public void setMaxImagesToClassify(int maxImagesToClassify) {
                this.maxImagesToClassify = maxImagesToClassify;
            }

            public int getTimeoutMs() {
                return timeoutMs;
            }

            public void setTimeoutMs(int timeoutMs) {
                this.timeoutMs = timeoutMs;
            }

            public double getMinConfidence() {
                return minConfidence;
            }

            public void setMinConfidence(double minConfidence) {
                this.minConfidence = minConfidence;
            }

            public double getRoomLikeThreshold() {
                return roomLikeThreshold;
            }

            public void setRoomLikeThreshold(double roomLikeThreshold) {
                this.roomLikeThreshold = roomLikeThreshold;
            }

            public List<String> getSuspiciousLabels() {
                return suspiciousLabels;
            }

            public void setSuspiciousLabels(List<String> suspiciousLabels) {
                this.suspiciousLabels = suspiciousLabels;
            }

            public int getLowRoomLikeCapScore() {
                return lowRoomLikeCapScore;
            }

            public void setLowRoomLikeCapScore(int lowRoomLikeCapScore) {
                this.lowRoomLikeCapScore = lowRoomLikeCapScore;
            }

            public double getHighSuspiciousRatio() {
                return highSuspiciousRatio;
            }

            public void setHighSuspiciousRatio(double highSuspiciousRatio) {
                this.highSuspiciousRatio = highSuspiciousRatio;
            }

            public int getHighSuspiciousCapScore() {
                return highSuspiciousCapScore;
            }

            public void setHighSuspiciousCapScore(int highSuspiciousCapScore) {
                this.highSuspiciousCapScore = highSuspiciousCapScore;
            }

            public double getSevereSuspiciousRatio() {
                return severeSuspiciousRatio;
            }

            public void setSevereSuspiciousRatio(double severeSuspiciousRatio) {
                this.severeSuspiciousRatio = severeSuspiciousRatio;
            }

            public int getSevereSuspiciousCapScore() {
                return severeSuspiciousCapScore;
            }

            public void setSevereSuspiciousCapScore(int severeSuspiciousCapScore) {
                this.severeSuspiciousCapScore = severeSuspiciousCapScore;
            }

            public int getMaxLowRiskWhenNeedsReview() {
                return maxLowRiskWhenNeedsReview;
            }

            public void setMaxLowRiskWhenNeedsReview(int maxLowRiskWhenNeedsReview) {
                this.maxLowRiskWhenNeedsReview = maxLowRiskWhenNeedsReview;
            }

            public int getInputWidth() {
                return inputWidth;
            }

            public void setInputWidth(int inputWidth) {
                this.inputWidth = inputWidth;
            }

            public int getInputHeight() {
                return inputHeight;
            }

            public void setInputHeight(int inputHeight) {
                this.inputHeight = inputHeight;
            }

            public Map<String, String> getLabelMapping() {
                return labelMapping;
            }

            public void setLabelMapping(Map<String, String> labelMapping) {
                this.labelMapping = labelMapping;
            }
        }
    }

    public static class Search {
        private double defaultRadiusKm = 5.0;
        private double cheapPriceWeight = 0.60;
        private double cheapDistanceWeight = 0.40;
        private double cheapPercentile = 30.0;
        private int cheapMinSamples = 5;
        private double cheapPercentileBoost = 0.10;

        public double getDefaultRadiusKm() {
            return defaultRadiusKm;
        }

        public void setDefaultRadiusKm(double defaultRadiusKm) {
            this.defaultRadiusKm = defaultRadiusKm;
        }

        public double getCheapPriceWeight() {
            return cheapPriceWeight;
        }

        public void setCheapPriceWeight(double cheapPriceWeight) {
            this.cheapPriceWeight = cheapPriceWeight;
        }

        public double getCheapDistanceWeight() {
            return cheapDistanceWeight;
        }

        public void setCheapDistanceWeight(double cheapDistanceWeight) {
            this.cheapDistanceWeight = cheapDistanceWeight;
        }

        public double getCheapPercentile() {
            return cheapPercentile;
        }

        public void setCheapPercentile(double cheapPercentile) {
            this.cheapPercentile = cheapPercentile;
        }

        public int getCheapMinSamples() {
            return cheapMinSamples;
        }

        public void setCheapMinSamples(int cheapMinSamples) {
            this.cheapMinSamples = cheapMinSamples;
        }

        public double getCheapPercentileBoost() {
            return cheapPercentileBoost;
        }

        public void setCheapPercentileBoost(double cheapPercentileBoost) {
            this.cheapPercentileBoost = cheapPercentileBoost;
        }
    }

    public static class SqlGenerator {
        private boolean enabled = false;

        public boolean isEnabled() {
            return enabled;
        }

        public void setEnabled(boolean enabled) {
            this.enabled = enabled;
        }
    }
}

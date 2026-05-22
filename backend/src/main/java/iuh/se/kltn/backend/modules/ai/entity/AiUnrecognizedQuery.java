/*
 * Decompiled with CFR 0.152.
 * 
 * Could not load the following classes:
 *  jakarta.persistence.Column
 *  jakarta.persistence.Entity
 *  jakarta.persistence.GeneratedValue
 *  jakarta.persistence.GenerationType
 *  jakarta.persistence.Id
 *  jakarta.persistence.Table
 */
package iuh.se.kltn.backend.modules.ai.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.time.LocalDateTime;

@Entity
@Table(name="ai_unrecognized_query")
public class AiUnrecognizedQuery {
    @Id
    @GeneratedValue(strategy=GenerationType.IDENTITY)
    private Long id;
    private Long userId;
    @Column(columnDefinition="TEXT", nullable=false)
    private String question;
    @Column(columnDefinition="TEXT")
    private String normalizedQuestion;
    @Column(length=100)
    private String predictedIntent;
    private Double matchScore;
    @Column(length=30)
    private String intentSource;
    @Column(length=30)
    private String llmMode;
    @Column(columnDefinition="TEXT")
    private String entitiesJson;
    @Column(length=255)
    private String reason;
    @Column(length=100)
    private String adminLabel;
    @Column(length=30)
    private String status;
    private LocalDateTime createdAt;

    private static String $default$status() {
        return "PENDING";
    }

    private static LocalDateTime $default$createdAt() {
        return LocalDateTime.now();
    }

    public static AiUnrecognizedQueryBuilder builder() {
        return new AiUnrecognizedQueryBuilder();
    }

    public Long getId() {
        return this.id;
    }

    public Long getUserId() {
        return this.userId;
    }

    public String getQuestion() {
        return this.question;
    }

    public String getNormalizedQuestion() {
        return this.normalizedQuestion;
    }

    public String getPredictedIntent() {
        return this.predictedIntent;
    }

    public Double getMatchScore() {
        return this.matchScore;
    }

    public String getIntentSource() {
        return this.intentSource;
    }

    public String getLlmMode() {
        return this.llmMode;
    }

    public String getEntitiesJson() {
        return this.entitiesJson;
    }

    public String getReason() {
        return this.reason;
    }

    public String getAdminLabel() {
        return this.adminLabel;
    }

    public String getStatus() {
        return this.status;
    }

    public LocalDateTime getCreatedAt() {
        return this.createdAt;
    }

    public void setId(Long id) {
        this.id = id;
    }

    public void setUserId(Long userId) {
        this.userId = userId;
    }

    public void setQuestion(String question) {
        this.question = question;
    }

    public void setNormalizedQuestion(String normalizedQuestion) {
        this.normalizedQuestion = normalizedQuestion;
    }

    public void setPredictedIntent(String predictedIntent) {
        this.predictedIntent = predictedIntent;
    }

    public void setMatchScore(Double matchScore) {
        this.matchScore = matchScore;
    }

    public void setIntentSource(String intentSource) {
        this.intentSource = intentSource;
    }

    public void setLlmMode(String llmMode) {
        this.llmMode = llmMode;
    }

    public void setEntitiesJson(String entitiesJson) {
        this.entitiesJson = entitiesJson;
    }

    public void setReason(String reason) {
        this.reason = reason;
    }

    public void setAdminLabel(String adminLabel) {
        this.adminLabel = adminLabel;
    }

    public void setStatus(String status) {
        this.status = status;
    }

    public void setCreatedAt(LocalDateTime createdAt) {
        this.createdAt = createdAt;
    }

    public boolean equals(Object o) {
        if (o == this) {
            return true;
        }
        if (!(o instanceof AiUnrecognizedQuery)) {
            return false;
        }
        AiUnrecognizedQuery other = (AiUnrecognizedQuery)o;
        if (!other.canEqual(this)) {
            return false;
        }
        Long this$id = this.getId();
        Long other$id = other.getId();
        if (this$id == null ? other$id != null : !((Object)this$id).equals(other$id)) {
            return false;
        }
        Long this$userId = this.getUserId();
        Long other$userId = other.getUserId();
        if (this$userId == null ? other$userId != null : !((Object)this$userId).equals(other$userId)) {
            return false;
        }
        Double this$matchScore = this.getMatchScore();
        Double other$matchScore = other.getMatchScore();
        if (this$matchScore == null ? other$matchScore != null : !((Object)this$matchScore).equals(other$matchScore)) {
            return false;
        }
        String this$question = this.getQuestion();
        String other$question = other.getQuestion();
        if (this$question == null ? other$question != null : !this$question.equals(other$question)) {
            return false;
        }
        String this$normalizedQuestion = this.getNormalizedQuestion();
        String other$normalizedQuestion = other.getNormalizedQuestion();
        if (this$normalizedQuestion == null ? other$normalizedQuestion != null : !this$normalizedQuestion.equals(other$normalizedQuestion)) {
            return false;
        }
        String this$predictedIntent = this.getPredictedIntent();
        String other$predictedIntent = other.getPredictedIntent();
        if (this$predictedIntent == null ? other$predictedIntent != null : !this$predictedIntent.equals(other$predictedIntent)) {
            return false;
        }
        String this$intentSource = this.getIntentSource();
        String other$intentSource = other.getIntentSource();
        if (this$intentSource == null ? other$intentSource != null : !this$intentSource.equals(other$intentSource)) {
            return false;
        }
        String this$llmMode = this.getLlmMode();
        String other$llmMode = other.getLlmMode();
        if (this$llmMode == null ? other$llmMode != null : !this$llmMode.equals(other$llmMode)) {
            return false;
        }
        String this$entitiesJson = this.getEntitiesJson();
        String other$entitiesJson = other.getEntitiesJson();
        if (this$entitiesJson == null ? other$entitiesJson != null : !this$entitiesJson.equals(other$entitiesJson)) {
            return false;
        }
        String this$reason = this.getReason();
        String other$reason = other.getReason();
        if (this$reason == null ? other$reason != null : !this$reason.equals(other$reason)) {
            return false;
        }
        String this$adminLabel = this.getAdminLabel();
        String other$adminLabel = other.getAdminLabel();
        if (this$adminLabel == null ? other$adminLabel != null : !this$adminLabel.equals(other$adminLabel)) {
            return false;
        }
        String this$status = this.getStatus();
        String other$status = other.getStatus();
        if (this$status == null ? other$status != null : !this$status.equals(other$status)) {
            return false;
        }
        LocalDateTime this$createdAt = this.getCreatedAt();
        LocalDateTime other$createdAt = other.getCreatedAt();
        return !(this$createdAt == null ? other$createdAt != null : !((Object)this$createdAt).equals(other$createdAt));
    }

    protected boolean canEqual(Object other) {
        return other instanceof AiUnrecognizedQuery;
    }

    public int hashCode() {
        int PRIME = 59;
        int result = 1;
        Long $id = this.getId();
        result = result * 59 + ($id == null ? 43 : ((Object)$id).hashCode());
        Long $userId = this.getUserId();
        result = result * 59 + ($userId == null ? 43 : ((Object)$userId).hashCode());
        Double $matchScore = this.getMatchScore();
        result = result * 59 + ($matchScore == null ? 43 : ((Object)$matchScore).hashCode());
        String $question = this.getQuestion();
        result = result * 59 + ($question == null ? 43 : $question.hashCode());
        String $normalizedQuestion = this.getNormalizedQuestion();
        result = result * 59 + ($normalizedQuestion == null ? 43 : $normalizedQuestion.hashCode());
        String $predictedIntent = this.getPredictedIntent();
        result = result * 59 + ($predictedIntent == null ? 43 : $predictedIntent.hashCode());
        String $intentSource = this.getIntentSource();
        result = result * 59 + ($intentSource == null ? 43 : $intentSource.hashCode());
        String $llmMode = this.getLlmMode();
        result = result * 59 + ($llmMode == null ? 43 : $llmMode.hashCode());
        String $entitiesJson = this.getEntitiesJson();
        result = result * 59 + ($entitiesJson == null ? 43 : $entitiesJson.hashCode());
        String $reason = this.getReason();
        result = result * 59 + ($reason == null ? 43 : $reason.hashCode());
        String $adminLabel = this.getAdminLabel();
        result = result * 59 + ($adminLabel == null ? 43 : $adminLabel.hashCode());
        String $status = this.getStatus();
        result = result * 59 + ($status == null ? 43 : $status.hashCode());
        LocalDateTime $createdAt = this.getCreatedAt();
        result = result * 59 + ($createdAt == null ? 43 : ((Object)$createdAt).hashCode());
        return result;
    }

    public String toString() {
        return "AiUnrecognizedQuery(id=" + this.getId() + ", userId=" + this.getUserId() + ", question=" + this.getQuestion() + ", normalizedQuestion=" + this.getNormalizedQuestion() + ", predictedIntent=" + this.getPredictedIntent() + ", matchScore=" + this.getMatchScore() + ", intentSource=" + this.getIntentSource() + ", llmMode=" + this.getLlmMode() + ", entitiesJson=" + this.getEntitiesJson() + ", reason=" + this.getReason() + ", adminLabel=" + this.getAdminLabel() + ", status=" + this.getStatus() + ", createdAt=" + String.valueOf(this.getCreatedAt()) + ")";
    }

    public AiUnrecognizedQuery() {
        this.status = AiUnrecognizedQuery.$default$status();
        this.createdAt = AiUnrecognizedQuery.$default$createdAt();
    }

    public AiUnrecognizedQuery(Long id, Long userId, String question, String normalizedQuestion, String predictedIntent, Double matchScore, String intentSource, String llmMode, String entitiesJson, String reason, String adminLabel, String status, LocalDateTime createdAt) {
        this.id = id;
        this.userId = userId;
        this.question = question;
        this.normalizedQuestion = normalizedQuestion;
        this.predictedIntent = predictedIntent;
        this.matchScore = matchScore;
        this.intentSource = intentSource;
        this.llmMode = llmMode;
        this.entitiesJson = entitiesJson;
        this.reason = reason;
        this.adminLabel = adminLabel;
        this.status = status;
        this.createdAt = createdAt;
    }

    public static class AiUnrecognizedQueryBuilder {
        private Long id;
        private Long userId;
        private String question;
        private String normalizedQuestion;
        private String predictedIntent;
        private Double matchScore;
        private String intentSource;
        private String llmMode;
        private String entitiesJson;
        private String reason;
        private String adminLabel;
        private boolean status$set;
        private String status$value;
        private boolean createdAt$set;
        private LocalDateTime createdAt$value;

        AiUnrecognizedQueryBuilder() {
        }

        public AiUnrecognizedQueryBuilder id(Long id) {
            this.id = id;
            return this;
        }

        public AiUnrecognizedQueryBuilder userId(Long userId) {
            this.userId = userId;
            return this;
        }

        public AiUnrecognizedQueryBuilder question(String question) {
            this.question = question;
            return this;
        }

        public AiUnrecognizedQueryBuilder normalizedQuestion(String normalizedQuestion) {
            this.normalizedQuestion = normalizedQuestion;
            return this;
        }

        public AiUnrecognizedQueryBuilder predictedIntent(String predictedIntent) {
            this.predictedIntent = predictedIntent;
            return this;
        }

        public AiUnrecognizedQueryBuilder matchScore(Double matchScore) {
            this.matchScore = matchScore;
            return this;
        }

        public AiUnrecognizedQueryBuilder intentSource(String intentSource) {
            this.intentSource = intentSource;
            return this;
        }

        public AiUnrecognizedQueryBuilder llmMode(String llmMode) {
            this.llmMode = llmMode;
            return this;
        }

        public AiUnrecognizedQueryBuilder entitiesJson(String entitiesJson) {
            this.entitiesJson = entitiesJson;
            return this;
        }

        public AiUnrecognizedQueryBuilder reason(String reason) {
            this.reason = reason;
            return this;
        }

        public AiUnrecognizedQueryBuilder adminLabel(String adminLabel) {
            this.adminLabel = adminLabel;
            return this;
        }

        public AiUnrecognizedQueryBuilder status(String status) {
            this.status$value = status;
            this.status$set = true;
            return this;
        }

        public AiUnrecognizedQueryBuilder createdAt(LocalDateTime createdAt) {
            this.createdAt$value = createdAt;
            this.createdAt$set = true;
            return this;
        }

        public AiUnrecognizedQuery build() {
            String status$value = this.status$value;
            if (!this.status$set) {
                status$value = AiUnrecognizedQuery.$default$status();
            }
            LocalDateTime createdAt$value = this.createdAt$value;
            if (!this.createdAt$set) {
                createdAt$value = AiUnrecognizedQuery.$default$createdAt();
            }
            return new AiUnrecognizedQuery(this.id, this.userId, this.question, this.normalizedQuestion, this.predictedIntent, this.matchScore, this.intentSource, this.llmMode, this.entitiesJson, this.reason, this.adminLabel, status$value, createdAt$value);
        }

        public String toString() {
            return "AiUnrecognizedQuery.AiUnrecognizedQueryBuilder(id=" + this.id + ", userId=" + this.userId + ", question=" + this.question + ", normalizedQuestion=" + this.normalizedQuestion + ", predictedIntent=" + this.predictedIntent + ", matchScore=" + this.matchScore + ", intentSource=" + this.intentSource + ", llmMode=" + this.llmMode + ", entitiesJson=" + this.entitiesJson + ", reason=" + this.reason + ", adminLabel=" + this.adminLabel + ", status$value=" + this.status$value + ", createdAt$value=" + String.valueOf(this.createdAt$value) + ")";
        }
    }
}

/*
 * Decompiled with CFR 0.152.
 */
package iuh.se.kltn.backend.modules.ai.dto;

import java.util.List;
import java.util.Map;

public class AiRawResult {
    private String intent;
    private String intentSource;
    private String userRole;
    private List<Map<String, Object>> rows;
    private Map<String, Object> summary;
    private int totalCount;

    public static AiRawResultBuilder builder() {
        return new AiRawResultBuilder();
    }

    public String getIntent() {
        return this.intent;
    }

    public String getIntentSource() {
        return this.intentSource;
    }

    public String getUserRole() {
        return this.userRole;
    }

    public List<Map<String, Object>> getRows() {
        return this.rows;
    }

    public Map<String, Object> getSummary() {
        return this.summary;
    }

    public int getTotalCount() {
        return this.totalCount;
    }

    public void setIntent(String intent) {
        this.intent = intent;
    }

    public void setIntentSource(String intentSource) {
        this.intentSource = intentSource;
    }

    public void setUserRole(String userRole) {
        this.userRole = userRole;
    }

    public void setRows(List<Map<String, Object>> rows) {
        this.rows = rows;
    }

    public void setSummary(Map<String, Object> summary) {
        this.summary = summary;
    }

    public void setTotalCount(int totalCount) {
        this.totalCount = totalCount;
    }

    public boolean equals(Object o) {
        if (o == this) {
            return true;
        }
        if (!(o instanceof AiRawResult)) {
            return false;
        }
        AiRawResult other = (AiRawResult)o;
        if (!other.canEqual(this)) {
            return false;
        }
        if (this.getTotalCount() != other.getTotalCount()) {
            return false;
        }
        String this$intent = this.getIntent();
        String other$intent = other.getIntent();
        if (this$intent == null ? other$intent != null : !this$intent.equals(other$intent)) {
            return false;
        }
        String this$intentSource = this.getIntentSource();
        String other$intentSource = other.getIntentSource();
        if (this$intentSource == null ? other$intentSource != null : !this$intentSource.equals(other$intentSource)) {
            return false;
        }
        String this$userRole = this.getUserRole();
        String other$userRole = other.getUserRole();
        if (this$userRole == null ? other$userRole != null : !this$userRole.equals(other$userRole)) {
            return false;
        }
        List<Map<String, Object>> this$rows = this.getRows();
        List<Map<String, Object>> other$rows = other.getRows();
        if (this$rows == null ? other$rows != null : !((Object)this$rows).equals(other$rows)) {
            return false;
        }
        Map<String, Object> this$summary = this.getSummary();
        Map<String, Object> other$summary = other.getSummary();
        return !(this$summary == null ? other$summary != null : !((Object)this$summary).equals(other$summary));
    }

    protected boolean canEqual(Object other) {
        return other instanceof AiRawResult;
    }

    public int hashCode() {
        int PRIME = 59;
        int result = 1;
        result = result * 59 + this.getTotalCount();
        String $intent = this.getIntent();
        result = result * 59 + ($intent == null ? 43 : $intent.hashCode());
        String $intentSource = this.getIntentSource();
        result = result * 59 + ($intentSource == null ? 43 : $intentSource.hashCode());
        String $userRole = this.getUserRole();
        result = result * 59 + ($userRole == null ? 43 : $userRole.hashCode());
        List<Map<String, Object>> $rows = this.getRows();
        result = result * 59 + ($rows == null ? 43 : ((Object)$rows).hashCode());
        Map<String, Object> $summary = this.getSummary();
        result = result * 59 + ($summary == null ? 43 : ((Object)$summary).hashCode());
        return result;
    }

    public String toString() {
        return "AiRawResult(intent=" + this.getIntent() + ", intentSource=" + this.getIntentSource() + ", userRole=" + this.getUserRole() + ", rows=" + String.valueOf(this.getRows()) + ", summary=" + String.valueOf(this.getSummary()) + ", totalCount=" + this.getTotalCount() + ")";
    }

    public AiRawResult() {
    }

    public AiRawResult(String intent, String intentSource, String userRole, List<Map<String, Object>> rows, Map<String, Object> summary, int totalCount) {
        this.intent = intent;
        this.intentSource = intentSource;
        this.userRole = userRole;
        this.rows = rows;
        this.summary = summary;
        this.totalCount = totalCount;
    }

    public static class AiRawResultBuilder {
        private String intent;
        private String intentSource;
        private String userRole;
        private List<Map<String, Object>> rows;
        private Map<String, Object> summary;
        private int totalCount;

        AiRawResultBuilder() {
        }

        public AiRawResultBuilder intent(String intent) {
            this.intent = intent;
            return this;
        }

        public AiRawResultBuilder intentSource(String intentSource) {
            this.intentSource = intentSource;
            return this;
        }

        public AiRawResultBuilder userRole(String userRole) {
            this.userRole = userRole;
            return this;
        }

        public AiRawResultBuilder rows(List<Map<String, Object>> rows) {
            this.rows = rows;
            return this;
        }

        public AiRawResultBuilder summary(Map<String, Object> summary) {
            this.summary = summary;
            return this;
        }

        public AiRawResultBuilder totalCount(int totalCount) {
            this.totalCount = totalCount;
            return this;
        }

        public AiRawResult build() {
            return new AiRawResult(this.intent, this.intentSource, this.userRole, this.rows, this.summary, this.totalCount);
        }

        public String toString() {
            return "AiRawResult.AiRawResultBuilder(intent=" + this.intent + ", intentSource=" + this.intentSource + ", userRole=" + this.userRole + ", rows=" + String.valueOf(this.rows) + ", summary=" + String.valueOf(this.summary) + ", totalCount=" + this.totalCount + ")";
        }
    }
}

package iuh.se.kltn.backend.modules.ai.service;

import iuh.se.kltn.backend.modules.contract.enums.ContractStatus;
import org.junit.jupiter.api.Test;
import org.springframework.core.io.ClassPathResource;

import java.nio.charset.StandardCharsets;
import java.text.Normalizer;
import java.util.Arrays;
import java.util.HashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Set;
import java.util.stream.Collectors;

import static org.assertj.core.api.Assertions.assertThat;

class KnowledgeSeedConsistencyTest {

    @Test
    void seedKnowledge_shouldUseValidDocumentStatuses() throws Exception {
        Map<String, SeedRow> rows = loadKnowledgeRows();
        Set<String> allowedStatuses = Set.of(
                RagKnowledgeService.STATUS_DRAFT,
                RagKnowledgeService.STATUS_PUBLISHED,
                RagKnowledgeService.STATUS_ARCHIVED,
                RagKnowledgeService.STATUS_DELETED
        );

        assertThat(rows).isNotEmpty();
        rows.values().forEach(row -> assertThat(allowedStatuses).contains(row.status()));
    }

    @Test
    void seedKnowledge_shouldUseRealContractStatusEnums() throws Exception {
        Map<String, SeedRow> rows = loadKnowledgeRows();
        String guideLandlord = rows.get("guide-landlord").content();
        String expectedContractStatuses = Arrays.stream(ContractStatus.values())
                .map(Enum::name)
                .collect(Collectors.joining(", "));

        assertThat(guideLandlord).contains(expectedContractStatuses);
        assertThat(guideLandlord).doesNotContain("DRAFT, PENDING, ACTIVE, EXPIRED, TERMINATED");
    }

    @Test
    void seedKnowledge_shouldNotClaimAutoModerationApproval() throws Exception {
        Map<String, SeedRow> rows = loadKnowledgeRows();
        String moderationPolicy = rows.get("policy-moderation").content();
        String normalized = normalizeAscii(moderationPolicy);

        assertThat(normalized).contains("trang thai pending");
        assertThat(normalized).doesNotContain("duyet tu dong");
    }

    @Test
    void seedKnowledge_shouldDescribeBillDeadlineFromSystemData() throws Exception {
        Map<String, SeedRow> rows = loadKnowledgeRows();
        String paymentPolicy = rows.get("policy-payment").content();
        String normalized = normalizeAscii(paymentPolicy);

        assertThat(normalized).contains("deadline");
        assertThat(normalized).doesNotContain("mung 5");
    }

    private Map<String, SeedRow> loadKnowledgeRows() throws Exception {
        ClassPathResource resource = new ClassPathResource("data/seed_knowledge_data.tsv");
        String tsv = new String(resource.getInputStream().readAllBytes(), StandardCharsets.UTF_8);
        String[] lines = tsv.split("\\R");

        Map<String, SeedRow> rows = new HashMap<>();
        for (int i = 1; i < lines.length; i++) {
            String line = lines[i].trim();
            if (line.isEmpty()) {
                continue;
            }
            String[] cols = line.split("\t", 6);
            assertThat(cols)
                    .as("Invalid TSV format at line %s", i + 1)
                    .hasSize(6);

            String id = cols[0].trim();
            String title = cols[1].trim();
            String content = cols[2].replace("\\n", "\n").trim();
            String source = cols[3].trim();
            String version = cols[4].trim();
            String status = cols[5].trim();
            rows.put(id, new SeedRow(id, title, content, source, version, status));
        }

        assertThat(rows.keySet()).containsAll(List.of(
                "policy-rental",
                "policy-payment",
                "policy-moderation",
                "policy-ekyc",
                "guide-tenant",
                "guide-landlord",
                "guide-ai",
                "policy-vip"
        ));
        return rows;
    }

    private String normalizeAscii(String value) {
        String normalized = Normalizer.normalize(value, Normalizer.Form.NFD);
        return normalized.replaceAll("\\p{M}+", "").toLowerCase(Locale.ROOT);
    }

    private record SeedRow(String id, String title, String content, String source, String version, String status) {
    }
}

package iuh.se.kltn.backend.modules.ai.service;

import org.junit.jupiter.api.Test;
import org.springframework.core.io.ClassPathResource;

import java.nio.charset.StandardCharsets;

import static org.assertj.core.api.Assertions.assertThat;

class FaqSeedSqlDialectConsistencyTest {

    @Test
    void seedFaqSqlFile_shouldNotContainMysqlDateFunctions() throws Exception {
        String content = readClasspathFile("data/seed_faq_data.sql");

        assertNoMysqlDateFunctions(content);
    }

    @Test
    void seedFaqCsvFile_shouldNotContainMysqlDateFunctions() throws Exception {
        String content = readClasspathFile("data/seed_faq_data.csv");

        assertNoMysqlDateFunctions(content);
    }

    @Test
    void seedFaqSqlFile_shouldNotContainDeprecatedStatusCodes() throws Exception {
        String content = readClasspathFile("data/seed_faq_data.sql");

        // Contract status cũ không còn trong hệ thống hiện tại.
        assertThat(content).doesNotContain("c.status = ''DRAFT''");
        assertThat(content).doesNotContain("c.status = ''SIGNED''");

        // Bill status cũ/không tồn tại.
        assertThat(content).doesNotContain("b.status = ''OVERDUE''");
        assertThat(content).doesNotContain("b.status = ''WAITING_PAYMENT''");
    }

    private void assertNoMysqlDateFunctions(String content) {
        assertThat(content).doesNotContain("YEAR(CURRENT_DATE)");
        assertThat(content).doesNotContain("MONTH(CURRENT_DATE)");
        assertThat(content).doesNotContain("DATEDIFF(");
        assertThat(content).doesNotContain("DATE_ADD(");
        assertThat(content).doesNotContain("DATE_SUB(");
    }

    private String readClasspathFile(String path) throws Exception {
        ClassPathResource resource = new ClassPathResource(path);
        return new String(resource.getInputStream().readAllBytes(), StandardCharsets.UTF_8);
    }
}

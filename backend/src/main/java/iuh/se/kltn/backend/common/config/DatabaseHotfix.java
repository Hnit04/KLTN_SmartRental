package iuh.se.kltn.backend.common.config;

import org.springframework.boot.CommandLineRunner;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Component;

@Component
public class DatabaseHotfix implements CommandLineRunner {
    private final JdbcTemplate jdbcTemplate;

    public DatabaseHotfix(JdbcTemplate jdbcTemplate) {
        this.jdbcTemplate = jdbcTemplate;
    }

    @Override
    public void run(String... args) {
        try {
            System.out.println("🛠️ Running Database Hotfix: Expanding status columns...");
            jdbcTemplate.execute("ALTER TABLE contracts MODIFY COLUMN status VARCHAR(50)");
            jdbcTemplate.execute("ALTER TABLE contracts MODIFY COLUMN deposit_status VARCHAR(50)");
            System.out.println("✅ Database Hotfix completed successfully!");
        } catch (Exception e) {
            System.err.println("❌ Database Hotfix failed (maybe already updated?): " + e.getMessage());
        }
    }
}

package iuh.se.kltn.backend;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.scheduling.annotation.EnableScheduling;

@SpringBootApplication
@EnableScheduling
public class BackendApplication {

    @org.springframework.context.annotation.Bean
    public org.springframework.boot.CommandLineRunner printOutbox(org.springframework.jdbc.core.JdbcTemplate jdbcTemplate) {
        return args -> {
            System.out.println("================= OUTBOX STATUS =================");
            try {
                jdbcTemplate.execute("ALTER TABLE contracts ALTER COLUMN landlord_sig_hash TYPE varchar(255)");
                jdbcTemplate.execute("ALTER TABLE contracts ALTER COLUMN tenant_sig_hash TYPE varchar(255)");
                jdbcTemplate.update("UPDATE blockchain_outbox_events SET payload = payload - 'smartContractAddress' || jsonb_build_object('contractAddress', payload->'smartContractAddress') WHERE payload->'smartContractAddress' IS NOT NULL");
                jdbcTemplate.update("UPDATE blockchain_outbox_events SET status = 'PENDING', retry_count = 0, next_attempt_at = NULL WHERE status IN ('FAILED', 'DEAD_LETTER', 'PROCESSING')");
            } catch (Exception e) {
                System.out.println("Lỗi update DB: " + e.getMessage());
            }
            jdbcTemplate.query("SELECT id, status, error_message, payload FROM blockchain_outbox_events ORDER BY id DESC LIMIT 5",
                (rs, rowNum) -> {
                    System.out.println("ID: " + rs.getLong("id") + " | STATUS: " + rs.getString("status") + " | ERROR: " + rs.getString("error_message") + " | PAYLOAD: " + rs.getString("payload"));
                    return null;
                });
            System.out.println("=================================================");
        };
    }

    public static void main(String[] args) {
        SpringApplication.run(BackendApplication.class, args);
    }

    @org.springframework.web.bind.annotation.RestController
    public static class OutboxDebugController {
        @org.springframework.beans.factory.annotation.Autowired
        private org.springframework.jdbc.core.JdbcTemplate jdbcTemplate;

        @org.springframework.web.bind.annotation.GetMapping("/api/outbox")
        public java.util.List<java.util.Map<String, Object>> getOutbox() {
            return jdbcTemplate.queryForList("SELECT * FROM blockchain_outbox_events ORDER BY id DESC LIMIT 10");
        }
    }
}

package iuh.se.kltn.backend.config;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.CommandLineRunner;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Component;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

@Component
public class FixVersionDbRunner implements CommandLineRunner {

    private static final Logger log = LoggerFactory.getLogger(FixVersionDbRunner.class);

    @Autowired
    private JdbcTemplate jdbcTemplate;

    @Override
    public void run(String... args) {
        log.info("🛠️ [FixVersionDbRunner] Đang kiểm tra và fix lỗi version = NULL trong database...");
        try {
            int propCount = jdbcTemplate.update("UPDATE properties SET version = 0 WHERE version IS NULL");
            int roomCount = jdbcTemplate.update("UPDATE rooms SET version = 0 WHERE version IS NULL");
            log.info("✅ [FixVersionDbRunner] Đã cập nhật {} properties và {} rooms có version = NULL thành 0.", propCount, roomCount);
        } catch (Exception e) {
            log.error("❌ [FixVersionDbRunner] Lỗi khi cập nhật version: {}", e.getMessage(), e);
        }
    }
}

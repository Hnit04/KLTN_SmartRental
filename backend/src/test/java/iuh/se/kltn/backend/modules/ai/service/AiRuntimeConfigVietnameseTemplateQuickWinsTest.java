package iuh.se.kltn.backend.modules.ai.service;

import org.junit.jupiter.api.Test;

import java.io.IOException;
import java.io.InputStream;
import java.nio.charset.StandardCharsets;
import java.util.Objects;

import static org.junit.jupiter.api.Assertions.assertTrue;

class AiRuntimeConfigVietnameseTemplateQuickWinsTest {

    @Test
    void templatesShouldContainVietnameseDiacritics() throws IOException {
        String yaml;
        try (InputStream inputStream = Objects.requireNonNull(
                getClass().getClassLoader().getResourceAsStream("ai-runtime-config.yml"),
                "Missing ai-runtime-config.yml in classpath"
        )) {
            yaml = new String(inputStream.readAllBytes(), StandardCharsets.UTF_8);
        }

        assertTrue(yaml.contains("Dạ, hệ thống chưa đủ dữ liệu để xử lý câu hỏi này ở chế độ hiện tại."));
        assertTrue(yaml.contains("Chào {tenantName}, phòng {roomName} sắp đến hạn thanh toán."));
        assertTrue(yaml.contains("Báo cáo bất thường điện nước tháng {month}/{year}"));
        assertTrue(yaml.contains("Phòng trọ có thông tin nổi bật: {prompt}."));
    }
}

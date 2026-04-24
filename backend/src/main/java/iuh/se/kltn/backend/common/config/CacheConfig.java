package iuh.se.kltn.backend.common.config;

import com.github.benmanes.caffeine.cache.Caffeine;
import org.springframework.cache.CacheManager;
import org.springframework.cache.annotation.EnableCaching;
import org.springframework.cache.caffeine.CaffeineCacheManager;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

import java.util.concurrent.TimeUnit;

/**
 * Cấu hình Bộ nhớ Đệm (Cache) cho hệ thống AI.
 * Sử dụng Caffeine In-Memory Cache thông qua Spring Cache Abstraction.
 * Khi cần chuyển sang Redis, chỉ cần:
 * 1. Thêm dependency spring-boot-starter-data-redis vào pom.xml
 * 2. Đổi spring.cache.type=redis trong application.yml
 * 3. KHÔNG CẦN SỬA BẤT KỲ DÒNG CODE NÀO.
 */
@Configuration
@EnableCaching
public class CacheConfig {

    @Bean
    public CacheManager cacheManager() {
        CaffeineCacheManager cacheManager = new CaffeineCacheManager("aiQueryResults");
        cacheManager.setCaffeine(Caffeine.newBuilder()
                // Tự hủy entry sau 10 phút không truy cập (cho dữ liệu realtime không bị stale)
                .expireAfterWrite(10, TimeUnit.MINUTES)
                // Giới hạn tối đa 500 entry trong RAM (Guardrail chống OOM)
                .maximumSize(500)
                // Ghi nhận số lần Hit/Miss để debug
                .recordStats()
        );
        return cacheManager;
    }
}

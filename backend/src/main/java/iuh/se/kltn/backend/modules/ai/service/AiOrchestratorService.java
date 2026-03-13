package iuh.se.kltn.backend.modules.ai.service;

import iuh.se.kltn.backend.modules.ai.entity.AiSqlCache;
import iuh.se.kltn.backend.modules.ai.repository.AiSqlCacheRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.Map;
import java.util.Optional;

@Service
public class AiOrchestratorService {

    @Autowired
    private SqlGeneratorAi sqlGeneratorAi;

    @Autowired
    private AiSqlCacheRepository cacheRepository;

    @Autowired
    private JdbcTemplate jdbcTemplate;
    @Autowired
    private DataPresenterAi dataPresenterAi;
    public Object processDataQuery(String question) {
        String normalizedQuestion = question.trim().toLowerCase();
        String sqlToExecute;

        // 1. Tìm trong "Kho tri thức"
        Optional<AiSqlCache> cachedItem = cacheRepository.findByQuestion(normalizedQuestion);

        if (cachedItem.isPresent() && cachedItem.get().isValid()) {
            sqlToExecute = cachedItem.get().getGeneratedSql();
            System.out.println("⚡ [CACHE HIT] Lấy SQL từ DB: " + sqlToExecute);
        } else {
            // 2. Nếu chưa có, nhờ Gemini sinh ra
            System.out.println("🐌 [CACHE MISS] Gọi Gemini để sinh SQL...");
            sqlToExecute = sqlGeneratorAi.generateSql(question);

            sqlToExecute = sqlToExecute.replace("```sql", "").replace("```", "").trim();

            int selectIndex = sqlToExecute.toUpperCase().indexOf("SELECT");
            if (selectIndex >= 0) {
                sqlToExecute = sqlToExecute.substring(selectIndex);
            }

            System.out.println("🤖 Gemini trả về (Đã làm sạch): " + sqlToExecute);
        }

        // 3. Thực thi câu lệnh SQL TRƯỚC
        try {
            List<Map<String, Object>> results = jdbcTemplate.queryForList(sqlToExecute);

            if (cachedItem.isEmpty()) {
                AiSqlCache newCache = AiSqlCache.builder()
                        .question(normalizedQuestion)
                        .generatedSql(sqlToExecute)
                        .isValid(true)
                        .build();
                cacheRepository.save(newCache);
                System.out.println("💾 Đã lưu SQL mới vào Kho tri thức thành công!");
            }

            String rawDataStr = results.isEmpty() ? "Không tìm thấy dữ liệu." : results.toString();
            System.out.println("Dữ liệu thô: " + rawDataStr);

            String naturalResponse = dataPresenterAi.generateNaturalResponse(question, rawDataStr);

            return naturalResponse;

        } catch (Exception e) {
            System.err.println("❌ Lỗi thực thi SQL: " + e.getMessage());
            return "Dạ, hệ thống đang gặp chút khó khăn khi tra cứu thông tin này. Bạn vui lòng thử lại sau nhé!";
        }
    }
}
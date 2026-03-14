package iuh.se.kltn.backend.modules.ai.service;

import dev.langchain4j.data.document.Document;
import dev.langchain4j.data.document.Metadata;
import dev.langchain4j.data.document.splitter.DocumentSplitters;
import dev.langchain4j.data.segment.TextSegment;
import dev.langchain4j.model.embedding.EmbeddingModel;
import dev.langchain4j.store.embedding.EmbeddingStore;
import dev.langchain4j.store.embedding.EmbeddingStoreIngestor;
import jakarta.annotation.PostConstruct;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.core.io.Resource;
import org.springframework.core.io.ResourceLoader;
import org.springframework.stereotype.Service;

import java.nio.charset.StandardCharsets;

@Service
public class RagIngestionService {

    @Autowired
    private EmbeddingModel embeddingModel;

    @Autowired
    private EmbeddingStore<TextSegment> embeddingStore;

    @Autowired
    private ResourceLoader resourceLoader;

    @PostConstruct
    public void initRagData() {
        try {
            System.out.println("📚 Đang nạp tài liệu Nội quy vào Vector Store...");

            // 1. Đọc file từ thư mục resources
            Resource resource = resourceLoader.getResource("classpath:noiquy.txt");
            if (!resource.exists()) {
                System.out.println("⚠️ Không tìm thấy file noiquy.txt");
                return;
            }
            String content = new String(resource.getInputStream().readAllBytes(), StandardCharsets.UTF_8);

            // 2. Tạo Document và dán nhãn type = document
            Document document = Document.from(content, Metadata.from("type", "document"));

            // 3. Công cụ băm tài liệu (Chia nhỏ 300 ký tự / đoạn, chồng lấp 50 ký tự để không mất ngữ cảnh)
            EmbeddingStoreIngestor ingestor = EmbeddingStoreIngestor.builder()
                    .documentSplitter(DocumentSplitters.recursive(300, 50))
                    .embeddingModel(embeddingModel)
                    .embeddingStore(embeddingStore)
                    .build();

            // 4. Bắt đầu nạp vào RAM
            ingestor.ingest(document);
            System.out.println("✅ Đã nạp xong tài liệu RAG!");

        } catch (Exception e) {
            System.err.println("❌ Lỗi nạp tài liệu RAG: " + e.getMessage());
        }
    }
}
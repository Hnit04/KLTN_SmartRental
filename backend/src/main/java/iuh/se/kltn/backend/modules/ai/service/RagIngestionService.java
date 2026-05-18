package iuh.se.kltn.backend.modules.ai.service;

import dev.langchain4j.data.document.Document;
import dev.langchain4j.data.document.DocumentSplitter;
import dev.langchain4j.data.document.Metadata;
import dev.langchain4j.data.document.splitter.DocumentSplitters;
import dev.langchain4j.data.embedding.Embedding;
import dev.langchain4j.data.segment.TextSegment;
import dev.langchain4j.model.embedding.EmbeddingModel;
import dev.langchain4j.store.embedding.EmbeddingStore;
import iuh.se.kltn.backend.modules.ai.entity.KnowledgeDocument;
import iuh.se.kltn.backend.modules.ai.repository.KnowledgeDocumentRepository;
import jakarta.annotation.PostConstruct;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;

import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

import static dev.langchain4j.store.embedding.filter.MetadataFilterBuilder.metadataKey;

@Service
public class RagIngestionService {

    @Autowired
    private EmbeddingModel embeddingModel;

    @Autowired
    private EmbeddingStore<TextSegment> embeddingStore;

    @Autowired
    private KnowledgeDocumentRepository knowledgeDocumentRepository;

    @Autowired
    private JdbcTemplate jdbcTemplate;

    @PostConstruct
    public void initRagData() {
        try {
            seedKnowledgeDataIfEmpty();
            Map<String, Object> result = reindexAllPublishedDocuments();
            System.out.println("✅ RAG init completed: " + result);
        } catch (Exception e) {
            System.err.println("❌ RAG init failed: " + e.getMessage());
        }
    }

    /**
     * Auto-seed knowledge documents if table is empty (mirrors AiOrchestratorService.seedInitialDataIfEmpty()).
     */
    private void seedKnowledgeDataIfEmpty() {
        long count = knowledgeDocumentRepository.count();
        if (count > 0) {
            System.out.println("ℹ️ RAG knowledge đã có " + count + " tài liệu, bỏ qua seed.");
            return;
        }
        System.out.println("🌱 RAG knowledge trống! Đang nạp dữ liệu mẫu từ seed_knowledge_data.sql...");
        try {
            org.springframework.core.io.ClassPathResource resource =
                    new org.springframework.core.io.ClassPathResource("data/seed_knowledge_data.sql");
            String sql = new String(resource.getInputStream().readAllBytes(), java.nio.charset.StandardCharsets.UTF_8);
            String[] statements = sql.split(";");
            int executed = 0;
            for (String stmt : statements) {
                String trimmed = stmt.trim();
                if (trimmed.toUpperCase().startsWith("INSERT")) {
                    try {
                        jdbcTemplate.execute(trimmed);
                        executed++;
                    } catch (Exception e) {
                        System.err.println("⚠️ Lỗi seed knowledge: " + e.getMessage());
                    }
                }
            }
            System.out.println("✅ Đã seed thành công " + executed + " tài liệu tri thức vào knowledge_documents!");
        } catch (Exception e) {
            System.err.println("❌ Lỗi đọc file seed_knowledge_data.sql: " + e.getMessage());
        }
    }

    public synchronized Map<String, Object> reindexAllPublishedDocuments() {
        long start = System.currentTimeMillis();

        // Chỉ xóa chunk tài liệu RAG, giữ nguyên SQL/FAQ embeddings.
        embeddingStore.removeAll(metadataKey("type").isEqualTo("document"));

        List<KnowledgeDocument> publishedDocs = knowledgeDocumentRepository
                .findByStatusInOrderByUpdatedAtDesc(List.of(RagKnowledgeService.STATUS_PUBLISHED));

        int totalChunks = 0;
        for (KnowledgeDocument doc : publishedDocs) {
            totalChunks += ingestDocument(doc);
        }

        long elapsed = System.currentTimeMillis() - start;

        Map<String, Object> response = new LinkedHashMap<>();
        response.put("status", "success");
        response.put("documents", publishedDocs.size());
        response.put("chunks", totalChunks);
        response.put("elapsedMs", elapsed);
        return response;
    }

    public synchronized int reindexSingleDocument(String docId) {
        removeDocumentChunks(docId);

        KnowledgeDocument doc = knowledgeDocumentRepository.findById(docId).orElse(null);
        if (doc == null) {
            return 0;
        }

        if (!RagKnowledgeService.STATUS_PUBLISHED.equalsIgnoreCase(doc.getStatus())) {
            return 0;
        }

        return ingestDocument(doc);
    }

    public synchronized int removeDocumentChunks(String docId) {
        Integer before = jdbcTemplate.queryForObject(
                "SELECT COUNT(*) FROM ai_embeddings WHERE metadata_json ->> 'type' = 'document' AND metadata_json ->> 'docId' = ?",
                Integer.class,
                docId
        );

        embeddingStore.removeAll(
                metadataKey("type").isEqualTo("document")
                        .and(metadataKey("docId").isEqualTo(docId))
        );

        return before == null ? 0 : before;
    }

    public Map<String, Object> getRagStatus() {
        Long chunks = jdbcTemplate.queryForObject(
                "SELECT COUNT(*) FROM ai_embeddings WHERE metadata_json ->> 'type' = 'document'",
                Long.class
        );
        Long distinctDocs = jdbcTemplate.queryForObject(
                "SELECT COUNT(DISTINCT metadata_json ->> 'docId') FROM ai_embeddings WHERE metadata_json ->> 'type' = 'document'",
                Long.class
        );
        long publishedDocs = knowledgeDocumentRepository.countByStatusIn(List.of(RagKnowledgeService.STATUS_PUBLISHED));

        Map<String, Object> response = new LinkedHashMap<>();
        response.put("status", "success");
        response.put("publishedDocuments", publishedDocs);
        response.put("indexedDocuments", distinctDocs == null ? 0 : distinctDocs);
        response.put("indexedChunks", chunks == null ? 0 : chunks);
        return response;
    }

    private int ingestDocument(KnowledgeDocument doc) {
        if (doc.getContent() == null || doc.getContent().isBlank()) {
            return 0;
        }

        Metadata metadata = Metadata.from("type", "document")
                .put("docId", doc.getId())
                .put("title", doc.getTitle() == null ? "" : doc.getTitle())
                .put("version", doc.getVersion() == null ? "v1" : doc.getVersion())
                .put("source", doc.getSource() == null ? "INTERNAL" : doc.getSource())
                .put("status", doc.getStatus() == null ? "UNKNOWN" : doc.getStatus());

        Document document = Document.from(doc.getContent(), metadata);

        DocumentSplitter splitter = selectSplitter(doc);
        List<TextSegment> chunks = splitter.split(document);

        List<Embedding> embeddings = new ArrayList<>(chunks.size());
        int chunkIndex = 0;
        for (TextSegment chunk : chunks) {
            Metadata chunkMetadata = Metadata.from(chunk.metadata().toMap())
                    .put("chunkIndex", String.valueOf(chunkIndex++));
            TextSegment chunkWithIndex = TextSegment.from(chunk.text(), chunkMetadata);
            embeddings.add(embeddingModel.embed(chunkWithIndex.text()).content());
            // Replace the original chunk by one carrying chunkIndex metadata.
            chunks.set(chunkIndex - 1, chunkWithIndex);
        }

        embeddingStore.addAll(embeddings, chunks);
        return chunks.size();
    }

    private DocumentSplitter selectSplitter(KnowledgeDocument doc) {
        String source = doc.getSource() == null ? "" : doc.getSource().toUpperCase();

        // Tài liệu pháp lý thường dài và ngữ cảnh đan chéo -> chunk lớn hơn.
        if (source.contains("LEGAL") || source.contains("PHAP_LY") || source.contains("LAW")) {
            return DocumentSplitters.recursive(800, 150);
        }

        // Mặc định cho policy/guide/faq dài: chunk vừa phải.
        return DocumentSplitters.recursive(500, 100);
    }
}

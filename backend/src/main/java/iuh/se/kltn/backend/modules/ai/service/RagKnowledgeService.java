package iuh.se.kltn.backend.modules.ai.service;

import iuh.se.kltn.backend.modules.ai.dto.request.RagDocumentRequest;
import iuh.se.kltn.backend.modules.ai.entity.KnowledgeDocument;
import iuh.se.kltn.backend.modules.ai.repository.KnowledgeDocumentRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.time.LocalDateTime;
import java.util.HexFormat;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
public class RagKnowledgeService {

    public static final String STATUS_DRAFT = "DRAFT";
    public static final String STATUS_PUBLISHED = "PUBLISHED";
    public static final String STATUS_ARCHIVED = "ARCHIVED";
    public static final String STATUS_DELETED = "DELETED";

    private static final List<String> ACTIVE_STATUSES = List.of(
            STATUS_DRAFT,
            STATUS_PUBLISHED,
            STATUS_ARCHIVED
    );

    @Autowired
    private KnowledgeDocumentRepository knowledgeDocumentRepository;

    @Autowired
    private RagIngestionService ragIngestionService;

    @Transactional
    public Map<String, Object> createDocument(RagDocumentRequest request) {
        String status = normalizeStatus(request.getStatus(), STATUS_PUBLISHED);
        KnowledgeDocument doc = KnowledgeDocument.builder()
                .id(UUID.randomUUID().toString())
                .title(request.getTitle().trim())
                .content(request.getContent().trim())
                .source(normalizeSource(request.getSource()))
                .version(normalizeVersion(request.getVersion()))
                .status(status)
                .contentHash(hashContent(request.getContent()))
                .build();

        knowledgeDocumentRepository.save(doc);

        int chunks = 0;
        if (STATUS_PUBLISHED.equals(status)) {
            chunks = ragIngestionService.reindexSingleDocument(doc.getId());
        }

        return Map.of(
                "status", "success",
                "docId", doc.getId(),
                "document", toDocumentPayload(doc),
                "reindexedChunks", chunks
        );
    }

    @Transactional
    public Map<String, Object> updateDocument(String docId, RagDocumentRequest request) {
        KnowledgeDocument doc = knowledgeDocumentRepository.findById(docId)
                .orElseThrow(() -> new IllegalArgumentException("Document not found: " + docId));

        doc.setTitle(request.getTitle().trim());
        doc.setContent(request.getContent().trim());
        doc.setSource(normalizeSource(request.getSource()));
        doc.setVersion(normalizeVersion(request.getVersion()));
        doc.setStatus(normalizeStatus(request.getStatus(), doc.getStatus()));
        doc.setContentHash(hashContent(doc.getContent()));
        doc.setUpdatedAt(LocalDateTime.now());

        knowledgeDocumentRepository.save(doc);

        int chunks = ragIngestionService.reindexSingleDocument(doc.getId());

        return Map.of(
                "status", "success",
                "docId", doc.getId(),
                "document", toDocumentPayload(doc),
                "reindexedChunks", chunks
        );
    }

    @Transactional
    public Map<String, Object> softDeleteDocument(String docId) {
        KnowledgeDocument doc = knowledgeDocumentRepository.findById(docId)
                .orElseThrow(() -> new IllegalArgumentException("Document not found: " + docId));

        doc.setStatus(STATUS_DELETED);
        doc.setUpdatedAt(LocalDateTime.now());
        knowledgeDocumentRepository.save(doc);

        int removedChunks = ragIngestionService.removeDocumentChunks(docId);

        return Map.of(
                "status", "success",
                "docId", docId,
                "removedChunks", removedChunks
        );
    }

    @Transactional(readOnly = true)
    public Map<String, Object> listDocuments(boolean includeDeleted) {
        List<KnowledgeDocument> docs;
        if (includeDeleted) {
            docs = knowledgeDocumentRepository.findAll(Sort.by(Sort.Direction.DESC, "updatedAt"));
        } else {
            docs = knowledgeDocumentRepository.findByStatusInOrderByUpdatedAtDesc(ACTIVE_STATUSES);
        }

        List<Map<String, Object>> payload = docs.stream()
                .map(this::toDocumentPayload)
                .collect(Collectors.toList());

        return Map.of(
                "status", "success",
                "total", payload.size(),
                "documents", payload
        );
    }

    @Transactional
    public Map<String, Object> reindexAll() {
        return ragIngestionService.reindexAllPublishedDocuments();
    }

    @Transactional
    public Map<String, Object> reindexOne(String docId) {
        int chunks = ragIngestionService.reindexSingleDocument(docId);
        return Map.of(
                "status", "success",
                "docId", docId,
                "reindexedChunks", chunks
        );
    }

    @Transactional(readOnly = true)
    public Map<String, Object> ragStatus() {
        return ragIngestionService.getRagStatus();
    }

    private Map<String, Object> toDocumentPayload(KnowledgeDocument doc) {
        Map<String, Object> map = new LinkedHashMap<>();
        map.put("id", doc.getId());
        map.put("title", doc.getTitle());
        map.put("source", doc.getSource());
        map.put("version", doc.getVersion());
        map.put("status", doc.getStatus());
        map.put("hash", doc.getContentHash());
        map.put("contentLength", doc.getContent() == null ? 0 : doc.getContent().length());
        map.put("updatedAt", doc.getUpdatedAt());
        return map;
    }

    private String normalizeStatus(String status, String defaultStatus) {
        String value = status == null ? defaultStatus : status.trim().toUpperCase();
        if (!List.of(STATUS_DRAFT, STATUS_PUBLISHED, STATUS_ARCHIVED, STATUS_DELETED).contains(value)) {
            throw new IllegalArgumentException("Invalid status: " + status);
        }
        return value;
    }

    private String normalizeSource(String source) {
        if (source == null || source.isBlank()) {
            return "INTERNAL";
        }
        return source.trim();
    }

    private String normalizeVersion(String version) {
        if (version == null || version.isBlank()) {
            return "v1";
        }
        return version.trim();
    }

    private String hashContent(String content) {
        try {
            MessageDigest digest = MessageDigest.getInstance("SHA-256");
            byte[] hash = digest.digest(content.getBytes(StandardCharsets.UTF_8));
            return HexFormat.of().formatHex(hash);
        } catch (Exception e) {
            throw new IllegalStateException("Cannot hash document content", e);
        }
    }
}

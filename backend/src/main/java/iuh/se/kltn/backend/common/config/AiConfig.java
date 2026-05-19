package iuh.se.kltn.backend.common.config;

import dev.langchain4j.data.segment.TextSegment;
import dev.langchain4j.memory.chat.ChatMemoryProvider;
import dev.langchain4j.memory.chat.MessageWindowChatMemory;
import dev.langchain4j.model.chat.ChatLanguageModel;
import dev.langchain4j.model.embedding.EmbeddingModel;
import dev.langchain4j.model.embedding.onnx.allminilml6v2.AllMiniLmL6V2EmbeddingModel;
import dev.langchain4j.model.embedding.onnx.OnnxEmbeddingModel;
import dev.langchain4j.model.embedding.onnx.PoolingMode;
import dev.langchain4j.model.googleai.GoogleAiGeminiChatModel;
import dev.langchain4j.store.embedding.EmbeddingStore;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import dev.langchain4j.rag.content.retriever.ContentRetriever;
import dev.langchain4j.rag.content.retriever.EmbeddingStoreContentRetriever;
import org.springframework.jdbc.core.JdbcTemplate;

import java.time.Duration;
import java.util.ArrayList;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Locale;

import static dev.langchain4j.store.embedding.filter.MetadataFilterBuilder.metadataKey;
@Configuration
public class AiConfig {

    @Value("${gemini.api.key}")
    private String apiKey;

    @Value("${gemini.chat.primary-model:gemini-2.5-flash}")
    private String primaryChatModel;

    @Value("${gemini.chat.fallback-models:gemini-3.1-flash-lite,gemini-2.5-flash-lite}")
    private String fallbackChatModels;

    @Value("${gemini.chat.temperature:0.7}")
    private double geminiChatTemperature;

    @Value("${gemini.chat.timeout-seconds:120}")
    private long geminiChatTimeoutSeconds;

    @Value("${ai.rag.embedding.model:all-minilm-l6-v2}")
    private String ragEmbeddingModel;

    @Value("${ai.rag.embedding.onnx.model-path:}")
    private String ragOnnxModelPath;

    @Value("${ai.rag.embedding.onnx.tokenizer-path:}")
    private String ragOnnxTokenizerPath;

    @Value("${ai.rag.embedding.onnx.pooling-mode:MEAN}")
    private String ragOnnxPoolingMode;

    @Value("${ai.rag.retrieval.max-results:4}")
    private int ragMaxResults;

    @Value("${ai.rag.retrieval.min-score:0.55}")
    private double ragMinScore;

    @Bean
    public ChatLanguageModel geminiChatModel() {
        List<String> modelChain = buildChatModelChain();
        List<FallbackChatLanguageModel.ModelDelegate> delegates = new ArrayList<>(modelChain.size());
        for (String modelName : modelChain) {
            delegates.add(new FallbackChatLanguageModel.ModelDelegate(modelName, buildGeminiModel(modelName)));
        }

        if (delegates.size() == 1) {
            System.out.println("[AI MODEL ROUTING] primary=" + delegates.get(0).modelName() + ", fallback=none");
            return delegates.get(0).model();
        }

        FallbackChatLanguageModel fallbackModel = new FallbackChatLanguageModel(delegates);
        System.out.println("[AI MODEL ROUTING] chain=" + String.join(" -> ", fallbackModel.modelNames()));
        return fallbackModel;
    }

    @Bean
    public ChatMemoryProvider chatMemoryProvider() {
        return memoryId -> MessageWindowChatMemory.withMaxMessages(10);
    }

    @Bean
    public EmbeddingModel embeddingModel() {
        String model = ragEmbeddingModel == null ? "" : ragEmbeddingModel.trim().toLowerCase(Locale.ROOT);

        if (model.isEmpty() || "all-minilm-l6-v2".equals(model)) {
            return new AllMiniLmL6V2EmbeddingModel();
        }

        if ("onnx-custom".equals(model) || "onnx-multilingual".equals(model)) {
            if (isBlank(ragOnnxModelPath) || isBlank(ragOnnxTokenizerPath)) {
                throw new IllegalStateException(
                        "ai.rag.embedding.onnx.model-path và ai.rag.embedding.onnx.tokenizer-path là bắt buộc khi dùng model ONNX tùy chỉnh"
                );
            }

            PoolingMode poolingMode;
            try {
                poolingMode = PoolingMode.valueOf(ragOnnxPoolingMode.trim().toUpperCase(Locale.ROOT));
            } catch (Exception e) {
                throw new IllegalStateException(
                        "ai.rag.embedding.onnx.pooling-mode không hợp lệ. Giá trị hợp lệ: CLS, MEAN",
                        e
                );
            }

            EmbeddingModel customModel = new OnnxEmbeddingModel(ragOnnxModelPath, ragOnnxTokenizerPath, poolingMode);
            ensureEmbeddingDimension(customModel, 384);
            return customModel;
        }

        throw new IllegalStateException(
                "ai.rag.embedding.model không hỗ trợ: " + ragEmbeddingModel
                        + ". Giá trị hợp lệ: all-minilm-l6-v2, onnx-custom, onnx-multilingual"
        );
    }

    /**
     * PHASE 3: replace InMemoryEmbeddingStore with PgVector.
     * Embeddings are persisted and shared across instances.
     */
    @Bean
    public EmbeddingStore<TextSegment> embeddingStore(JdbcTemplate jdbcTemplate) {
        return new PgVectorEmbeddingStore(jdbcTemplate);
    }

    @Bean
    public ContentRetriever contentRetriever(EmbeddingStore<TextSegment> embeddingStore, EmbeddingModel embeddingModel) {
        return EmbeddingStoreContentRetriever.builder()
                .embeddingStore(embeddingStore)
                .embeddingModel(embeddingModel)
                .maxResults(ragMaxResults)
                .minScore(ragMinScore)
                .filter(metadataKey("type").isEqualTo("document")) // Restrict RAG to document chunks
                .build();
    }

    private boolean isBlank(String value) {
        return value == null || value.trim().isEmpty();
    }

    private ChatLanguageModel buildGeminiModel(String modelName) {
        return GoogleAiGeminiChatModel.builder()
                .apiKey(apiKey)
                .modelName(modelName)
                .temperature(geminiChatTemperature)
                .timeout(Duration.ofSeconds(geminiChatTimeoutSeconds))
                .build();
    }

    private List<String> buildChatModelChain() {
        LinkedHashSet<String> uniqueNames = new LinkedHashSet<>();
        if (!isBlank(primaryChatModel)) {
            uniqueNames.add(primaryChatModel.trim());
        }
        if (!isBlank(fallbackChatModels)) {
            for (String raw : fallbackChatModels.split(",")) {
                if (raw != null && !raw.trim().isEmpty()) {
                    uniqueNames.add(raw.trim());
                }
            }
        }
        if (uniqueNames.isEmpty()) {
            uniqueNames.add("gemini-2.5-flash");
        }
        return List.copyOf(uniqueNames);
    }

    private void ensureEmbeddingDimension(EmbeddingModel model, int expectedDimension) {
        int actualDimension = model.embed("dimension-check").content().vector().length;
        if (actualDimension != expectedDimension) {
            throw new IllegalStateException(
                    "Embedding dimension không khớp ai_embeddings.vector(" + expectedDimension + "). Dimension hiện tại: " + actualDimension
            );
        }
    }
}

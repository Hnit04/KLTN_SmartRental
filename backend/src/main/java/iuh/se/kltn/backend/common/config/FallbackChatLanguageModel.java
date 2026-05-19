package iuh.se.kltn.backend.common.config;

import dev.langchain4j.agent.tool.ToolSpecification;
import dev.langchain4j.data.message.AiMessage;
import dev.langchain4j.data.message.ChatMessage;
import dev.langchain4j.model.ModelDisabledException;
import dev.langchain4j.model.chat.Capability;
import dev.langchain4j.model.chat.ChatLanguageModel;
import dev.langchain4j.model.chat.request.ChatRequest;
import dev.langchain4j.model.chat.response.ChatResponse;
import dev.langchain4j.model.output.Response;

import java.util.ArrayList;
import java.util.Collections;
import java.util.List;
import java.util.Locale;
import java.util.Objects;
import java.util.Set;
import java.util.function.Function;

/**
 * Fallback model chain:
 * - Always tries primary model first on every request.
 * - Falls back only on quota/rate-limit/temporary-unavailable style errors.
 * - On non-retriable errors, fails fast (no fallback) to avoid hiding real bugs.
 */
public class FallbackChatLanguageModel implements ChatLanguageModel {

    private static final List<String> RETRIABLE_ERROR_PATTERNS = List.of(
            "resource_exhausted",
            "quota",
            "rate limit",
            "too many requests",
            "429",
            "unavailable",
            "overloaded",
            "503",
            "demand",
            "temporarily unavailable"
    );

    private final List<ModelDelegate> delegates;

    public FallbackChatLanguageModel(List<ModelDelegate> delegates) {
        if (delegates == null || delegates.isEmpty()) {
            throw new IllegalArgumentException("FallbackChatLanguageModel requires at least one delegate model");
        }
        this.delegates = List.copyOf(delegates);
    }

    @Override
    public Response<AiMessage> generate(List<ChatMessage> messages) {
        return executeWithFallback(model -> model.generate(messages));
    }

    @Override
    public Response<AiMessage> generate(List<ChatMessage> messages, List<ToolSpecification> toolSpecifications) {
        return executeWithFallback(model -> model.generate(messages, toolSpecifications));
    }

    @Override
    public Response<AiMessage> generate(List<ChatMessage> messages, ToolSpecification toolSpecification) {
        return executeWithFallback(model -> model.generate(messages, toolSpecification));
    }

    @Override
    public ChatResponse chat(ChatRequest chatRequest) {
        return executeWithFallback(model -> model.chat(chatRequest));
    }

    @Override
    public Set<Capability> supportedCapabilities() {
        return delegates.get(0).model().supportedCapabilities();
    }

    private <T> T executeWithFallback(Function<ChatLanguageModel, T> action) {
        RuntimeException lastException = null;

        for (int i = 0; i < delegates.size(); i++) {
            ModelDelegate delegate = delegates.get(i);
            boolean hasFallback = i < delegates.size() - 1;
            try {
                return action.apply(delegate.model());
            } catch (RuntimeException ex) {
                lastException = ex;
                if (!hasFallback || !isRetriableForFallback(ex)) {
                    throw ex;
                }
                System.out.println("[AI MODEL FALLBACK] model=" + delegate.modelName()
                        + " failed with retriable error. Switching to next model...");
            }
        }

        if (lastException != null) {
            throw lastException;
        }
        throw new IllegalStateException("No model delegate was executed");
    }

    private boolean isRetriableForFallback(Throwable throwable) {
        if (throwable == null) {
            return false;
        }
        if (containsType(throwable, ModelDisabledException.class)) {
            return true;
        }

        String text = flattenThrowableMessages(throwable);
        if (text.isBlank()) {
            return false;
        }

        for (String pattern : RETRIABLE_ERROR_PATTERNS) {
            if (text.contains(pattern)) {
                return true;
            }
        }
        return false;
    }

    private boolean containsType(Throwable throwable, Class<?> type) {
        Throwable cursor = throwable;
        int depth = 0;
        while (cursor != null && depth < 10) {
            if (type.isAssignableFrom(cursor.getClass())) {
                return true;
            }
            cursor = cursor.getCause();
            depth++;
        }
        return false;
    }

    private String flattenThrowableMessages(Throwable throwable) {
        Throwable cursor = throwable;
        int depth = 0;
        List<String> parts = new ArrayList<>();

        while (cursor != null && depth < 10) {
            if (cursor.getMessage() != null && !cursor.getMessage().isBlank()) {
                parts.add(cursor.getMessage().toLowerCase(Locale.ROOT));
            }
            parts.add(cursor.getClass().getName().toLowerCase(Locale.ROOT));
            cursor = cursor.getCause();
            depth++;
        }

        if (parts.isEmpty()) {
            return "";
        }
        return String.join(" | ", parts);
    }

    public List<String> modelNames() {
        if (delegates.isEmpty()) {
            return Collections.emptyList();
        }
        List<String> names = new ArrayList<>(delegates.size());
        for (ModelDelegate delegate : delegates) {
            names.add(delegate.modelName());
        }
        return names;
    }

    public record ModelDelegate(String modelName, ChatLanguageModel model) {
        public ModelDelegate {
            Objects.requireNonNull(modelName, "modelName must not be null");
            Objects.requireNonNull(model, "model must not be null");
        }
    }
}

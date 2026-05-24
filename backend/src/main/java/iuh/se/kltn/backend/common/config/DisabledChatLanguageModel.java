/*
 * Decompiled with CFR 0.152.
 * 
 * Could not load the following classes:
 *  dev.langchain4j.data.message.AiMessage
 *  dev.langchain4j.data.message.ChatMessage
 *  dev.langchain4j.model.chat.ChatLanguageModel
 *  dev.langchain4j.model.output.Response
 */
package iuh.se.kltn.backend.common.config;

import dev.langchain4j.data.message.AiMessage;
import dev.langchain4j.data.message.ChatMessage;
import dev.langchain4j.model.chat.ChatLanguageModel;
import dev.langchain4j.model.output.Response;
import java.util.List;

public class DisabledChatLanguageModel
implements ChatLanguageModel {
    public String generate(String userMessage) {
        throw new UnsupportedOperationException("LLM is disabled by configuration (ai.llm.mode=TEMPLATE_ONLY or missing API key).");
    }

    public Response<AiMessage> generate(ChatMessage ... messages) {
        throw new UnsupportedOperationException("LLM is disabled by configuration.");
    }

    public Response<AiMessage> generate(List<ChatMessage> messages) {
        throw new UnsupportedOperationException("LLM is disabled by configuration.");
    }
}

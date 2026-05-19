package iuh.se.kltn.backend.common.config;

import dev.langchain4j.data.message.AiMessage;
import dev.langchain4j.data.message.UserMessage;
import dev.langchain4j.model.ModelDisabledException;
import dev.langchain4j.model.chat.ChatLanguageModel;
import dev.langchain4j.model.output.Response;
import org.junit.jupiter.api.Test;

import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.anyList;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

class FallbackChatLanguageModelTest {

    @Test
    void shouldUsePrimaryModelWhenPrimarySucceeds() {
        ChatLanguageModel primary = mock(ChatLanguageModel.class);
        ChatLanguageModel fallback = mock(ChatLanguageModel.class);

        when(primary.generate(anyList())).thenReturn(Response.from(AiMessage.from("primary-ok")));

        FallbackChatLanguageModel model = new FallbackChatLanguageModel(List.of(
                new FallbackChatLanguageModel.ModelDelegate("gemini-2.5-flash", primary),
                new FallbackChatLanguageModel.ModelDelegate("gemini-3.1-flash-lite", fallback)
        ));

        String result = model.generate(List.of(UserMessage.from("hi"))).content().text();

        assertThat(result).isEqualTo("primary-ok");
        verify(primary).generate(anyList());
        verify(fallback, never()).generate(anyList());
    }

    @Test
    void shouldFallbackWhenPrimaryQuotaIsExhausted() {
        ChatLanguageModel primary = mock(ChatLanguageModel.class);
        ChatLanguageModel fallback = mock(ChatLanguageModel.class);

        when(primary.generate(anyList()))
                .thenThrow(new RuntimeException("429 RESOURCE_EXHAUSTED: quota exceeded"));
        when(fallback.generate(anyList()))
                .thenReturn(Response.from(AiMessage.from("fallback-ok")));

        FallbackChatLanguageModel model = new FallbackChatLanguageModel(List.of(
                new FallbackChatLanguageModel.ModelDelegate("gemini-2.5-flash", primary),
                new FallbackChatLanguageModel.ModelDelegate("gemini-3.1-flash-lite", fallback)
        ));

        String result = model.generate(List.of(UserMessage.from("hi"))).content().text();

        assertThat(result).isEqualTo("fallback-ok");
        verify(primary).generate(anyList());
        verify(fallback).generate(anyList());
    }

    @Test
    void shouldFallbackWhenPrimaryModelIsDisabled() {
        ChatLanguageModel primary = mock(ChatLanguageModel.class);
        ChatLanguageModel fallback = mock(ChatLanguageModel.class);

        when(primary.generate(anyList()))
                .thenThrow(new ModelDisabledException("Model disabled"));
        when(fallback.generate(anyList()))
                .thenReturn(Response.from(AiMessage.from("fallback-ok")));

        FallbackChatLanguageModel model = new FallbackChatLanguageModel(List.of(
                new FallbackChatLanguageModel.ModelDelegate("gemini-2.5-flash", primary),
                new FallbackChatLanguageModel.ModelDelegate("gemini-3.1-flash-lite", fallback)
        ));

        String result = model.generate(List.of(UserMessage.from("hi"))).content().text();

        assertThat(result).isEqualTo("fallback-ok");
        verify(primary).generate(anyList());
        verify(fallback).generate(anyList());
    }

    @Test
    void shouldNotFallbackOnNonRetriableError() {
        ChatLanguageModel primary = mock(ChatLanguageModel.class);
        ChatLanguageModel fallback = mock(ChatLanguageModel.class);

        when(primary.generate(anyList()))
                .thenThrow(new RuntimeException("invalid sql syntax"));

        FallbackChatLanguageModel model = new FallbackChatLanguageModel(List.of(
                new FallbackChatLanguageModel.ModelDelegate("gemini-2.5-flash", primary),
                new FallbackChatLanguageModel.ModelDelegate("gemini-3.1-flash-lite", fallback)
        ));

        assertThatThrownBy(() -> model.generate(List.of(UserMessage.from("hi"))))
                .isInstanceOf(RuntimeException.class)
                .hasMessageContaining("invalid sql syntax");

        verify(primary).generate(anyList());
        verify(fallback, never()).generate(anyList());
    }
}

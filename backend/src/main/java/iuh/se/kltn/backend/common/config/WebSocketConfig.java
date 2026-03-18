package iuh.se.kltn.backend.common.config;

import org.springframework.context.annotation.Configuration;
import org.springframework.messaging.simp.config.MessageBrokerRegistry;
import org.springframework.web.socket.config.annotation.EnableWebSocketMessageBroker;
import org.springframework.web.socket.config.annotation.StompEndpointRegistry;
import org.springframework.web.socket.config.annotation.WebSocketMessageBrokerConfigurer;

@Configuration
@EnableWebSocketMessageBroker
public class WebSocketConfig implements WebSocketMessageBrokerConfigurer {

    @Override
    public void configureMessageBroker(MessageBrokerRegistry registry) {
        // Client subscribe vào /topic/... hoặc /user/queue/...
        registry.enableSimpleBroker("/topic", "/queue");
        // Prefix cho client gửi message lên server
        registry.setApplicationDestinationPrefixes("/app");
        // Prefix để server gửi đến user cụ thể (Principal)
        registry.setUserDestinationPrefix("/user");
    }

    @Override
    public void registerStompEndpoints(StompEndpointRegistry registry) {
        // Endpoint WebSocket — Client kết nối đến ws://host/ws
        registry.addEndpoint("/ws")
                .setAllowedOriginPatterns("*") // Cho phép CORS frontend dev
                .withSockJS(); // Fallback khi browser không hỗ trợ WebSocket thuần
    }
}

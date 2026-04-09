package iuh.se.kltn.backend.common.config;

import iuh.se.kltn.backend.common.security.CustomUserDetailsService;
import iuh.se.kltn.backend.common.security.JwtTokenProvider;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.context.annotation.Configuration;
import org.springframework.messaging.Message;
import org.springframework.messaging.MessageChannel;
import org.springframework.messaging.simp.config.ChannelRegistration;
import org.springframework.messaging.simp.config.MessageBrokerRegistry;
import org.springframework.messaging.simp.stomp.StompCommand;
import org.springframework.messaging.simp.stomp.StompHeaderAccessor;
import org.springframework.messaging.support.ChannelInterceptor;
import org.springframework.messaging.support.MessageHeaderAccessor;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.util.StringUtils;
import org.springframework.web.socket.config.annotation.EnableWebSocketMessageBroker;
import org.springframework.web.socket.config.annotation.StompEndpointRegistry;
import org.springframework.web.socket.config.annotation.WebSocketMessageBrokerConfigurer;

import java.util.List;

@Configuration
@EnableWebSocketMessageBroker
@RequiredArgsConstructor
@Slf4j
public class WebSocketConfig implements WebSocketMessageBrokerConfigurer {

    private final JwtTokenProvider tokenProvider;
    private final CustomUserDetailsService userDetailsService;

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

    @Override
    public void configureClientInboundChannel(ChannelRegistration registration) {
        registration.interceptors(new ChannelInterceptor() {
            @Override
            public Message<?> preSend(Message<?> message, MessageChannel channel) {
                StompHeaderAccessor accessor = MessageHeaderAccessor.getAccessor(message, StompHeaderAccessor.class);

                if (accessor != null && StompCommand.CONNECT.equals(accessor.getCommand())) {
                    List<String> authorization = accessor.getNativeHeader("Authorization");
                    // Kiểm tra cả case-insensitive
                    if (authorization == null) {
                        authorization = accessor.getNativeHeader("authorization");
                    }

                    log.info("🔔 WebSocket CONNECT: Authorization header present: {}", authorization != null);

                    if (authorization != null && !authorization.isEmpty()) {
                        String bearerToken = authorization.get(0);
                        if (StringUtils.hasText(bearerToken) && bearerToken.startsWith("Bearer ")) {
                            String jwt = bearerToken.substring(7);
                            try {
                                if (tokenProvider.validateToken(jwt)) {
                                    Long userId = tokenProvider.getUserIdFromJWT(jwt);
                                    UserDetails userDetails = userDetailsService.loadUserById(userId);
                                    
                                    UsernamePasswordAuthenticationToken authentication = 
                                            new UsernamePasswordAuthenticationToken(userDetails, null, userDetails.getAuthorities());
                                    
                                    accessor.setUser(authentication);
                                    log.info("🔔 WebSocket: User '{}' (ID: {}) authenticated successfully", userDetails.getUsername(), userId);
                                } else {
                                    log.warn("🔔 WebSocket: Invalid JWT token provided");
                                }
                            } catch (Exception e) {
                                log.error("🔔 WebSocket Authentication failed: {}", e.getMessage());
                            }
                        } else {
                            log.warn("🔔 WebSocket: Authorization header does not start with Bearer");
                        }
                    } else {
                        log.warn("🔔 WebSocket: No Authorization header found in CONNECT frame");
                    }
                }
                return message;
            }
        });
    }
}

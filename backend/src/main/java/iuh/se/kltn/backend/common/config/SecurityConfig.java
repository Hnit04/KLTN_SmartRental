package iuh.se.kltn.backend.common.config;

import iuh.se.kltn.backend.common.security.CustomUserDetailsService;
import iuh.se.kltn.backend.common.security.JwtAuthenticationFilter;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpMethod;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.dao.DaoAuthenticationProvider;
import org.springframework.security.config.annotation.authentication.configuration.AuthenticationConfiguration;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.config.annotation.web.configurers.AbstractHttpConfigurer;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.CorsConfigurationSource;
import org.springframework.web.cors.UrlBasedCorsConfigurationSource;

import java.util.Arrays;
import java.util.List;

@Configuration
@EnableWebSecurity
public class SecurityConfig {

    @Autowired
    private CustomUserDetailsService customUserDetailsService;

    @Autowired
    private JwtAuthenticationFilter jwtAuthenticationFilter;

    @Bean
    public PasswordEncoder passwordEncoder() {
        return new BCryptPasswordEncoder();
    }

    @Bean
    public AuthenticationManager authenticationManager(AuthenticationConfiguration authConfig) throws Exception {
        return authConfig.getAuthenticationManager();
    }

    @Bean
    public DaoAuthenticationProvider authenticationProvider() {
        DaoAuthenticationProvider authProvider = new DaoAuthenticationProvider();
        authProvider.setUserDetailsService(customUserDetailsService);
        authProvider.setPasswordEncoder(passwordEncoder());
        return authProvider;
    }

    /**
     * 🔥 CẤU HÌNH CORS CHI TIẾT (FIX LỖI CHẶN PUT/DELETE)
     * Thay vì dùng applyPermitDefaultValues() (chỉ cho GET/POST), ta cấu hình thủ công.
     */
    @Bean
    public CorsConfigurationSource corsConfigurationSource() {
        CorsConfiguration configuration = new CorsConfiguration();

        // Cho phép mọi nguồn (Trong môi trường Dev). Product nên set cụ thể domain.
        configuration.setAllowedOriginPatterns(List.of("*"));

        // Cho phép đầy đủ các methods
        configuration.setAllowedMethods(Arrays.asList("GET", "POST", "PUT", "DELETE", "OPTIONS", "PATCH"));

        // Cho phép các headers cần thiết
        configuration.setAllowedHeaders(Arrays.asList("Authorization", "Content-Type", "X-Requested-With", "Accept"));

        // Cho phép credentials (nếu cần gửi cookie/auth header)
        configuration.setAllowCredentials(true);

        UrlBasedCorsConfigurationSource source = new UrlBasedCorsConfigurationSource();
        source.registerCorsConfiguration("/**", configuration);
        return source;
    }

    @Bean
    public SecurityFilterChain filterChain(HttpSecurity http) throws Exception {
        http
                .csrf(AbstractHttpConfigurer::disable)
                // ✅ Sử dụng bean corsConfigurationSource đã định nghĩa ở trên
                .cors(cors -> cors.configurationSource(corsConfigurationSource()))
                .sessionManagement(session -> session.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
                .authorizeHttpRequests(auth -> auth
                        // API Auth (Đăng ký, Đăng nhập, Refresh Token)
                        .requestMatchers("/api/auth/**").permitAll()
                        // demo crawl data
                        .requestMatchers("/api/v1/crawler/**").permitAll()
                        // Swagger UI
                        .requestMatchers("/v3/api-docs/**", "/swagger-ui/**", "/swagger-ui.html").permitAll()
                        .requestMatchers("/api/ai/**").permitAll()
                        // Trang lỗi và API Public
                        .requestMatchers("/error").permitAll()
                        .requestMatchers(HttpMethod.GET, 
                            "/api/properties", 
                            "/api/properties/{id:[0-9]+}", 
                            "/api/properties/{id:[0-9]+}/rooms",
                            "/api/properties/landlord/**",
                            "/api/rooms/{id:[0-9]+}",
                            "/api/users/top-landlords",
                            "/api/users/username"
                        ).permitAll()
                        .requestMatchers("/ws/**").permitAll() // ✅ Cho phép WebSocket handshake
                        .requestMatchers(HttpMethod.POST, "/api/appointments/**").authenticated()
                        .requestMatchers("/uploads/**").permitAll() // Xem ảnh

                        // Các API còn lại bắt buộc phải có Token
                        .anyRequest().authenticated()
                );

        http.authenticationProvider(authenticationProvider());
        http.addFilterBefore(jwtAuthenticationFilter, UsernamePasswordAuthenticationFilter.class);

        return http.build();
    }
}
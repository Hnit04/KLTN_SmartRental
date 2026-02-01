package iuh.se.kltn.backend.modules.user.service;

import iuh.se.kltn.backend.common.enums.Role;
import iuh.se.kltn.backend.common.security.JwtTokenProvider;
import iuh.se.kltn.backend.common.security.UserPrincipal;
import iuh.se.kltn.backend.modules.user.dto.request.LoginRequest;
import iuh.se.kltn.backend.modules.user.dto.request.TokenRefreshRequest;
import iuh.se.kltn.backend.modules.user.dto.request.UserRegisterRequest;
import iuh.se.kltn.backend.modules.user.dto.response.LoginResponse;
import iuh.se.kltn.backend.modules.user.dto.response.TokenRefreshResponse;
import iuh.se.kltn.backend.modules.user.entity.Landlord;
import iuh.se.kltn.backend.modules.user.entity.RefreshToken;
import iuh.se.kltn.backend.modules.user.entity.Tenant;
import iuh.se.kltn.backend.modules.user.entity.User;
import iuh.se.kltn.backend.modules.user.repository.UserRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

@Service
public class AuthService {

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private PasswordEncoder passwordEncoder;

    @Autowired
    private AuthenticationManager authenticationManager;

    @Autowired
    private JwtTokenProvider tokenProvider;

    @Autowired
    private RefreshTokenService refreshTokenService;

    // ĐĂNG KÝ
    public User register(UserRegisterRequest request) {
        if (userRepository.existsByUsername(request.getUsername())) {
            throw new RuntimeException("Username đã tồn tại!");
        }
        if (userRepository.existsByEmail(request.getEmail())) {
            throw new RuntimeException("Email đã tồn tại!");
        }
        if (request.getWalletAddress() != null && !request.getWalletAddress().isEmpty()
                && userRepository.existsByWalletAddress(request.getWalletAddress())) {
            throw new RuntimeException("Ví này đã được sử dụng!");
        }
        if (request.getRole() == Role.ADMIN) {
            throw new RuntimeException("Không thể đăng ký tài khoản Admin công khai!");
        }
        User newUser;
        if (request.getRole() == Role.LANDLORD) {
            newUser = new Landlord();
        } else {
            newUser = new Tenant();
        }

        //thông tin chung
        newUser.setUsername(request.getUsername());
        newUser.setPassword(passwordEncoder.encode(request.getPassword()));
        newUser.setFullName(request.getFullName());
        newUser.setEmail(request.getEmail());
        newUser.setWalletAddress(request.getWalletAddress());
        newUser.setRole(request.getRole());

        return userRepository.save(newUser);
    }

    // ĐĂNG NHẬP
    public LoginResponse login(LoginRequest request) {
        // 1. Xác thực username/password
        Authentication authentication = authenticationManager.authenticate(
                new UsernamePasswordAuthenticationToken(
                        request.getUsername(),
                        request.getPassword()
                )
        );

        // 2. Lưu vào Security Context
        SecurityContextHolder.getContext().setAuthentication(authentication);

        // 3. Tạo Access Token (JWT)
        String jwt = tokenProvider.generateToken(authentication);

        // 4. Lấy thông tin UserPrincipal từ Authentication để lấy ID
        UserPrincipal userPrincipal = (UserPrincipal) authentication.getPrincipal();

        // 5. Tạo Refresh Token lưu xuống DB
        RefreshToken refreshToken = refreshTokenService.createRefreshToken(userPrincipal.getId());

        // 6. Trả về LoginResponse đầy đủ thông tin
        return new LoginResponse(
                jwt,
                refreshToken.getToken(),
                userPrincipal.getId(),
                userPrincipal.getUsername(),
                userPrincipal.getEmail(),
                userPrincipal.getAuthorities().iterator().next().getAuthority()
        );
    }
    public TokenRefreshResponse refreshToken(TokenRefreshRequest request) {
        String requestRefreshToken = request.getRefreshToken();

        return refreshTokenService.findByToken(requestRefreshToken)
                .map(refreshTokenService::verifyExpiration)
                .map(RefreshToken::getUser)
                .map(user -> {
                    // 1. Tạo lại UserPrincipal từ user tìm được
                    UserPrincipal userPrincipal = UserPrincipal.create(user);

                    // 2. Tạo Authentication object (cần thiết để sinh JWT)
                    Authentication authentication = new UsernamePasswordAuthenticationToken(
                            userPrincipal,
                            null,
                            userPrincipal.getAuthorities()
                    );

                    // 3. Sinh Access Token mới
                    String newAccessToken = tokenProvider.generateToken(authentication);

                    // 4. Trả về token mới + refresh token cũ
                    return new TokenRefreshResponse(newAccessToken, requestRefreshToken);
                })
                .orElseThrow(() -> new RuntimeException("Refresh token không tồn tại trong hệ thống!"));
    }
}
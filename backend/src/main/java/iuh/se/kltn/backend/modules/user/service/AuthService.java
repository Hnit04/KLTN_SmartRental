package iuh.se.kltn.backend.modules.user.service;

import iuh.se.kltn.backend.common.enums.Role;
import iuh.se.kltn.backend.common.security.JwtTokenProvider;
import iuh.se.kltn.backend.common.security.UserPrincipal;
import iuh.se.kltn.backend.modules.user.dto.request.LoginRequest;
import iuh.se.kltn.backend.modules.user.dto.request.TokenRefreshRequest;
import iuh.se.kltn.backend.modules.user.dto.request.UserRegisterRequest;
import iuh.se.kltn.backend.modules.user.dto.response.LoginResponse;
import iuh.se.kltn.backend.modules.user.dto.response.TokenRefreshResponse;
import iuh.se.kltn.backend.modules.user.dto.response.UserProfileResponse; // Import mới
import iuh.se.kltn.backend.modules.user.entity.Landlord;
import iuh.se.kltn.backend.modules.user.entity.RefreshToken;
import iuh.se.kltn.backend.modules.user.entity.Tenant;
import iuh.se.kltn.backend.modules.user.entity.User;
import iuh.se.kltn.backend.modules.user.repository.UserRepository;
import org.modelmapper.ModelMapper; // Import mới
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

    @Autowired
    private ModelMapper modelMapper;

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

    // ĐĂNG NHẬP (ĐÃ SỬA)
    public LoginResponse login(LoginRequest request) {
        Authentication authentication = authenticationManager.authenticate(
                new UsernamePasswordAuthenticationToken(
                        request.getUsername(),
                        request.getPassword()
                )
        );

        SecurityContextHolder.getContext().setAuthentication(authentication);

        String jwt = tokenProvider.generateToken(authentication);
        UserPrincipal userPrincipal = (UserPrincipal) authentication.getPrincipal();
        RefreshToken refreshToken = refreshTokenService.createRefreshToken(userPrincipal.getId());
        User user = userRepository.findById(userPrincipal.getId())
                .orElseThrow(() -> new RuntimeException("User không tồn tại"));
        UserProfileResponse userProfile = modelMapper.map(user, UserProfileResponse.class);
        if (user instanceof Landlord) {
            userProfile.setBusinessLicenseUrl(((Landlord) user).getBusinessLicenseUrl());
        }
        return new LoginResponse(
                jwt,
                refreshToken.getToken(),
                userProfile
        );
    }

    // REFRESH TOKEN
    public TokenRefreshResponse refreshToken(TokenRefreshRequest request) {
        String requestRefreshToken = request.getRefreshToken();

        return refreshTokenService.findByToken(requestRefreshToken)
                .map(refreshTokenService::verifyExpiration)
                .map(RefreshToken::getUser)
                .map(user -> {
                    UserPrincipal userPrincipal = UserPrincipal.create(user);
                    Authentication authentication = new UsernamePasswordAuthenticationToken(
                            userPrincipal,
                            null,
                            userPrincipal.getAuthorities()
                    );
                    String newAccessToken = tokenProvider.generateToken(authentication);
                    return new TokenRefreshResponse(newAccessToken, requestRefreshToken);
                })
                .orElseThrow(() -> new RuntimeException("Refresh token không tồn tại trong hệ thống!"));
    }
}
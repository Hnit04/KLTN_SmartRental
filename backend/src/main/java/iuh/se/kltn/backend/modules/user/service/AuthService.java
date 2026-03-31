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

import java.time.LocalDateTime;
import java.util.Random;

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

    @Autowired
    private EmailService emailService;

    // ĐĂNG KÝ
    public User register(UserRegisterRequest request) {
        // 1. Kiểm tra tính duy nhất (Validation)
        if (userRepository.existsByUsername(request.getUsername())) {
            throw new RuntimeException("Username đã tồn tại!");
        }
        if (userRepository.existsByEmail(request.getEmail())) {
            throw new RuntimeException("Email đã tồn tại!");
        }
        if (hasText(request.getWalletAddress()) && userRepository.existsByWalletAddress(request.getWalletAddress())) {
            throw new RuntimeException("Ví này đã được sử dụng!");
        }
        if (request.getRole() == Role.ADMIN) {
            throw new RuntimeException("Không thể đăng ký tài khoản Admin công khai!");
        }

        // 2. Khởi tạo Object User (Lưu trong RAM, chưa vào DB)
        User newUser = (request.getRole() == Role.LANDLORD) ? new Landlord() : new Tenant();
        newUser.setUsername(request.getUsername());
        newUser.setPassword(passwordEncoder.encode(request.getPassword()));
        newUser.setFullName(request.getFullName());
        newUser.setEmail(request.getEmail());
        newUser.setRole(request.getRole());
        newUser.setWalletAddress(hasText(request.getWalletAddress()) ? request.getWalletAddress().trim() : null);

        // 3. Chuẩn bị mã OTP
        String otpCode = String.format("%06d", new Random().nextInt(1000000));
        newUser.setVerificationCode(otpCode);
        newUser.setVerificationExpiry(LocalDateTime.now().plusMinutes(5));
        newUser.setIsEnabled(false);

        // 4. GỬI MAIL TRƯỚC
        // Ở bước này, nếu emailService ném ra Exception, hàm sẽ dừng tại đây
        // và không có dữ liệu nào được lưu xuống DB.
        try {
            emailService.sendVerificationCode(newUser.getEmail(), otpCode);
        } catch (Exception e) {
            // Nếu không gửi được mail, báo lỗi ngay để người dùng kiểm tra lại email
            throw new RuntimeException("Không thể gửi mã xác thực. Vui lòng kiểm tra lại địa chỉ email hoặc thử lại sau!");
        }

        // 5. LƯU XUỐNG CSDL (Sau khi gửi mail thành công)
        return userRepository.save(newUser);
    }
    // XÁC THỰC MÃ OTP ĐỂ KÍCH HOẠT TÀI KHOẢN
    public String verifyOtp(String email, String code) {
        // Tìm user bằng email
        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new RuntimeException("Không tìm thấy tài khoản với email này!"));

        // Kiểm tra user đã kích hoạt chưa
        if (user.getIsEnabled()) {
            return "Tài khoản đã được kích hoạt trước đó!";
        }

        // Kiểm tra mã OTP
        if (user.getVerificationCode() == null || !user.getVerificationCode().equals(code.trim())) {
            throw new RuntimeException("Mã xác thực không đúng!");
        }

        // Kiểm tra thời hạn
        if (user.getVerificationExpiry() == null || user.getVerificationExpiry().isBefore(LocalDateTime.now())) {
            throw new RuntimeException("Mã xác thực đã hết hạn!");
        }

        // Xác thực thành công → kích hoạt tài khoản
        user.setIsEnabled(true);
        user.setVerificationCode(null);          // Xóa mã để tránh dùng lại
        user.setVerificationExpiry(null);        // Xóa expiry
        userRepository.save(user);

        return "Xác thực thành công! Tài khoản của bạn đã được kích hoạt. Bạn có thể đăng nhập ngay.";
    }
    public void resendOtp(String email) {
        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new RuntimeException("Không tìm thấy tài khoản!"));

        if (user.getIsEnabled()) {
            throw new RuntimeException("Tài khoản đã được kích hoạt!");
        }

        String newOtp = String.format("%06d", new Random().nextInt(1000000));
        user.setVerificationCode(newOtp);
        user.setVerificationExpiry(LocalDateTime.now().plusMinutes(5));

        emailService.sendVerificationCode(email, newOtp);
        userRepository.save(user);
    }

    public void initiateForgotPassword(String email) {
        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new RuntimeException("Email không tồn tại trong hệ thống!"));

        // Tạo mã OTP mới cho việc reset mật khẩu
        String resetCode = String.format("%06d", new Random().nextInt(1000000));
        user.setVerificationCode(resetCode);
        user.setVerificationExpiry(LocalDateTime.now().plusMinutes(10)); // Cho 10 phút để đổi
        userRepository.save(user);

        // Gửi mail
        emailService.sendForgotPasswordEmail(email, resetCode);
    }

    public void resetPassword(String email, String code, String newPassword) {
        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new RuntimeException("Tài khoản không tồn tại!"));

        // Kiểm tra mã
        if (user.getVerificationCode() == null || !user.getVerificationCode().equals(code.trim())) {
            throw new RuntimeException("Mã xác thực không chính xác!");
        }

        // Kiểm tra hết hạn
        if (user.getVerificationExpiry() == null || user.getVerificationExpiry().isBefore(LocalDateTime.now())) {
            throw new RuntimeException("Mã xác thực đã hết hạn!");
        }

        // Cập nhật mật khẩu mới
        user.setPassword(passwordEncoder.encode(newPassword));
        user.setVerificationCode(null); // Xóa mã sau khi dùng
        user.setVerificationExpiry(null);
        userRepository.save(user);
    }

    private boolean hasText(String str) {
        return str != null && !str.trim().isEmpty();
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
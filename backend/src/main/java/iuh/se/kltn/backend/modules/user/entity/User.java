package iuh.se.kltn.backend.modules.user.entity;


import iuh.se.kltn.backend.common.enums.Role;
import iuh.se.kltn.backend.modules.user.enums.KYCStatus;
import jakarta.persistence.*;
import jakarta.validation.constraints.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.time.LocalDateTime;

@Entity
@Table(name = "users")
@Inheritance(strategy = InheritanceType.JOINED)
@Data
@NoArgsConstructor
@AllArgsConstructor
public class User {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @NotBlank(message = "Username không được để trống")
    @Size(min = 4, max = 50, message = "Username phải từ 4 đến 50 ký tự")
    @Column(unique = true, nullable = false)
    private String username;

    @NotBlank(message = "Mật khẩu không được để trống")
    @Size(min = 6, message = "Mật khẩu phải có ít nhất 6 ký tự")
    @Column(nullable = false)
    private String password;

    @NotBlank(message = "Họ tên không được để trống")
    private String fullName;

    @Email(message = "Email không hợp lệ")
    @NotBlank(message = "Email không được để trống")
    @Column(unique = true)
    private String email;

    @Pattern(regexp = "^(0|\\+84)[0-9]{9}$", message = "Số điện thoại không hợp lệ")
    private String phoneNumber;

    @Pattern(regexp = "^(0|\\+84)[0-9]{9}$", message = "Số điện thoại không hợp lệ")
    private String zaloPhone;

    @Column(unique = true)
    private String walletAddress;

    private String avatarUrl;

    @Pattern(regexp = "^\\d{12}$", message = "Số CCCD phải gồm 12 chữ số")
    private String cccdNumber;

    @Column(columnDefinition = "TEXT")
    private String cccdImages;

    @Column(columnDefinition = "TEXT")
    private String kycMetadata;

    @Enumerated(EnumType.STRING)
    @NotNull(message = "Trạng thái KYC không được để trống")
    private KYCStatus kycStatus = KYCStatus.PENDING;

    @Min(value = 0, message = "Điểm uy tín không được nhỏ hơn 0")
    @Max(value = 100, message = "Điểm uy tín không được lớn hơn 100")
    private int reputationScore = 50;

    @Enumerated(EnumType.STRING)
    @NotNull(message = "Quyền người dùng không được để trống")
    private Role role;

    @CreationTimestamp
    @Column(updatable = false)
    private LocalDateTime createdAt;

    @UpdateTimestamp
    private LocalDateTime updatedAt;
}
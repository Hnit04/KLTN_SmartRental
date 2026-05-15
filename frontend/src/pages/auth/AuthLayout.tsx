import { motion } from "framer-motion";
import type { ReactNode } from "react";
import "./auth.css";
import Logo from "@/components/shared/Logo";

interface AuthLayoutProps {
  children: ReactNode;
  /** Illustration variant for the brand panel */
  variant?: "login" | "register" | "forgot" | "reset" | "verify";
}

// Brand panel feature items
const features = [
  {
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 22s-8-4.5-8-11.8A8 8 0 0 1 12 2a8 8 0 0 1 8 8.2c0 7.3-8 11.8-8 11.8z" />
        <circle cx="12" cy="10" r="3" />
      </svg>
    ),
    text: "Tìm kiếm phòng trọ thông minh với AI",
  },
  {
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="2" y="7" width="20" height="14" rx="2" ry="2" />
        <path d="M16 7V4a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v3" />
        <line x1="12" y1="11" x2="12" y2="17" />
      </svg>
    ),
    text: "Hợp đồng điện tử minh bạch & an toàn",
  },
  {
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
      </svg>
    ),
    text: "Bảo vệ quyền lợi bằng Blockchain",
  },
];

// Titles per variant
const variantConfig: Record<string, { title: string; subtitle: string }> = {
  login: {
    title: "Chào mừng trở lại!",
    subtitle: "Quản lý nhà trọ thông minh cùng SmartRental — nền tảng được tin dùng bởi hàng ngàn chủ trọ và khách thuê.",
  },
  register: {
    title: "Bắt đầu hành trình!",
    subtitle: "Tham gia cộng đồng SmartRental để trải nghiệm thuê trọ hiện đại, minh bạch và an toàn.",
  },
  forgot: {
    title: "Đừng lo lắng!",
    subtitle: "Chúng tôi sẽ giúp bạn khôi phục quyền truy cập tài khoản một cách nhanh chóng và bảo mật.",
  },
  reset: {
    title: "Bảo mật tài khoản",
    subtitle: "Thiết lập mật khẩu mới mạnh mẽ để bảo vệ tài khoản SmartRental của bạn.",
  },
  verify: {
    title: "Xác thực bảo mật",
    subtitle: "Hệ thống đang kiểm tra và kích hoạt tài khoản của bạn. Vui lòng chờ trong giây lát.",
  },
};

// Animation variants
const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.08, delayChildren: 0.1 },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 18 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.45, ease: [0.25, 0.46, 0.45, 0.94] },
  },
};

export default function AuthLayout({ children, variant = "login" }: AuthLayoutProps) {
  const config = variantConfig[variant] || variantConfig.login;

  return (
    <div className="auth-page">
      {/* ─── Left: Brand Panel ─── */}
      <div className="auth-brand-panel">
        {/* Floating decorative shapes */}
        <div className="auth-shape auth-shape-1" />
        <div className="auth-shape auth-shape-2" />
        <div className="auth-shape auth-shape-3" />
        <div className="auth-shape auth-shape-4" />
        <div className="auth-shape auth-shape-5" />

        <motion.div
          className="auth-brand-content"
          initial={{ opacity: 0, x: -30 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.7, ease: "easeOut" }}
        >
          {/* Logo */}
          <div className="auth-brand-logo">
            <Logo size={36} variant="dark" showWordmark />
          </div>

          <h1 className="auth-brand-title">{config.title}</h1>
          <p className="auth-brand-subtitle">{config.subtitle}</p>

          {/* Feature list */}
          <motion.div
            className="auth-brand-features"
            initial="hidden"
            animate="visible"
            variants={containerVariants}
          >
            {features.map((feature, i) => (
              <motion.div key={i} className="auth-brand-feature" variants={itemVariants}>
                <div className="auth-brand-feature-icon">{feature.icon}</div>
                <span>{feature.text}</span>
              </motion.div>
            ))}
          </motion.div>
        </motion.div>
      </div>

      {/* ─── Right: Form Panel ─── */}
      <div className="auth-form-panel">
        <motion.div
          className="auth-form-card"
          variants={containerVariants}
          initial="hidden"
          animate="visible"
        >
          {/* Mobile logo (hidden on desktop) */}
          <motion.div className="auth-mobile-logo" variants={itemVariants}>
            <div className="auth-mobile-logo-icon">
              <Logo size={20} variant="auto" />
            </div>
            <span className="auth-mobile-logo-text">SmartRental</span>
          </motion.div>

          {children}
        </motion.div>
      </div>
    </div>
  );
}

// Export animation variants for child usage
export { containerVariants, itemVariants };

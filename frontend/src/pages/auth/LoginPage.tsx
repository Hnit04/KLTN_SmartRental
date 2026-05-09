import { useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { toast } from "sonner";
import { userApi } from "@/api/userApi";
import { authApi } from "@/api/authApi";
import { GoogleLogin } from "@react-oauth/google";
import { motion } from "framer-motion";
import { User, Lock, Eye, EyeOff, LogIn, AlertTriangle } from "lucide-react";
import "./auth.css";

const stagger = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.07, delayChildren: 0.1 } },
};
const fadeUp = {
  hidden: { opacity: 0, y: 14 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.4, ease: [0.25, 0.46, 0.45, 0.94] } },
};

export default function LoginPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const redirectUrl = searchParams.get("redirect");
  const { login } = useAuth();

  const [formData, setFormData] = useState({
    username: "",
    password: "",
  });

  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  // Trạng thái modal thông báo khóa tài khoản
  const [showLockedModal, setShowLockedModal] = useState(false);
  const [lockMessage, setLockMessage] = useState("");

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({
      ...formData,
      [e.target.id]: e.target.value,
    });
  };

  const calculateTimeRemaining = (lockUntil?: string | null) => {
    if (!lockUntil) return "vô thời hạn";

    const lockDate = new Date(lockUntil);
    const now = new Date();
    const diffMs = lockDate.getTime() - now.getTime();

    if (diffMs <= 0) return "đã hết thời gian khóa";

    const diffMinutes = Math.floor(diffMs / 60000);
    if (diffMinutes < 60) {
      return `${diffMinutes} phút nữa`;
    }

    const diffHours = Math.floor(diffMinutes / 60);
    const remainingMinutes = diffMinutes % 60;
    if (diffHours < 24) {
      return `${diffHours} giờ ${remainingMinutes > 0 ? `${remainingMinutes} phút ` : ""}nữa`;
    }

    const diffDays = Math.floor(diffHours / 24);
    return `${diffDays} ngày nữa`;
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    if (isLoading) return;
    setIsLoading(true);

    try {
      const user = await userApi.findByUsername(formData.username);

      if (user.locked === true || user.lockUntil !== null) {
        const timeLeft = calculateTimeRemaining(user.lockUntil);

        const reasons =
          user.lockReason && user.lockReason.length > 0
            ? user.lockReason.join(", ")
            : "không có lý do cụ thể";

        setLockMessage(
          `Tài khoản của bạn đang bị khóa.\n\n` +
          `Lý do: ${reasons}\n` +
          `Thời gian còn lại: ${timeLeft}\n\n` +
          `Vui lòng liên hệ quản trị viên để được hỗ trợ thêm.`
        );

        setShowLockedModal(true);
        setIsLoading(false);
        return;
      }

      await login(formData);

      toast.success("Đăng nhập thành công!", {
        description: "Đang chuyển hướng đến Trang chủ...",
        duration: 3000,
      });

      setTimeout(() => {
        if (redirectUrl) {
          navigate(redirectUrl);
        } else {
          if (user.role === "ADMIN") navigate("/admin/dashboard");
          else if (user.role === "LANDLORD") navigate("/landlord/dashboard");
          else navigate("/tenant/dashboard");
        }
      }, 1500);
    } catch (error: any) {
      console.error("Lỗi đăng nhập:", error?.response?.data);

      let message = "Đăng nhập thất bại.";

      if (error?.response?.data) {
        const data = error.response.data;
        if (typeof data === "string") {
          message = data.includes("Bad credentials")
            ? "Sai tên đăng nhập hoặc mật khẩu!"
            : data;
        } else if (data?.message) {
          message = data.message;
        }
      } else if (error?.message) {
        message = error.message;
      }

      toast.error(message, { duration: 5000 });
    } finally {
      setIsLoading(false);
    }
  };

  // Xử lý đăng nhập Google thành công
  const handleGoogleSuccess = async (credentialResponse: any) => {
    try {
      const idToken = credentialResponse.credential;
      if (!idToken) throw new Error("Không nhận được ID Token từ Google");

      setIsLoading(true);

      const response = await authApi.googleLogin({ idToken });

      await login(response);

      toast.success("Đăng nhập Google thành công!", {
        description: "Đang chuyển hướng..."
      });

      setTimeout(() => {
        if (redirectUrl) {
          navigate(redirectUrl);
        } else {
          const role = response.user?.role;
          if (role === 'ADMIN') navigate("/admin/dashboard");
          else if (role === 'LANDLORD') navigate("/landlord/dashboard");
          else navigate("/tenant/dashboard");
        }
      }, 800);

    } catch (error: any) {
      console.error("Lỗi Google Login:", error);

      const errMsg = error.response?.data?.error
        || error.message
        || "Xác thực Google thất bại";

      toast.error(errMsg, { duration: 6000 });
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleError = () => {
    toast.error("Đăng nhập Google bị hủy hoặc gặp lỗi.", { duration: 4000 });
  };

  return (
    <>
      <div className="auth-bg">
        <div className="auth-bg-overlay" />

        <motion.div
          className="auth-card"
          variants={stagger}
          initial="hidden"
          animate="visible"
        >
          {/* Header */}
          <motion.div className="auth-form-header" variants={fadeUp}>
            <div className="auth-form-icon">
              <LogIn size={24} />
            </div>
            <h1 className="auth-form-title">SmartRental</h1>
            <p className="auth-form-desc">Tìm kiếm tổ ấm hoàn hảo của bạn</p>
          </motion.div>

          <form onSubmit={handleSubmit}>
            {/* Username */}
            <motion.div variants={fadeUp} style={{ marginBottom: "1rem" }}>
              <label htmlFor="username" className="auth-label">Tên đăng nhập</label>
              <div className="auth-input-group">
                <User size={17} className="auth-input-icon" />
                <input
                  id="username"
                  type="text"
                  placeholder="Nhập tên đăng nhập"
                  required
                  value={formData.username}
                  onChange={handleChange}
                  autoFocus
                  className="auth-input-field"
                />
              </div>
            </motion.div>

            {/* Password */}
            <motion.div variants={fadeUp} style={{ marginBottom: "0.5rem" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "6px" }}>
                <label htmlFor="password" className="auth-label" style={{ marginBottom: 0 }}>Mật khẩu</label>
                <Link to="/forgot-password" className="auth-link" style={{ fontSize: "0.78rem" }}>
                  Quên mật khẩu?
                </Link>
              </div>
              <div className="auth-input-group">
                <Lock size={17} className="auth-input-icon" />
                <input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="••••••••"
                  required
                  value={formData.password}
                  onChange={handleChange}
                  className="auth-input-field has-toggle"
                />
                <button type="button" onClick={() => setShowPassword(!showPassword)} className="auth-input-toggle">
                  {showPassword ? <EyeOff size={17} /> : <Eye size={17} />}
                </button>
              </div>
            </motion.div>

            {/* Submit */}
            <motion.div variants={fadeUp} style={{ marginTop: "1.5rem" }}>
              <button type="submit" disabled={isLoading} className="auth-submit-btn">
                {isLoading ? (
                  <span style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "8px" }}>
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" style={{ animation: "auth-spin 1s linear infinite" }}>
                      <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" strokeDasharray="42" strokeLinecap="round" />
                    </svg>
                    Đang xử lý...
                  </span>
                ) : (
                  "Đăng nhập vào hệ thống"
                )}
              </button>
            </motion.div>
          </form>

          {/* Divider */}
          <motion.div className="auth-divider" variants={fadeUp}>
            <div className="auth-divider-line" />
            <span className="auth-divider-text">hoặc</span>
            <div className="auth-divider-line" />
          </motion.div>

          {/* Google Login */}
          <motion.div className="auth-google-wrapper" variants={fadeUp}>
            <GoogleLogin
              onSuccess={handleGoogleSuccess}
              onError={handleGoogleError}
              theme="outline"
              text="signin_with"
              shape="rectangular"
              logo_alignment="left"
            />
          </motion.div>

          {/* Footer */}
          <motion.div className="auth-footer" variants={fadeUp}>
            Chưa có tài khoản?{" "}
            <Link to="/register" className="auth-link">Đăng ký ngay</Link>
          </motion.div>
        </motion.div>
      </div>

      {/* Modal thông báo khóa tài khoản */}
      {showLockedModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-md p-4 animate-in fade-in duration-200">
          <motion.div
            className="w-full max-w-md bg-white rounded-2xl shadow-2xl overflow-hidden"
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.3 }}
          >
            <div className="p-6 flex items-center gap-3 border-b" style={{ background: "hsl(0, 85%, 97%)" }}>
              <div style={{ background: "hsl(0, 80%, 93%)", color: "hsl(0, 72%, 50%)", padding: "10px", borderRadius: "12px" }}>
                <AlertTriangle size={22} />
              </div>
              <h3 style={{ fontSize: "1.1rem", fontWeight: 800, color: "hsl(0, 72%, 40%)" }}>
                Tài khoản bị khóa
              </h3>
            </div>

            <div className="p-6 whitespace-pre-line text-gray-700 font-medium leading-relaxed" style={{ fontSize: "0.88rem" }}>
              {lockMessage}
            </div>

            <div className="p-5 border-t bg-gray-50 flex justify-end">
              <button
                onClick={() => setShowLockedModal(false)}
                style={{
                  padding: "10px 24px",
                  background: "hsl(20, 14%, 15%)",
                  color: "white",
                  fontWeight: 700,
                  borderRadius: "12px",
                  border: "none",
                  cursor: "pointer",
                  fontSize: "0.88rem",
                }}
              >
                Đã hiểu
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </>
  );
}
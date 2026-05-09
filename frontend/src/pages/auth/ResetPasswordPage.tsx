import { useState } from "react";
import { useNavigate, useSearchParams, Link } from "react-router-dom";
import { authApi } from "@/api/authApi";
import { toast } from "sonner";
import { motion } from "framer-motion";
import { Lock, Eye, EyeOff, ShieldCheck, ArrowLeft, CheckCircle2 } from "lucide-react";
import "./auth.css";

function getPasswordStrength(pw: string) {
  if (!pw) return { level: 0, label: "", className: "" };
  let s = 0;
  if (pw.length >= 6) s++;
  if (pw.length >= 10) s++;
  if (/[A-Z]/.test(pw)) s++;
  if (/[0-9]/.test(pw)) s++;
  if (/[^A-Za-z0-9]/.test(pw)) s++;
  if (s <= 2) return { level: 1, label: "Yếu", className: "weak" };
  if (s <= 3) return { level: 2, label: "Trung bình", className: "medium" };
  return { level: 3, label: "Mạnh", className: "strong" };
}

const stagger = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.07, delayChildren: 0.1 } },
};
const fadeUp = {
  hidden: { opacity: 0, y: 14 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.4 } },
};

export default function ResetPasswordPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const [formData, setFormData] = useState({
    email: searchParams.get("email") || "",
    code: searchParams.get("code") || "",
    newPassword: "",
    confirmPassword: "",
  });

  const [isLoading, setIsLoading] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const pwStrength = getPasswordStrength(formData.newPassword);
  const match = formData.confirmPassword.length > 0 && formData.newPassword === formData.confirmPassword;
  const mismatch = formData.confirmPassword.length > 0 && formData.newPassword !== formData.confirmPassword;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (formData.newPassword !== formData.confirmPassword) {
      return toast.error("Mật khẩu nhập lại không khớp!");
    }
    if (formData.newPassword.length < 6) {
      return toast.error("Mật khẩu mới phải có ít nhất 6 ký tự!");
    }

    setIsLoading(true);
    try {
      await authApi.resetPassword({
        email: formData.email,
        code: formData.code,
        newPassword: formData.newPassword,
      });

      toast.success("Thành công!", {
        description: "Mật khẩu đã được thay đổi. Đang chuyển hướng...",
      });
      setTimeout(() => navigate("/login"), 2000);
    } catch (error: any) {
      toast.error(
        error?.response?.data?.message ||
        error?.response?.data ||
        "Đã có lỗi xảy ra. Vui lòng thử lại."
      );
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="auth-bg">
      <div className="auth-bg-overlay" />

      <motion.div
        className="auth-card"
        variants={stagger}
        initial="hidden"
        animate="visible"
      >
        <motion.div className="auth-form-header" variants={fadeUp}>
          <div className="auth-form-icon"><ShieldCheck size={24} /></div>
          <h1 className="auth-form-title">Đặt lại mật khẩu</h1>
          <p className="auth-form-desc">Thiết lập mật khẩu mới cho tài khoản của bạn</p>
        </motion.div>

        <form onSubmit={handleSubmit}>
          {/* Email (disabled) */}
          <motion.div variants={fadeUp} style={{ marginBottom: "1rem" }}>
            <label className="auth-label">Email</label>
            <input
              value={formData.email}
              disabled
              className="auth-input-field"
              style={{ background: "hsl(30, 10%, 94%)", cursor: "not-allowed", color: "hsl(25, 5%, 50%)", paddingLeft: "0.875rem" }}
            />
          </motion.div>

          {/* New Password */}
          <motion.div variants={fadeUp} style={{ marginBottom: "1rem" }}>
            <label htmlFor="newPassword" className="auth-label">Mật khẩu mới</label>
            <div className="auth-input-group">
              <Lock size={17} className="auth-input-icon" />
              <input
                id="newPassword"
                type={showNew ? "text" : "password"}
                placeholder="••••••••"
                required
                value={formData.newPassword}
                onChange={(e) => setFormData({ ...formData, newPassword: e.target.value })}
                className="auth-input-field has-toggle"
                autoFocus
              />
              <button type="button" onClick={() => setShowNew(!showNew)} className="auth-input-toggle">
                {showNew ? <EyeOff size={17} /> : <Eye size={17} />}
              </button>
            </div>
            {formData.newPassword && (
              <div>
                <div className="auth-password-strength">
                  {[1, 2, 3].map((l) => (
                    <div key={l} className={`auth-password-bar ${l <= pwStrength.level ? `active ${pwStrength.className}` : ""}`} />
                  ))}
                </div>
                <div className={`auth-password-label ${pwStrength.className}`}>{pwStrength.label}</div>
              </div>
            )}
          </motion.div>

          {/* Confirm Password */}
          <motion.div variants={fadeUp} style={{ marginBottom: "1.5rem" }}>
            <label htmlFor="confirmPassword" className="auth-label">Xác nhận mật khẩu</label>
            <div className="auth-input-group">
              <Lock size={17} className="auth-input-icon" />
              <input
                id="confirmPassword"
                type={showConfirm ? "text" : "password"}
                placeholder="••••••••"
                required
                value={formData.confirmPassword}
                onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                className="auth-input-field has-toggle"
                style={{ borderColor: match ? "hsl(142, 71%, 45%)" : mismatch ? "hsl(0, 72%, 58%)" : undefined }}
              />
              <button type="button" onClick={() => setShowConfirm(!showConfirm)} className="auth-input-toggle">
                {showConfirm ? <EyeOff size={17} /> : <Eye size={17} />}
              </button>
            </div>
            {match && (
              <div style={{ display: "flex", alignItems: "center", gap: "5px", marginTop: "5px", color: "hsl(142, 71%, 40%)", fontSize: "0.78rem", fontWeight: 600 }}>
                <CheckCircle2 size={13} /> Mật khẩu khớp
              </div>
            )}
            {mismatch && (
              <div style={{ marginTop: "5px", color: "hsl(0, 72%, 50%)", fontSize: "0.78rem", fontWeight: 600 }}>
                Mật khẩu không khớp
              </div>
            )}
          </motion.div>

          {/* Submit */}
          <motion.div variants={fadeUp}>
            <button type="submit" disabled={isLoading} className="auth-submit-btn">
              {isLoading ? (
                <span style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "8px" }}>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" style={{ animation: "auth-spin 1s linear infinite" }}>
                    <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" strokeDasharray="42" strokeLinecap="round" />
                  </svg>
                  Đang xử lý...
                </span>
              ) : (
                <span style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "8px" }}>
                  <ShieldCheck size={17} /> Cập nhật mật khẩu
                </span>
              )}
            </button>
          </motion.div>
        </form>

        <motion.div className="auth-footer" variants={fadeUp}>
          Nhớ ra mật khẩu?{" "}
          <Link to="/login" className="auth-link" style={{ display: "inline-flex", alignItems: "center", gap: "4px" }}>
            <ArrowLeft size={13} /> Quay lại Đăng nhập
          </Link>
        </motion.div>
      </motion.div>
    </div>
  );
}
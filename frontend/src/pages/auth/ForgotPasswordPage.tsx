import { useState } from "react";
import { Link } from "react-router-dom";
import { authApi } from "@/api/authApi";
import { toast } from "sonner";
import { motion } from "framer-motion";
import { Mail, ArrowLeft, Send, CheckCircle2 } from "lucide-react";
import "./auth.css";

const stagger = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.07, delayChildren: 0.1 } },
};
const fadeUp = {
  hidden: { opacity: 0, y: 14 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.4 } },
};

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isSent, setIsSent] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      await authApi.forgotPassword(email);
      toast.success("Thành công!", {
        description: "Vui lòng kiểm tra email để lấy mã xác thực.",
        duration: 5000,
      });
      setIsSent(true);
    } catch (error: any) {
      toast.error(error?.response?.data || "Email không tồn tại trong hệ thống.");
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
        {isSent ? (
          /* ─── Success state ─── */
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.4 }}
            style={{ textAlign: "center" }}
          >
            <div style={{
              display: "inline-flex", alignItems: "center", justifyContent: "center",
              width: "68px", height: "68px", borderRadius: "50%",
              background: "hsl(142, 50%, 94%)", color: "hsl(142, 71%, 40%)",
              marginBottom: "1.25rem",
            }}>
              <CheckCircle2 size={34} />
            </div>
            <h1 className="auth-form-title" style={{ marginBottom: "0.5rem" }}>Email đã được gửi!</h1>
            <p className="auth-form-desc" style={{ marginBottom: "1.75rem" }}>
              Mã xác thực đã được gửi đến <strong style={{ color: "hsl(28, 45%, 45%)" }}>{email}</strong>.
              Vui lòng kiểm tra hộp thư (bao gồm thư rác).
            </p>

            <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
              <button
                onClick={() => { setIsSent(false); setEmail(""); }}
                className="auth-submit-btn"
                style={{ background: "hsl(30, 15%, 92%)", color: "hsl(20, 14%, 22%)" }}
              >
                Gửi lại với email khác
              </button>
              <Link
                to="/login"
                className="auth-link"
                style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "6px", fontSize: "0.88rem", padding: "0.6rem" }}
              >
                <ArrowLeft size={15} /> Quay lại Đăng nhập
              </Link>
            </div>
          </motion.div>
        ) : (
          /* ─── Form state ─── */
          <>
            <motion.div className="auth-form-header" variants={fadeUp}>
              <div className="auth-form-icon"><Mail size={24} /></div>
              <h1 className="auth-form-title">Quên mật khẩu?</h1>
              <p className="auth-form-desc">
                Nhập email tài khoản của bạn để nhận mã khôi phục mật khẩu từ SmartRental.
              </p>
            </motion.div>

            <form onSubmit={handleSubmit}>
              <motion.div variants={fadeUp} style={{ marginBottom: "1.5rem" }}>
                <label htmlFor="email" className="auth-label">Email tài khoản</label>
                <div className="auth-input-group">
                  <Mail size={17} className="auth-input-icon" />
                  <input
                    id="email"
                    type="email"
                    placeholder="name@example.com"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="auth-input-field"
                    autoFocus
                  />
                </div>
              </motion.div>

              <motion.div variants={fadeUp}>
                <button type="submit" disabled={isLoading} className="auth-submit-btn">
                  {isLoading ? (
                    <span style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "8px" }}>
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" style={{ animation: "auth-spin 1s linear infinite" }}>
                        <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" strokeDasharray="42" strokeLinecap="round" />
                      </svg>
                      Đang gửi yêu cầu...
                    </span>
                  ) : (
                    <span style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "8px" }}>
                      <Send size={17} /> Gửi mã xác thực
                    </span>
                  )}
                </button>
              </motion.div>
            </form>

            <motion.div className="auth-footer" variants={fadeUp}>
              <Link to="/login" className="auth-link" style={{ display: "inline-flex", alignItems: "center", gap: "5px" }}>
                <ArrowLeft size={14} /> Quay lại Đăng nhập
              </Link>
            </motion.div>
          </>
        )}
      </motion.div>
    </div>
  );
}
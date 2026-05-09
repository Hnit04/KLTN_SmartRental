import { useState, useRef, useCallback } from "react";
import { useNavigate, Link, useSearchParams } from "react-router-dom";
import { authApi } from "../../api/authApi";
import type { RegisterRequest } from "../../types/index";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";
import {
  User as UserIcon,
  Lock,
  Mail,
  Eye,
  EyeOff,
  UserPlus,
  Wallet,
  CheckCircle2,
  ArrowLeft,
  RefreshCw,
  Home,
  Search,
} from "lucide-react";
import "./auth.css";

// ─── Password Strength ───────────────────────────────────────
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

// ─── OTP 6-digit Input ───────────────────────────────────────
function OtpInput({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const refs = useRef<(HTMLInputElement | null)[]>([]);
  const digits = value.padEnd(6, " ").split("").slice(0, 6);

  const onInput = useCallback(
    (i: number, ch: string) => {
      if (!/^\d$/.test(ch)) return;
      const d = [...digits]; d[i] = ch;
      onChange(d.join("").replace(/\s/g, ""));
      if (i < 5) refs.current[i + 1]?.focus();
    },
    [digits, onChange]
  );

  const onKey = useCallback(
    (i: number, e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === "Backspace") {
        e.preventDefault();
        const d = [...digits];
        if (d[i].trim()) { d[i] = " "; onChange(d.join("").replace(/\s/g, "")); }
        else if (i > 0) { d[i - 1] = " "; onChange(d.join("").replace(/\s/g, "")); refs.current[i - 1]?.focus(); }
      } else if (e.key === "ArrowLeft" && i > 0) refs.current[i - 1]?.focus();
      else if (e.key === "ArrowRight" && i < 5) refs.current[i + 1]?.focus();
    },
    [digits, onChange]
  );

  const onPaste = useCallback(
    (e: React.ClipboardEvent) => {
      e.preventDefault();
      const p = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, 6);
      onChange(p);
      refs.current[Math.min(p.length, 5)]?.focus();
    },
    [onChange]
  );

  return (
    <div className="auth-otp-grid">
      {digits.map((d, i) => (
        <input
          key={i}
          ref={(el) => { refs.current[i] = el; }}
          type="text"
          inputMode="numeric"
          maxLength={1}
          value={d.trim()}
          className={`auth-otp-input ${d.trim() ? "filled" : ""}`}
          onInput={(e) => onInput(i, (e.target as HTMLInputElement).value.slice(-1))}
          onKeyDown={(e) => onKey(i, e)}
          onPaste={onPaste}
          autoFocus={i === 0}
        />
      ))}
    </div>
  );
}

const stagger = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.06, delayChildren: 0.08 } },
};
const fadeUp = {
  hidden: { opacity: 0, y: 12 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.35 } },
};

// ─── Main Component ──────────────────────────────────────────
export default function RegisterPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const redirectUrl = searchParams.get("redirect");
  const [isLoading, setIsLoading] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [otpCode, setOtpCode] = useState("");

  const [formData, setFormData] = useState<RegisterRequest>({
    username: "",
    password: "",
    fullName: "",
    email: "",
    walletAddress: "",
    role: "TENANT",
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setFormData({ ...formData, [e.target.id]: e.target.value });
  };

  const validateForm = () => {
    const usernameRegex = /^[a-zA-Z0-9_]+$/;
    if (!usernameRegex.test(formData.username)) {
      toast.error("Tên đăng nhập không hợp lệ."); return false;
    }
    if (formData.username.length < 4) {
      toast.error("Tên đăng nhập phải có ít nhất 4 ký tự."); return false;
    }
    if ((formData.password || "").length < 6) {
      toast.error("Mật khẩu phải có ít nhất 6 ký tự."); return false;
    }
    if (formData.walletAddress && formData.walletAddress.trim() !== "") {
      if (!/^0x[a-fA-F0-9]{40}$/.test(formData.walletAddress)) {
        toast.error("Địa chỉ ví không hợp lệ."); return false;
      }
    }
    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;
    setIsLoading(true);
    try {
      await authApi.register({
        ...formData,
        username: formData.username.trim(),
        email: formData.email.trim(),
        walletAddress: formData.walletAddress?.trim() || ""
      });
      toast.success("Mã xác thực đã được gửi!");
      setIsVerifying(true);
    } catch (error: any) {
      const msg = error.response?.data?.message || error.response?.data || "Đăng ký thất bại";
      toast.error(typeof msg === 'string' ? msg : "Lỗi hệ thống.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (otpCode.length < 6) { toast.error("Vui lòng nhập đủ 6 số."); return; }
    setIsLoading(true);
    try {
      await authApi.verifyOtp({ email: formData.email, code: otpCode });
      toast.success("Kích hoạt tài khoản thành công!");
      navigate(redirectUrl ? `/login?redirect=${encodeURIComponent(redirectUrl)}` : "/login");
    } catch (error: any) {
      toast.error(error.response?.data?.message || "Mã OTP không đúng");
    } finally {
      setIsLoading(false);
    }
  };

  const handleResendOtp = async () => {
    setIsResending(true);
    try {
      await authApi.resendOtp(formData.email);
      toast.success("Mã OTP mới đã được gửi!");
    } catch { toast.error("Không thể gửi lại mã."); }
    finally { setIsResending(false); }
  };

  const pwStrength = getPasswordStrength(formData.password || "");

  return (
    <div className="auth-bg">
      <div className="auth-bg-overlay" />

      <motion.div
        className="auth-card auth-card-wide"
        variants={stagger}
        initial="hidden"
        animate="visible"
      >
        {/* Stepper */}
        <motion.div className="auth-stepper" variants={fadeUp}>
          <div className={`auth-step ${!isVerifying ? "active" : "completed"}`}>
            <div className="auth-step-number">{isVerifying ? <CheckCircle2 size={14} /> : "1"}</div>
            <span className="auth-step-label">Thông tin</span>
          </div>
          <div className={`auth-step-connector ${isVerifying ? "active" : ""}`} />
          <div className={`auth-step ${isVerifying ? "active" : ""}`}>
            <div className="auth-step-number">2</div>
            <span className="auth-step-label">Xác thực</span>
          </div>
        </motion.div>

        <AnimatePresence mode="wait">
          {!isVerifying ? (
            /* ─── REGISTER FORM ─── */
            <motion.div
              key="reg"
              initial={{ opacity: 0, x: -15 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -15 }}
              transition={{ duration: 0.3 }}
            >
              <div className="auth-form-header">
                <div className="auth-form-icon"><UserPlus size={24} /></div>
                <h1 className="auth-form-title">Tạo tài khoản</h1>
                <p className="auth-form-desc">Khám phá không gian sống lý tưởng cùng SmartRental</p>
              </div>

              <form onSubmit={handleSubmit}>
                {/* Username + Full Name */}
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px", marginBottom: "0.875rem" }}>
                  <div>
                    <label htmlFor="username" className="auth-label">Tên đăng nhập *</label>
                    <div className="auth-input-group">
                      <UserIcon size={15} className="auth-input-icon" />
                      <input id="username" required value={formData.username} onChange={handleChange} placeholder="user123" className="auth-input-field" />
                    </div>
                  </div>
                  <div>
                    <label htmlFor="fullName" className="auth-label">Họ và tên *</label>
                    <div className="auth-input-group">
                      <UserIcon size={15} className="auth-input-icon" />
                      <input id="fullName" required value={formData.fullName} onChange={handleChange} placeholder="Nguyễn Văn A" className="auth-input-field" />
                    </div>
                  </div>
                </div>

                {/* Email */}
                <div style={{ marginBottom: "0.875rem" }}>
                  <label htmlFor="email" className="auth-label">Email *</label>
                  <div className="auth-input-group">
                    <Mail size={15} className="auth-input-icon" />
                    <input id="email" type="email" required value={formData.email} onChange={handleChange} placeholder="example@gmail.com" className="auth-input-field" />
                  </div>
                </div>

                {/* Password */}
                <div style={{ marginBottom: "0.875rem" }}>
                  <label htmlFor="password" className="auth-label">Mật khẩu *</label>
                  <div className="auth-input-group">
                    <Lock size={15} className="auth-input-icon" />
                    <input id="password" type={showPassword ? "text" : "password"} required value={formData.password} onChange={handleChange} placeholder="••••••••" className="auth-input-field has-toggle" />
                    <button type="button" onClick={() => setShowPassword(!showPassword)} className="auth-input-toggle">
                      {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                    </button>
                  </div>
                  {formData.password && (
                    <div>
                      <div className="auth-password-strength">
                        {[1, 2, 3].map((l) => (
                          <div key={l} className={`auth-password-bar ${l <= pwStrength.level ? `active ${pwStrength.className}` : ""}`} />
                        ))}
                      </div>
                      <div className={`auth-password-label ${pwStrength.className}`}>{pwStrength.label}</div>
                    </div>
                  )}
                </div>

                {/* Role */}
                <div style={{ marginBottom: "0.875rem" }}>
                  <label className="auth-label">Vai trò</label>
                  <div className="auth-role-grid">
                    <div className={`auth-role-card ${formData.role === "TENANT" ? "selected" : ""}`} onClick={() => setFormData({ ...formData, role: "TENANT" })}>
                      <div className="auth-role-card-icon"><Search size={18} /></div>
                      <span className="auth-role-card-label">Người thuê</span>
                      <span className="auth-role-card-desc">Tìm phòng trọ</span>
                    </div>
                    <div className={`auth-role-card ${formData.role === "LANDLORD" ? "selected" : ""}`} onClick={() => setFormData({ ...formData, role: "LANDLORD" })}>
                      <div className="auth-role-card-icon"><Home size={18} /></div>
                      <span className="auth-role-card-label">Chủ trọ</span>
                      <span className="auth-role-card-desc">Quản lý nhà trọ</span>
                    </div>
                  </div>
                </div>

                {/* Wallet */}
                <div style={{ marginBottom: "1.125rem" }}>
                  <label htmlFor="walletAddress" className="auth-label">
                    Địa chỉ ví <span style={{ color: "hsl(25, 5%, 55%)", fontWeight: 500 }}>(Tùy chọn)</span>
                  </label>
                  <div className="auth-input-group">
                    <Wallet size={15} className="auth-input-icon" />
                    <input id="walletAddress" placeholder="0x..." value={formData.walletAddress} onChange={handleChange} className="auth-input-field" />
                  </div>
                </div>

                {/* Submit */}
                <button type="submit" disabled={isLoading} className="auth-submit-btn">
                  {isLoading ? (
                    <span style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "8px" }}>
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" style={{ animation: "auth-spin 1s linear infinite" }}>
                        <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" strokeDasharray="42" strokeLinecap="round" />
                      </svg>
                      Đang xử lý...
                    </span>
                  ) : "Tiếp tục đăng ký"}
                </button>
              </form>
            </motion.div>
          ) : (
            /* ─── OTP FORM ─── */
            <motion.div
              key="otp"
              initial={{ opacity: 0, x: 15 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 15 }}
              transition={{ duration: 0.3 }}
            >
              <div className="auth-form-header">
                <div className="auth-form-icon"><Mail size={24} /></div>
                <h1 className="auth-form-title">Xác thực Email</h1>
                <p className="auth-form-desc">
                  Nhập mã 6 số đã gửi đến <strong style={{ color: "hsl(28, 45%, 45%)" }}>{formData.email}</strong>
                </p>
              </div>

              <form onSubmit={handleVerifyOtp}>
                <div style={{ marginBottom: "1.75rem" }}>
                  <OtpInput value={otpCode} onChange={setOtpCode} />
                </div>

                <button type="submit" disabled={isLoading} className="auth-submit-btn">
                  {isLoading ? (
                    <span style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "8px" }}>
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" style={{ animation: "auth-spin 1s linear infinite" }}>
                        <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" strokeDasharray="42" strokeLinecap="round" />
                      </svg>
                      Đang xác thực...
                    </span>
                  ) : (
                    <span style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "8px" }}>
                      <CheckCircle2 size={17} /> Xác nhận kích hoạt
                    </span>
                  )}
                </button>

                <div style={{ display: "flex", flexDirection: "column", gap: "10px", alignItems: "center", marginTop: "1.25rem" }}>
                  <button type="button" onClick={() => { setIsVerifying(false); setOtpCode(""); }}
                    style={{ display: "flex", alignItems: "center", gap: "5px", fontSize: "0.82rem", fontWeight: 600, color: "hsl(25, 5%, 48%)", background: "none", border: "none", cursor: "pointer" }}>
                    <ArrowLeft size={14} /> Quay lại sửa thông tin
                  </button>
                  <button type="button" onClick={handleResendOtp} disabled={isResending} className="auth-link"
                    style={{ display: "flex", alignItems: "center", gap: "5px", fontSize: "0.82rem", background: "none", border: "none", cursor: isResending ? "not-allowed" : "pointer", opacity: isResending ? 0.5 : 1 }}>
                    <RefreshCw size={13} /> {isResending ? "Đang gửi..." : "Gửi lại mã OTP"}
                  </button>
                </div>
              </form>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Footer */}
        <motion.div className="auth-footer" variants={fadeUp}>
          Đã có tài khoản?{" "}
          <Link to={redirectUrl ? `/login?redirect=${encodeURIComponent(redirectUrl)}` : "/login"} className="auth-link">
            Đăng nhập ngay
          </Link>
        </motion.div>
      </motion.div>
    </div>
  );
}
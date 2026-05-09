import { useEffect, useRef } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { authApi } from "../../api/authApi";
import { toast } from "sonner";
import { motion } from "framer-motion";
import { CheckCircle2 } from "lucide-react";
import "./auth.css";

export default function VerifyOtpPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const hasCalled = useRef(false);

  useEffect(() => {
    const email = searchParams.get("email");
    const code = searchParams.get("code");

    if (email && code && !hasCalled.current) {
      hasCalled.current = true;
      handleAutoVerify(email, code);
    } else if (!email || !code) {
      toast.error("Thiếu thông tin xác thực.");
      navigate("/register");
    }
  }, [searchParams, navigate]);

  const handleAutoVerify = async (email: string, code: string) => {
    try {
      await authApi.verifyOtp({ email, code });
      toast.success("Xác thực thành công!", {
        description: "Tài khoản của bạn đã được kích hoạt. Đang chuyển hướng đến Đăng nhập...",
        duration: 3000,
      });

      setTimeout(() => navigate("/login"), 2000);
    } catch (error: any) {
      toast.error("Xác thực thất bại", {
        description: "Link xác thực không hợp lệ hoặc đã hết hạn. Vui lòng đăng ký lại.",
      });
      navigate("/register");
    }
  };

  return (
    <div className="auth-bg">
      <div className="auth-bg-overlay" />

      <motion.div
        className="auth-card"
        style={{ maxWidth: "380px", textAlign: "center" }}
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5 }}
      >
        {/* Spinner */}
        <div className="auth-spinner">
          <div className="auth-spinner-ring" />
          <div className="auth-spinner-ring-active" />
          <div className="auth-spinner-icon">
            <CheckCircle2 size={26} style={{ animation: "auth-pulse-ring 2s ease-in-out infinite" }} />
          </div>
        </div>

        <h2 className="auth-form-title" style={{ fontSize: "1.4rem" }}>Đang xác thực</h2>
        <p className="auth-form-desc" style={{ maxWidth: "280px", margin: "0.25rem auto 0" }}>
          Vui lòng đợi trong giây lát, hệ thống đang kiểm tra thông tin tài khoản của bạn.
        </p>

        <div style={{
          paddingTop: "1.25rem",
          borderTop: "1px solid hsl(30, 15%, 90%)",
          marginTop: "1.5rem",
        }}>
          <p style={{
            fontSize: "0.62rem",
            textTransform: "uppercase",
            letterSpacing: "0.15em",
            color: "hsl(25, 5%, 60%)",
            fontWeight: 700,
          }}>
            SmartRental Security System
          </p>
        </div>
      </motion.div>
    </div>
  );
}
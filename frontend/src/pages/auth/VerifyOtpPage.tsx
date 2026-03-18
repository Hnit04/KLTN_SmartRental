import { useEffect, useRef } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { authApi } from "../../api/authApi";
import { toast } from "sonner";

export default function VerifyOtpPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const hasCalled = useRef(false); // Tránh gọi API 2 lần do StrictMode

  useEffect(() => {
    const email = searchParams.get("email");
    const code = searchParams.get("code");

    if (email && code && !hasCalled.current) {
      hasCalled.current = true;
      handleAutoVerify(email, code);
    }
  }, [searchParams]);

  const handleAutoVerify = async (email: string, code: string) => {
    try {
      await authApi.verifyOtp({ email, code });
      toast.success("Xác thực thành công! Đang chuyển hướng...");
      
      // Chờ 2 giây để user kịp nhìn thông báo rồi chuyển trang
      setTimeout(() => navigate("/login"), 2000);
    } catch (error: any) {
      toast.error("Link xác thực không hợp lệ hoặc đã hết hạn.");
      navigate("/register"); // Quay lại trang đăng ký nếu lỗi
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-muted/40">
      <div className="text-center p-8 bg-white rounded-lg shadow-md">
        <h2 className="text-xl font-semibold mb-4">Đang xác thực tài khoản...</h2>
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
        <p className="mt-4 text-muted-foreground">Vui lòng đợi trong giây lát.</p>
      </div>
    </div>
  );
}
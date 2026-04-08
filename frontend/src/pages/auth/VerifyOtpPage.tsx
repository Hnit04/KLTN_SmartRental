import { useEffect, useRef } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { authApi } from "../../api/authApi";
import { toast } from "sonner";

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
    <div
      className="relative min-h-screen flex items-center justify-center p-4 bg-cover bg-center bg-no-repeat"
      style={{
        backgroundImage: "url('https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?q=80&w=2070&auto=format&fit=crop')",
      }}
    >
      {/* Overlay làm mờ nền đồng bộ */}
      <div className="absolute inset-0 bg-slate-900/50 backdrop-blur-[6px]"></div>

      {/* Card Trạng thái Glassmorphism */}
      <div className="relative w-full max-w-sm bg-white/95 backdrop-blur-xl p-10 rounded-3xl shadow-[0_8px_30px_rgb(0,0,0,0.12)] border border-white/40 text-center space-y-6">
        
        {/* Spinner Animation xịn hơn */}
        <div className="relative mx-auto w-20 h-20">
          <div className="absolute inset-0 rounded-full border-4 border-primary/20"></div>
          <div className="absolute inset-0 rounded-full border-4 border-primary border-t-transparent animate-spin"></div>
          <div className="absolute inset-0 flex items-center justify-center text-primary">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 animate-pulse" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
        </div>

        <div className="space-y-2">
          <h2 className="text-2xl font-extrabold tracking-tight text-gray-900">
            Đang xác thực
          </h2>
          <p className="text-sm text-gray-500 font-medium">
            Vui lòng đợi trong giây lát, hệ thống đang kiểm tra thông tin tài khoản của bạn.
          </p>
        </div>

        {/* Lớp trang trí nhẹ phía dưới */}
        <div className="pt-4 border-t border-gray-200/60">
          <p className="text-[10px] uppercase tracking-widest text-gray-400 font-bold">
            SmartRental Security System
          </p>
        </div>
      </div>
    </div>
  );
}
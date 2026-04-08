import { useState } from "react";
import { useNavigate, useSearchParams, Link } from "react-router-dom";
import { authApi } from "@/api/authApi";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Label } from "@/components/ui/Label";
import { toast } from "sonner";

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
      const payload = {
        email: formData.email,
        code: formData.code, 
        newPassword: formData.newPassword,
      };

      if (!formData.code || formData.code.trim() === "") {
        await authApi.resetPasswordNoOtp(payload);
      } else {
        await authApi.resetPassword(payload);
      }

      toast.success("Thành công!", {
        description: "Mật khẩu đã được thay đổi. Đang chuyển hướng...",
      });

      setTimeout(() => navigate("/login"), 2000);
    } catch (error: any) {
      const errorMessage = 
        error?.response?.data?.message || 
        error?.response?.data || 
        "Đã có lỗi xảy ra. Vui lòng thử lại.";
      toast.error(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div
      className="relative min-h-screen flex items-center justify-center p-4 bg-cover bg-center bg-no-repeat"
      style={{
        backgroundImage: "url('https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?q=80&w=2070&auto=format&fit=crop')",
      }}
    >
      {/* Lớp Overlay làm mờ nền */}
      <div className="absolute inset-0 bg-slate-900/50 backdrop-blur-[6px]"></div>

      {/* Card Đặt lại mật khẩu Glassmorphism */}
      <div className="relative w-full max-w-md space-y-8 bg-white/95 backdrop-blur-xl p-10 rounded-3xl shadow-[0_8px_30px_rgb(0,0,0,0.12)] border border-white/40">
        
        <div className="text-center space-y-2">
          {/* Icon Khóa/Bảo mật */}
          <div className="mx-auto bg-blue-50 text-primary w-16 h-16 rounded-full flex items-center justify-center mb-4 shadow-sm border border-blue-100">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
          </div>
          <h1 className="text-3xl font-extrabold tracking-tight text-gray-900">
            Đặt lại mật khẩu
          </h1>
          <p className="text-sm text-gray-500 font-medium">
            Thiết lập mật khẩu mới cho tài khoản của bạn
          </p>
        </div>

        <form className="space-y-6 mt-8" onSubmit={handleSubmit}>
          <div className="space-y-2">
            <Label className="text-gray-700 font-semibold ml-1">Email</Label>
            <Input 
              value={formData.email} 
              disabled 
              className="bg-gray-100/50 cursor-not-allowed border-gray-200 text-gray-500 rounded-xl"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="newPassword" className="text-gray-700 font-semibold ml-1">Mật khẩu mới</Label>
            <Input
              id="newPassword"
              type="password"
              placeholder="••••••••"
              required
              value={formData.newPassword}
              onChange={(e) => setFormData({...formData, newPassword: e.target.value})}
              className="bg-white/50 focus:bg-white transition-colors rounded-xl"
              autoFocus
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="confirmPassword" className="text-gray-700 font-semibold ml-1">Xác nhận mật khẩu</Label>
            <Input
              id="confirmPassword"
              type="password"
              placeholder="••••••••"
              required
              value={formData.confirmPassword}
              onChange={(e) => setFormData({...formData, confirmPassword: e.target.value})}
              className="bg-white/50 focus:bg-white transition-colors rounded-xl"
            />
          </div>

          <Button 
            className="w-full bg-primary hover:bg-primary-700 text-white font-semibold py-6 rounded-xl shadow-md transition-all active:scale-[0.98]" 
            type="submit" 
            disabled={isLoading}
          >
            {isLoading ? "Đang xử lý..." : "Cập nhật mật khẩu"}
          </Button>
        </form>

        <div className="text-center text-sm text-gray-600 pt-4 border-t border-gray-200/60 mt-6">
          Nhớ ra mật khẩu?{" "}
          <Link
            to="/login"
            className="font-bold text-primary hover:text-primary-700 hover:underline transition-colors"
          >
            Quay lại Đăng nhập
          </Link>
        </div>
      </div>
    </div>
  );
}
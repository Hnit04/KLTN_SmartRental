import { useState } from "react";
import { Link } from "react-router-dom";
import { authApi } from "@/api/authApi";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Label } from "@/components/ui/Label";
import { toast } from "sonner";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      await authApi.forgotPassword(email);
      
      toast.success("Thành công!", {
        description: "Vui lòng kiểm tra email để lấy mã xác thực.",
        duration: 5000,
      });
    } catch (error: any) {
      toast.error(error?.response?.data || "Email không tồn tại trong hệ thống.");
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

      {/* Card Quên mật khẩu Glassmorphism */}
      <div className="relative w-full max-w-md space-y-8 bg-white/95 backdrop-blur-xl p-10 rounded-3xl shadow-[0_8px_30px_rgb(0,0,0,0.12)] border border-white/40">
        
        <div className="text-center space-y-2">
          {/* Icon Email/Khôi phục */}
          <div className="mx-auto bg-blue-50 text-primary w-16 h-16 rounded-full flex items-center justify-center mb-4 shadow-sm border border-blue-100">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
            </svg>
          </div>
          <h1 className="text-3xl font-extrabold tracking-tight text-gray-900">
            Quên mật khẩu?
          </h1>
          <p className="text-sm text-gray-500 font-medium">
            Nhập email của bạn để nhận mã khôi phục mật khẩu từ SmartRental.
          </p>
        </div>

        <form className="space-y-6 mt-8" onSubmit={handleSubmit}>
          <div className="space-y-2">
            <Label htmlFor="email" className="text-gray-700 font-semibold ml-1">Email tài khoản</Label>
            <Input
              id="email"
              type="email"
              placeholder="name@example.com"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="bg-white/50 focus:bg-white transition-colors rounded-xl h-11"
              autoFocus
            />
          </div>

          <Button 
            className="w-full bg-primary hover:bg-primary-700 text-white font-semibold py-6 rounded-xl shadow-md transition-all active:scale-[0.98]" 
            type="submit" 
            disabled={isLoading}
          >
            {isLoading ? "Đang gửi yêu cầu..." : "Gửi mã xác thực"}
          </Button>
        </form>

        <div className="text-center text-sm text-gray-600 pt-4 border-t border-gray-200/60 mt-6">
          <Link
            to="/login"
            className="font-bold text-primary hover:text-primary-700 hover:underline transition-colors flex items-center justify-center gap-2"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            Quay lại Đăng nhập
          </Link>
        </div>
      </div>
    </div>
  );
}
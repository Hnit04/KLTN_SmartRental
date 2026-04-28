import { useState } from "react";
import { useNavigate, Link, useSearchParams } from "react-router-dom";
import { authApi } from "../../api/authApi";
import type { RegisterRequest } from "../../types/index";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Label } from "@/components/ui/Label";
import { toast } from "sonner";

export default function RegisterPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const redirectUrl = searchParams.get("redirect");
  const [isLoading, setIsLoading] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
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
      toast.error("Tên đăng nhập không hợp lệ.");
      return false;
    }
    if ((formData.password || "").length < 6) {
      toast.error("Mật khẩu phải có ít nhất 6 ký tự.");
      return false;
    }
    if (formData.walletAddress && formData.walletAddress.trim() !== "") {
      const walletRegex = /^0x[a-fA-F0-9]{40}$/;
      if (!walletRegex.test(formData.walletAddress)) {
        toast.error("Địa chỉ ví không hợp lệ.");
        return false;
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
    if (otpCode.length < 6) {
      toast.error("Vui lòng nhập đủ 6 số.");
      return;
    }
    setIsLoading(true);
    try {
      await authApi.verifyOtp({ email: formData.email, code: otpCode });
      toast.success("Kích hoạt tài khoản thành công!");
      const loginTarget = redirectUrl ? `/login?redirect=${encodeURIComponent(redirectUrl)}` : "/login";
      navigate(loginTarget);
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
    } catch (error: any) {
      toast.error("Không thể gửi lại mã.");
    } finally {
      setIsResending(false);
    }
  };

  return (
    <div
      className="relative min-h-screen flex items-center justify-center p-4 bg-cover bg-center bg-no-repeat"
      style={{
        backgroundImage: "url('https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?q=80&w=2070&auto=format&fit=crop')",
      }}
    >
      {/* Overlay mờ nền tương tự Login */}
      <div className="absolute inset-0 bg-slate-900/50 backdrop-blur-[6px]"></div>

      {/* Card Đăng ký Glassmorphism */}
      <div className="relative w-full max-w-lg space-y-8 bg-white/95 backdrop-blur-xl p-8 md:p-10 rounded-3xl shadow-[0_8px_30px_rgb(0,0,0,0.12)] border border-white/40">
        
        <div className="text-center space-y-2">
          {/* Icon Logo */}
          <div className="mx-auto bg-blue-50 text-primary w-16 h-16 rounded-full flex items-center justify-center mb-4 shadow-sm border border-blue-100">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
            </svg>
          </div>
          <h1 className="text-3xl font-extrabold tracking-tight text-gray-900">
            {isVerifying ? "Xác thực Email" : "Tạo tài khoản"}
          </h1>
          <p className="text-sm text-gray-500 font-medium">
            {isVerifying 
              ? `Nhập mã 6 số đã gửi đến ${formData.email}` 
              : "Khám phá không gian sống lý tưởng cùng SmartRental"}
          </p>
        </div>

        {!isVerifying ? (
          /* --- FORM ĐĂNG KÝ --- */
          <form className="space-y-5" onSubmit={handleSubmit}>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="username" className="text-gray-700 font-semibold ml-1">Tên đăng nhập *</Label>
                <Input id="username" required value={formData.username} onChange={handleChange} placeholder="user123" className="bg-white/50 focus:bg-white transition-colors rounded-xl" />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="fullName" className="text-gray-700 font-semibold ml-1">Họ và tên *</Label>
                <Input id="fullName" required value={formData.fullName} onChange={handleChange} placeholder="Nguyễn Văn A" className="bg-white/50 focus:bg-white transition-colors rounded-xl" />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="email" className="text-gray-700 font-semibold ml-1">Email *</Label>
              <Input id="email" type="email" required value={formData.email} onChange={handleChange} placeholder="example@gmail.com" className="bg-white/50 focus:bg-white transition-colors rounded-xl" />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="password" className="text-gray-700 font-semibold ml-1">Mật khẩu *</Label>
              <Input id="password" type="password" required value={formData.password} onChange={handleChange} placeholder="••••••••" className="bg-white/50 focus:bg-white transition-colors rounded-xl" />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="role" className="text-gray-700 font-semibold ml-1">Vai trò</Label>
              <select id="role" className="flex h-11 w-full rounded-xl border border-input bg-white/50 px-3 py-2 text-sm focus:bg-white transition-colors outline-none" value={formData.role} onChange={handleChange}>
                <option value="TENANT">Người thuê phòng (Tenant)</option>
                <option value="LANDLORD">Chủ nhà trọ (Landlord)</option>
              </select>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="walletAddress" className="text-gray-700 font-semibold ml-1">Địa chỉ ví (Tùy chọn)</Label>
              <Input id="walletAddress" placeholder="0x..." value={formData.walletAddress} onChange={handleChange} className="bg-white/50 focus:bg-white transition-colors rounded-xl" />
            </div>

            <Button className="w-full bg-primary hover:bg-primary-700 text-white font-semibold py-6 rounded-xl shadow-md transition-all active:scale-[0.98] mt-2" type="submit" disabled={isLoading}>
              {isLoading ? "Đang xử lý..." : "Tiếp tục đăng ký"}
            </Button>
          </form>
        ) : (
          /* --- FORM NHẬP OTP --- */
          <form onSubmit={handleVerifyOtp} className="space-y-8 items-center">
            <div className="space-y-2">
                <Label htmlFor="otp">Mã xác thực OTP</Label>
                <Input 
                    id="otp" 
                    type="text" 
                    maxLength={6} 
                    className="text-center text-2xl tracking-[1rem] font-bold"
                    placeholder="000000"
                    value={otpCode}
                    onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, ""))}
                    required
                />
            </div>

            <div className="space-y-4">
              <Button className="w-full bg-primary hover:bg-primary-700 text-white font-semibold py-6 rounded-xl shadow-md transition-all active:scale-[0.98]" type="submit" disabled={isLoading}>
                {isLoading ? "Đang xác thực..." : "Xác nhận kích hoạt"}
              </Button>
              
              <div className="flex flex-col gap-3 text-center">
                <button type="button" onClick={() => setIsVerifying(false)} className="text-sm font-semibold text-gray-500 hover:text-primary transition-colors">
                  Quay lại sửa thông tin
                </button>
                <button type="button" onClick={handleResendOtp} disabled={isResending} className="text-sm font-bold text-primary hover:underline disabled:opacity-50">
                  {isResending ? "Đang gửi..." : "Gửi lại mã OTP"}
                </button>
              </div>
            </div>
          </form>
        )}
        
        <div className="text-center text-sm text-gray-600 pt-4 border-t border-gray-200/60 mt-6">
          Đã có tài khoản?{" "}
          <Link 
            to={redirectUrl ? `/login?redirect=${encodeURIComponent(redirectUrl)}` : "/login"} 
            className="font-bold text-primary hover:text-primary-700 hover:underline transition-colors"
          >
            Đăng nhập ngay
          </Link>
        </div>
      </div>
    </div>
  );
}
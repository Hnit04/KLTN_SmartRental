import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { authApi } from "../../api/authApi";
import type { RegisterRequest } from "../../types/index";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Label } from "@/components/ui/Label";
import { toast } from "sonner";

export default function RegisterPage() {
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(false);
  const [isResending, setIsResending] = useState(false);
  
  // Trạng thái kiểm soát việc hiển thị form OTP
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

  // --- XỬ LÝ ĐĂNG KÝ ---
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

      toast.success("Mã xác thực đã được gửi đến email của bạn!");
      setIsVerifying(true); // Chuyển sang giao diện nhập OTP
    } catch (error: any) {
      const msg = error.response?.data?.message || error.response?.data || "Đăng ký thất bại";
      toast.error(typeof msg === 'string' ? msg : "Lỗi hệ thống.");
    } finally {
      setIsLoading(false);
    }
  };

  // --- XỬ LÝ XÁC THỰC OTP ---
  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (otpCode.length < 6) {
        toast.error("Vui lòng nhập đủ 6 số.");
        return void 0;
    }

    setIsLoading(true);
    try {
        await authApi.verifyOtp({
            email: formData.email,
            code: otpCode
        });
        toast.success("Kích hoạt tài khoản thành công!");
        navigate("/login");
    } catch (error: any) {
        const msg = error.response?.data?.message || error.response?.data || "Mã OTP không đúng";
        toast.error(msg);
    } finally {
        setIsLoading(false);
    }
  };

  // --- XỬ LÝ GỬI LẠI OTP ---
  const handleResendOtp = async () => {
    setIsResending(true);
    try {
        await authApi.resendOtp(formData.email);
        toast.success("Mã OTP mới đã được gửi!");
    } catch (error: any) {
        toast.error("Không thể gửi lại mã. Thử lại sau.");
    } finally {
        setIsResending(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-muted/40 p-4">
      <div className="w-full max-w-md space-y-6 bg-card p-8 rounded-xl border shadow-sm">
        
        {/* TIÊU ĐỀ THAY ĐỔI THEO TRẠNG THÁI */}
        <div className="text-center">
          <h1 className="text-2xl font-bold">
            {isVerifying ? "Xác thực Email" : "Tạo tài khoản mới"}
          </h1>
          <p className="text-sm text-muted-foreground mt-2">
            {isVerifying 
              ? `Nhập mã 6 số đã gửi đến ${formData.email}` 
              : "Nhập thông tin để tham gia hệ thống"}
          </p>
        </div>

        {!isVerifying ? (
          /* --- FORM ĐĂNG KÝ BAN ĐẦU --- */
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="username">Tên đăng nhập <span className="text-red-500">*</span></Label>
                <Input id="username" required value={formData.username} onChange={handleChange} placeholder="user123"/>
              </div>
              <div className="space-y-2">
                <Label htmlFor="fullName">Họ và tên <span className="text-red-500">*</span></Label>
                <Input id="fullName" required value={formData.fullName} onChange={handleChange} placeholder="Nguyễn Văn A"/>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">Email <span className="text-red-500">*</span></Label>
              <Input id="email" type="email" required value={formData.email} onChange={handleChange} placeholder="example@gmail.com"/>
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Mật khẩu <span className="text-red-500">*</span></Label>
              <Input id="password" type="password" required value={formData.password} onChange={handleChange} placeholder="••••••"/>
            </div>

            <div className="space-y-2">
              <Label htmlFor="role">Bạn là?</Label>
              <select id="role" className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm" value={formData.role} onChange={handleChange}>
                <option value="TENANT">Người thuê phòng (Tenant)</option>
                <option value="LANDLORD">Chủ nhà trọ (Landlord)</option>
              </select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="walletAddress">Địa chỉ ví (Tùy chọn)</Label>
              <Input id="walletAddress" placeholder="0x..." value={formData.walletAddress} onChange={handleChange} />
            </div>

            <Button className="w-full mt-4" type="submit" isLoading={isLoading}>
              Tiếp tục
            </Button>
          </form>
        ) : (
          /* --- FORM NHẬP OTP --- */
          <form onSubmit={handleVerifyOtp} className="space-y-6">
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

            <div className="flex flex-col gap-3">
                <Button className="w-full" type="submit" isLoading={isLoading}>
                    Xác nhận kích hoạt
                </Button>
                
                <div className="flex justify-between items-center text-sm">
                    <button 
                        type="button" 
                        onClick={() => setIsVerifying(false)}
                        className="text-muted-foreground hover:text-foreground underline"
                    >
                        Quay lại sửa thông tin
                    </button>
                    
                    <button 
                        type="button"
                        onClick={handleResendOtp}
                        disabled={isResending}
                        className="text-primary hover:underline font-medium disabled:opacity-50"
                    >
                        {isResending ? "Đang gửi..." : "Gửi lại mã"}
                    </button>
                </div>
            </div>
          </form>
        )}
        
        <div className="text-center text-sm pt-2">
           Đã có tài khoản? <Link to="/login" className="text-primary hover:underline font-medium">Đăng nhập ngay</Link>
        </div>
      </div>
    </div>
  );
}
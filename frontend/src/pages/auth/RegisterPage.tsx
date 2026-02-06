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

  // 🔥 HÀM VALIDATE DỮ LIỆU
  const validateForm = () => {
    // 1. Kiểm tra Username (Không chứa ký tự đặc biệt, viết liền)
    const usernameRegex = /^[a-zA-Z0-9_]+$/;
    if (!usernameRegex.test(formData.username)) {
        toast.error("Tên đăng nhập không được chứa khoảng trắng hoặc ký tự đặc biệt.");
        return false;
    }

    // 2. Kiểm tra Mật khẩu
    if ((formData.password || "").length < 6) {
        toast.error("Mật khẩu phải có ít nhất 6 ký tự.");
        return false;
    }

    // 3. Kiểm tra Ví (Nếu có nhập thì phải đúng format)
    if (formData.walletAddress && formData.walletAddress.trim() !== "") {
        // Regex ví Ethereum: Bắt đầu bằng 0x, theo sau là 40 ký tự hexa
        const walletRegex = /^0x[a-fA-F0-9]{40}$/;
        if (!walletRegex.test(formData.walletAddress)) {
            toast.error("Địa chỉ ví không hợp lệ (Phải bắt đầu bằng 0x và đủ 42 ký tự).");
            return false;
        }
    }

    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Gọi validate trước khi gửi
    if (!validateForm()) return;

    setIsLoading(true);

    try {
      // Gửi dữ liệu đi (Trim khoảng trắng thừa)
      await authApi.register({
          ...formData,
          username: formData.username.trim(),
          email: formData.email.trim(),
          walletAddress: formData.walletAddress?.trim() || "" // Backend sẽ xử lý rỗng thành null
      });

      toast.success("Đăng ký thành công! Vui lòng đăng nhập.");
      navigate("/login");
    } catch (error: any) {
      // Xử lý hiển thị lỗi từ Backend (Ví dụ: "Username đã tồn tại")
      const msg = error.response?.data?.message || error.response?.data || "Đăng ký thất bại";
      toast.error(typeof msg === 'string' ? msg : "Lỗi hệ thống, vui lòng thử lại.");
    } finally {
      setIsLoading(false);
    }
  };
  
  return (
    <div className="flex min-h-screen items-center justify-center bg-muted/40 p-4">
      <div className="w-full max-w-md space-y-6 bg-card p-8 rounded-xl border shadow-sm">
        <div className="text-center">
          <h1 className="text-2xl font-bold">Tạo tài khoản mới</h1>
          <p className="text-sm text-muted-foreground mt-2">Nhập thông tin để tham gia hệ thống</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="username">Tên đăng nhập <span className="text-red-500">*</span></Label>
              <Input 
                id="username" 
                required 
                value={formData.username} 
                onChange={handleChange} 
                placeholder="user123"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="fullName">Họ và tên <span className="text-red-500">*</span></Label>
              <Input 
                id="fullName" 
                required 
                value={formData.fullName} 
                onChange={handleChange} 
                placeholder="Nguyễn Văn A"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="email">Email <span className="text-red-500">*</span></Label>
            <Input 
                id="email" 
                type="email" 
                required 
                value={formData.email} 
                onChange={handleChange} 
                placeholder="example@gmail.com"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="password">Mật khẩu <span className="text-red-500">*</span></Label>
            <Input 
                id="password" 
                type="password" 
                required 
                value={formData.password} 
                onChange={handleChange} 
                placeholder="••••••"
            />
          </div>

          {/* Chọn Role */}
          <div className="space-y-2">
            <Label htmlFor="role">Bạn là?</Label>
            <select
              id="role"
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              value={formData.role}
              onChange={handleChange}
            >
              <option value="TENANT">Người thuê phòng (Tenant)</option>
              <option value="LANDLORD">Chủ nhà trọ (Landlord)</option>
            </select>
          </div>

          {/* Ví Address (Optional) */}
          <div className="space-y-2">
            <Label htmlFor="walletAddress">Địa chỉ ví (Tùy chọn)</Label>
            <Input 
                id="walletAddress" 
                placeholder="0x..." 
                value={formData.walletAddress} 
                onChange={handleChange} 
            />
            <p className="text-[10px] text-muted-foreground">
                Để trống nếu bạn chưa có ví MetaMask.
            </p>
          </div>

          <Button className="w-full mt-4" type="submit" isLoading={isLoading}>
            Đăng ký tài khoản
          </Button>
        </form>
        
        <div className="text-center text-sm pt-2">
           Đã có tài khoản? <Link to="/login" className="text-primary hover:underline font-medium">Đăng nhập ngay</Link>
        </div>
      </div>
    </div>
  );
}
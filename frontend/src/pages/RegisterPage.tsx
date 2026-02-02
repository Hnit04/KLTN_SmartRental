import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { authApi } from "../api/api/authApi"; // <-- Sửa đường dẫn import
import type { RegisterRequest } from "../types/auth"; // <-- Sửa đường dẫn import
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      await authApi.register(formData); // Gọi hàm từ authApi
      toast.success("Đăng ký thành công! Vui lòng đăng nhập.");
      navigate("/login");
    } catch (error: any) {
      // Xử lý lỗi từ axios response
      const msg = error.response?.data || "Đăng ký thất bại";
      toast.error(typeof msg === 'string' ? msg : JSON.stringify(msg));
    } finally {
      setIsLoading(false);
    }
  };
  
  // ... (Phần return JSX giữ nguyên như cũ) ...
  return (
      // ... Copy lại phần JSX từ câu trả lời trước ...
      <div className="flex min-h-screen items-center justify-center bg-muted/40 p-4">
      <div className="w-full max-w-md space-y-6 bg-card p-8 rounded-xl border shadow-sm">
        <div className="text-center">
          <h1 className="text-2xl font-bold">Tạo tài khoản mới</h1>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="username">Tên đăng nhập *</Label>
              <Input id="username" required value={formData.username} onChange={handleChange} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="fullName">Họ và tên</Label>
              <Input id="fullName" value={formData.fullName} onChange={handleChange} />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="email">Email *</Label>
            <Input id="email" type="email" required value={formData.email} onChange={handleChange} />
          </div>

          <div className="space-y-2">
            <Label htmlFor="password">Mật khẩu * (Tối thiểu 6 ký tự)</Label>
            <Input id="password" type="password" required minLength={6} value={formData.password} onChange={handleChange} />
          </div>

          {/* Chọn Role */}
          <div className="space-y-2">
            <Label htmlFor="role">Bạn là?</Label>
            <select
              id="role"
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              value={formData.role}
              onChange={handleChange}
            >
              <option value="TENANT">Người thuê phòng (Tenant)</option>
              <option value="LANDLORD">Chủ nhà trọ (Landlord)</option>
            </select>
          </div>

          {/* Ví Address (Optional) */}
          <div className="space-y-2">
            <Label htmlFor="walletAddress">Địa chỉ ví (Nếu có)</Label>
            <Input id="walletAddress" placeholder="0x..." value={formData.walletAddress} onChange={handleChange} />
          </div>

          <Button className="w-full" type="submit" disabled={isLoading}>
            {isLoading ? "Đang xử lý..." : "Đăng ký"}
          </Button>
        </form>
        
        <div className="text-center text-sm">
           Đã có tài khoản? <Link to="/login" className="text-primary hover:underline">Đăng nhập</Link>
        </div>
      </div>
    </div>
  );
}
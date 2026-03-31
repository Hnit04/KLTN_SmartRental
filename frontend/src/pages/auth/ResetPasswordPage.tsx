import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
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

    setIsLoading(true);
    try {
      // Gọi hàm resetPassword từ authApi
      await authApi.resetPassword({
        email: formData.email,
        code: formData.code,
        newPassword: formData.newPassword,
      });

      toast.success("Thành công!", {
        description: "Mật khẩu đã được đổi. Vui lòng đăng nhập lại.",
      });

      setTimeout(() => navigate("/login"), 2000);
    } catch (error: any) {
      toast.error(error?.response?.data || "Mã xác thực không đúng hoặc đã hết hạn.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-muted/40 p-4">
      <div className="w-full max-w-md space-y-6 bg-card p-8 rounded-xl border shadow-sm">
        <h1 className="text-2xl font-bold text-center">Đặt lại mật khẩu</h1>

        <form className="space-y-4" onSubmit={handleSubmit}>
          <div className="space-y-2">
            <Label>Email</Label>
            <Input 
              value={formData.email} 
              disabled // Không cho sửa email để tránh lỗi logic
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="code">Mã xác thực (OTP)</Label>
            <Input
              id="code"
              placeholder="Nhập mã 6 số"
              required
              value={formData.code}
              onChange={(e) => setFormData({...formData, code: e.target.value})}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="newPassword">Mật khẩu mới</Label>
            <Input
              id="newPassword"
              type="password"
              required
              value={formData.newPassword}
              onChange={(e) => setFormData({...formData, newPassword: e.target.value})}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="confirmPassword">Nhập lại mật khẩu mới</Label>
            <Input
              id="confirmPassword"
              type="password"
              required
              value={formData.confirmPassword}
              onChange={(e) => setFormData({...formData, confirmPassword: e.target.value})}
            />
          </div>

          <Button className="w-full" type="submit" disabled={isLoading}>
            {isLoading ? "Đang xử lý..." : "Cập nhật mật khẩu"}
          </Button>
        </form>
      </div>
    </div>
  );
}
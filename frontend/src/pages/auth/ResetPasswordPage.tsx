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

  // 1. Kiểm tra mật khẩu khớp nhau
  if (formData.newPassword !== formData.confirmPassword) {
    return toast.error("Mật khẩu nhập lại không khớp!");
  }

  setIsLoading(true);
  try {
    const payload = {
      email: formData.email,
      code: formData.code, 
      newPassword: formData.newPassword,
    };

    if (!formData.code || formData.code.trim() === "") {
      console.log("Sử dụng resetPasswordNoOtp");
      await authApi.resetPasswordNoOtp(payload);
    } else {
      console.log("Sử dụng resetPassword có OTP");
      await authApi.resetPassword(payload);
    }

    toast.success("Thành công!", {
      description: "Mật khẩu đã được đổi",
    });

    setTimeout(() => navigate("/login"), 2000);
  } catch (error: any) {
    console.error("Lỗi đổi mật khẩu:", error);
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
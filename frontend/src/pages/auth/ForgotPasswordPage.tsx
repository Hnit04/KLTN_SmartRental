import { useState } from "react";
import { Link } from "react-router-dom";
import { authApi } from "@/api/authApi"; // Đường dẫn tới file api của bạn
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
      // Gọi hàm forgotPassword từ authApi
      await authApi.forgotPassword(email);
      
      toast.success("Thành công!", {
        description: "Vui lòng kiểm tra email để lấy mã xác thực.",
      });
      // Bạn có thể chuyển hướng hoặc để user tự nhấn link trong mail
    } catch (error: any) {
      toast.error(error?.response?.data || "Email không tồn tại trong hệ thống.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-muted/40 p-4">
      <div className="w-full max-w-md space-y-6 bg-card p-8 rounded-xl border shadow-sm">
        <div className="text-center">
          <h1 className="text-2xl font-bold">Quên mật khẩu?</h1>
          <p className="text-sm text-muted-foreground mt-2">
            Nhập email của bạn để nhận mã khôi phục mật khẩu.
          </p>
        </div>

        <form className="space-y-4" onSubmit={handleSubmit}>
          <div className="space-y-2">
            <Label htmlFor="email">Email tài khoản</Label>
            <Input
              id="email"
              type="email"
              placeholder="name@example.com"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>
          <Button className="w-full" type="submit" disabled={isLoading}>
            {isLoading ? "Đang gửi..." : "Gửi mã xác thực"}
          </Button>
        </form>

        <div className="text-center text-sm">
          <Link to="/login" className="font-medium text-primary hover:underline">
            Quay lại đăng nhập
          </Link>
        </div>
      </div>
    </div>
  );
}
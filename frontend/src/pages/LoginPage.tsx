import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Label } from "@/components/ui/Label";
import { toast } from "sonner";

export default function LoginPage() {
  const navigate = useNavigate();
  const { login } = useAuth();

  const [formData, setFormData] = useState({
    username: "",
    password: "",
  });

  const [isLoading, setIsLoading] = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({
      ...formData,
      [e.target.id]: e.target.value,
    });
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    if (isLoading) return;
    setIsLoading(true);

    try {
      await login(formData.username, formData.password);

      // ✅ Đăng nhập thành công
      toast.success("Đăng nhập thành công!", {
        description: "Đang chuyển hướng đến Dashboard...",
        duration: 3000,
      });

      // Chờ 1.5s rồi chuyển trang
      setTimeout(() => {
        navigate("/dashboard");
      }, 1500);

    } catch (error: any) {
      console.error("Lỗi raw từ backend:", error?.response?.data);

      let message = "Đăng nhập thất bại.";

      if (error?.response?.data) {
        const data = error.response.data;

        if (typeof data === "string") {
          message = data.includes("Bad credentials")
            ? "Sai tên đăng nhập hoặc mật khẩu!"
            : data;
        } else if (typeof data === "object") {
          message = data.message || data.error || "Lỗi xác thực!";
        }
      } else if (error?.message) {
        message = error.message;
      }

      toast.error(message, {
        duration: 5000,
      });

      setIsLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-muted/40 p-4">
      <div className="w-full max-w-md space-y-8 bg-card p-8 rounded-xl border shadow-sm">
        <div className="text-center">
          <h1 className="text-2xl font-bold tracking-tight">Đăng nhập</h1>
          <p className="text-sm text-muted-foreground mt-2">
            Chào mừng quay trở lại SmartRental
          </p>
        </div>

        {/* ✅ FORM CHUẨN */}
        <form className="space-y-6" onSubmit={handleSubmit}>
          <div className="space-y-2">
            <Label htmlFor="username">Tên đăng nhập</Label>
            <Input
              id="username"
              type="text"
              placeholder="Nhập tên đăng nhập"
              required
              value={formData.username}
              onChange={handleChange}
              autoFocus
            />
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="password">Mật khẩu</Label>
              <Link
                to="/forgot-password"
                className="text-sm font-medium text-primary hover:underline"
              >
                Quên mật khẩu?
              </Link>
            </div>
            <Input
              id="password"
              type="password"
              placeholder="••••••••"
              required
              value={formData.password}
              onChange={handleChange}
            />
          </div>

          <Button
            className="w-full"
            type="submit"
            disabled={isLoading}
          >
            {isLoading ? "Đang xử lý..." : "Đăng nhập"}
          </Button>
        </form>

        <div className="text-center text-sm">
          Chưa có tài khoản?{" "}
          <Link to="/register" className="font-medium text-primary hover:underline">
            Đăng ký ngay
          </Link>
        </div>
      </div>
    </div>
  );
}

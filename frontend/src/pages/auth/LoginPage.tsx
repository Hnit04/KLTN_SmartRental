import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Label } from "@/components/ui/Label";
import { toast } from "sonner";
import { userApi } from "@/api/userApi"; // Đường dẫn có thể cần điều chỉnh

export default function LoginPage() {
  const navigate = useNavigate();
  const { login, logout } = useAuth(); // ← giả sử context có logout()

  const [formData, setFormData] = useState({
    username: "",
    password: "",
  });

  const [isLoading, setIsLoading] = useState(false);

  // Trạng thái modal thông báo khóa tài khoản
  const [showLockedModal, setShowLockedModal] = useState(false);
  const [lockMessage, setLockMessage] = useState("");

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({
      ...formData,
      [e.target.id]: e.target.value,
    });
  };

  const calculateTimeRemaining = (lockUntil?: string | null) => {
    if (!lockUntil) return "vô thời hạn";

    const lockDate = new Date(lockUntil);
    const now = new Date();
    const diffMs = lockDate.getTime() - now.getTime();

    if (diffMs <= 0) return "đã hết thời gian khóa";

    const diffMinutes = Math.floor(diffMs / 60000);
    if (diffMinutes < 60) {
      return `${diffMinutes} phút nữa`;
    }

    const diffHours = Math.floor(diffMinutes / 60);
    const remainingMinutes = diffMinutes % 60;
    if (diffHours < 24) {
      return `${diffHours} giờ ${remainingMinutes > 0 ? `${remainingMinutes} phút ` : ""}nữa`;
    }

    const diffDays = Math.floor(diffHours / 24);
    return `${diffDays} ngày nữa`;
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
  e.preventDefault();

  if (isLoading) return;
  setIsLoading(true);

  try {
    const user = await userApi.findByUsername(formData.username);
    console.log("Thông tin user sau khi tìm kiếm:", user);

    if (user.locked === true || user.lockUntil!== null) {
      const timeLeft = calculateTimeRemaining(user.lockUntil);

      const reasons =
        user.lockReason && user.lockReason.length > 0
          ? user.lockReason.join(", ")
          : "không có lý do cụ thể";

      setLockMessage(
        `Tài khoản của bạn đang bị khóa.\n\n` +
        `Lý do: ${reasons}\n` +
        `Thời gian còn lại: ${timeLeft}\n\n` +
        `Vui lòng liên hệ quản trị viên để được hỗ trợ thêm.`
      );

      setShowLockedModal(true);
      setIsLoading(false);
      return; 
    }

    await login(formData);

    toast.success("Đăng nhập thành công!", {
      description: "Đang chuyển hướng đến Trang chủ...",
      duration: 3000,
    });

    setTimeout(() => {
      navigate("/dashboard");
    }, 1500);

  } catch (error: any) {
    console.error("Lỗi đăng nhập:", error?.response?.data);

    let message = "Đăng nhập thất bại.";

    if (error?.response?.data) {
      const data = error.response.data;
      if (typeof data === "string") {
        message = data.includes("Bad credentials")
          ? "Sai tên đăng nhập hoặc mật khẩu!"
          : data;
      } else if (data?.message) {
        message = data.message;
      }
    } else if (error?.message) {
      message = error.message;
    }

    toast.error(message, { duration: 5000 });
  } finally {
    setIsLoading(false);
  }
};

  return (
    <>
      <div className="flex min-h-screen items-center justify-center bg-gray-50 p-4">
        <div className="w-full max-w-md space-y-8 bg-white p-8 rounded-xl border shadow-lg">
          <div className="text-center">
            <h1 className="text-2xl font-bold tracking-tight">Đăng nhập</h1>
            <p className="text-sm text-gray-500 mt-2">
              Chào mừng quay trở lại SmartRental
            </p>
          </div>

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
                  className="text-sm font-medium text-blue-600 hover:underline"
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

            <Button className="w-full" type="submit" disabled={isLoading}>
              {isLoading ? "Đang xử lý..." : "Đăng nhập"}
            </Button>
          </form>

          <div className="text-center text-sm text-gray-600">
            Chưa có tài khoản?{" "}
            <Link to="/register" className="font-medium text-blue-600 hover:underline">
              Đăng ký ngay
            </Link>
          </div>
        </div>
      </div>

      {/* Modal thông báo khóa tài khoản - dùng HTML + Tailwind */}
      {showLockedModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="w-full max-w-md mx-4 bg-white rounded-2xl shadow-2xl overflow-hidden">
            <div className="p-6 border-b bg-red-50">
              <h3 className="text-xl font-bold text-red-700">Tài khoản bị khóa</h3>
            </div>

            <div className="p-6 whitespace-pre-line text-gray-800">
              {lockMessage}
            </div>

            <div className="p-6 border-t bg-gray-50 flex justify-end">
              <button
                onClick={() => setShowLockedModal(false)}
                className="px-5 py-2.5 bg-gray-700 text-white rounded-lg hover:bg-gray-800 transition"
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
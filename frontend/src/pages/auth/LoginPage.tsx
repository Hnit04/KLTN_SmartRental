import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Label } from "@/components/ui/Label";
import { toast } from "sonner";
import { userApi } from "@/api/userApi"; 
import { authApi} from "@/api/authApi";
import { GoogleLogin } from "@react-oauth/google";
import { jwtDecode } from "jwt-decode"; 

export default function LoginPage() {
  const navigate = useNavigate();
  const { login } = useAuth();

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

      if (user.locked === true || user.lockUntil !== null) {
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

  // Xử lý đăng nhập Google thành công
  const handleGoogleSuccess = async (credentialResponse: any) => {
  try {
    const idToken = credentialResponse.credential;
    if (!idToken) throw new Error("Không nhận được ID Token từ Google");

    console.log("Google ID Token (first 50 chars):", idToken.substring(0, 50) + "...");

    setIsLoading(true);

    const response = await authApi.googleLogin({ idToken });

    console.log("Backend trả về:", {
      accessToken: response.accessToken?.substring(0, 20) + "...",
      refreshToken: response.refreshToken?.substring(0, 20) + "...",
      user: response.user?.email
    });

    await login(response);

    toast.success("Đăng nhập Google thành công!", {
      description: "Đang chuyển hướng..."
    });

    setTimeout(() => {
      navigate("/dashboard");
    }, 800);

  } catch (error: any) {
    console.error("Lỗi toàn bộ quá trình Google Login:", error);

    const errMsg = error.response?.data?.error 
      || error.message 
      || "Xác thực Google thất bại";

    toast.error(errMsg, { duration: 6000 });
  } finally {
    setIsLoading(false);
  }
};

  const handleGoogleError = () => {
    toast.error("Đăng nhập Google bị hủy hoặc gặp lỗi.", { duration: 4000 });
  };

  return (
    <>
      <div
        className="relative min-h-screen flex items-center justify-center p-4 bg-cover bg-center bg-no-repeat"
        style={{
          backgroundImage:
            "url('https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?q=80&w=2070&auto=format&fit=crop')",
        }}
      >
        {/* Lớp Overlay làm mờ (Blur) và tối màu */}
        <div className="absolute inset-0 bg-slate-900/50 backdrop-blur-[6px]"></div>

        {/* Card Đăng nhập */}
        <div className="relative w-full max-w-md space-y-8 bg-white/95 backdrop-blur-xl p-10 rounded-3xl shadow-[0_8px_30px_rgb(0,0,0,0.12)] border border-white/40">
          <div className="text-center space-y-2">
            {/* Logo/Icon Thuê nhà */}
            <div className="mx-auto bg-blue-50 text-primary w-16 h-16 rounded-full flex items-center justify-center mb-4 shadow-sm border border-blue-100">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-8 w-8"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"
                />
              </svg>
            </div>
            <h1 className="text-3xl font-extrabold tracking-tight text-gray-900">
              SmartRental
            </h1>
            <p className="text-sm text-gray-500 font-medium">
              Tìm kiếm tổ ấm hoàn hảo của bạn
            </p>
          </div>

          <form className="space-y-6 mt-8" onSubmit={handleSubmit}>
            <div className="space-y-2">
              <Label
                htmlFor="username"
                className="text-gray-700 font-semibold"
              >
                Tên đăng nhập
              </Label>
              <Input
                id="username"
                type="text"
                placeholder="Nhập tên đăng nhập"
                required
                value={formData.username}
                onChange={handleChange}
                autoFocus
                className="bg-white/50 focus:bg-white transition-colors"
              />
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label
                  htmlFor="password"
                  className="text-gray-700 font-semibold"
                >
                  Mật khẩu
                </Label>
                <Link
                  to="/forgot-password"
                  className="text-sm font-semibold text-primary hover:text-primary-700 hover:underline transition-colors"
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
                className="bg-white/50 focus:bg-white transition-colors"
              />
            </div>

            <Button
              className="w-full bg-primary hover:bg-primary-700 text-white font-semibold py-2.5 rounded-xl shadow-md transition-all active:scale-[0.98]"
              type="submit"
              disabled={isLoading}
            >
              {isLoading ? "Đang xử lý..." : "Đăng nhập vào hệ thống"}
            </Button>
          </form>

          {/* Phần phân cách và nút Google */}
          <div className="mt-6">
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-gray-300" />
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="bg-white/95 px-4 text-gray-500">hoặc</span>
              </div>
            </div>

            <div className="mt-6">
              <GoogleLogin
                onSuccess={handleGoogleSuccess}
                onError={handleGoogleError}
                theme="outline"
                text="signin_with"
                shape="rectangular"
                logo_alignment="left"
                width="100%"
                disabled={isLoading}
              />
            </div>
          </div>

          <div className="text-center text-sm text-gray-600 pt-4 border-t border-gray-200/60 mt-6">
            Chưa có tài khoản?{" "}
            <Link
              to="/register"
              className="font-bold text-primary hover:text-primary-700 hover:underline transition-colors"
            >
              Đăng ký ngay
            </Link>
          </div>
        </div>
      </div>

      {/* Modal thông báo khóa tài khoản */}
      {showLockedModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-md p-4 animate-in fade-in duration-200">
          <div className="w-full max-w-md bg-white rounded-2xl shadow-2xl overflow-hidden transform transition-all">
            <div className="p-6 flex items-center gap-3 border-b bg-red-50/50">
              <div className="bg-red-100 text-red-600 p-2 rounded-full">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-6 w-6"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                  />
                </svg>
              </div>
              <h3 className="text-xl font-bold text-red-700">
                Tài khoản bị khóa
              </h3>
            </div>

            <div className="p-6 whitespace-pre-line text-gray-700 font-medium leading-relaxed">
              {lockMessage}
            </div>

            <div className="p-5 border-t bg-gray-50 flex justify-end">
              <button
                onClick={() => setShowLockedModal(false)}
                className="px-6 py-2.5 bg-gray-800 text-white font-semibold rounded-xl hover:bg-gray-900 active:scale-95 transition-all shadow-sm"
              >
                Đã hiểu
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
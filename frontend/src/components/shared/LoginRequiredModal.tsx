import React from "react";
import { X, LogIn, UserPlus, Info } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { useNavigate } from "react-router-dom";

interface LoginRequiredModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  message?: string;
  actionName?: string;
}

export default function LoginRequiredModal({
  isOpen,
  onClose,
  title = "Yêu cầu đăng nhập",
  message = "Vui lòng đăng nhập để thực hiện chức năng này và quản lý thông tin tốt hơn.",
  actionName = "Thực hiện"
}: LoginRequiredModalProps) {
  const navigate = useNavigate();

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[150] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div 
        className="bg-white rounded-2xl w-full max-w-sm overflow-hidden shadow-2xl animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header with Icon */}
        <div className="relative h-24 bg-gradient-to-br from-primary/10 to-primary/5 flex items-center justify-center">
          <div className="bg-white p-3 rounded-full shadow-sm">
            <LogIn className="h-8 w-8 text-primary" />
          </div>
          <button 
            onClick={onClose}
            className="absolute top-3 right-3 p-1.5 rounded-full hover:bg-black/5 text-gray-400 transition"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 text-center space-y-4">
          <div className="space-y-1">
            <h3 className="text-xl font-bold text-gray-900">{title}</h3>
            <p className="text-sm text-gray-500 leading-relaxed">
              {message}
            </p>
          </div>

          <div className="bg-blue-50 p-3 rounded-xl flex items-start gap-2 text-left">
            <Info className="h-4 w-4 text-blue-600 mt-0.5 shrink-0" />
            <p className="text-[11px] text-blue-700 font-medium">
              Bạn sẽ có quyền truy cập vào các tính năng như Đặt lịch, Thuê phòng trực tuyến, và nhắn tin trực tiếp với chủ nhà.
            </p>
          </div>

          <div className="pt-2 flex flex-col gap-2">
            <Button 
              className="w-full h-11 text-sm font-bold shadow-lg shadow-primary/20"
              onClick={() => {
                const currentPath = window.location.pathname + window.location.search;
                navigate(`/login?redirect=${encodeURIComponent(currentPath)}`);
              }}
            >
              Đăng nhập ngay
            </Button>
            <Button 
              variant="outline" 
              className="w-full h-11 text-sm font-bold border-gray-200"
              onClick={() => {
                const currentPath = window.location.pathname + window.location.search;
                navigate(`/register?redirect=${encodeURIComponent(currentPath)}`);
              }}
            >
              Tạo tài khoản mới
            </Button>
          </div>

          <button 
            onClick={onClose}
            className="text-xs text-gray-400 hover:text-gray-600 transition underline"
          >
            Để sau, mình xem thêm đã
          </button>
        </div>
      </div>
    </div>
  );
}

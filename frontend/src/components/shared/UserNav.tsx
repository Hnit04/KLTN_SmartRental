import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { LogOut, User, LayoutDashboard, ChevronDown, Bell } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { Dropdown, DropdownItem, DropdownSeparator } from "../ui/DropdownMenu";
import { appointmentApi } from "@/api/api/appointmentApi"; // Đảm bảo import đúng

export function UserNav() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [pendingCount, setPendingCount] = useState(0);

  // 1. Lấy dữ liệu lịch hẹn khi component mount
  useEffect(() => {
    const fetchNotification = async () => {
      // Chỉ lấy thông báo nếu là chủ nhà và có ID
      if (user?.role === "LANDLORD" && user.id) {
        try {
          const res = await appointmentApi.getMyPendingAppointments(user.id);
          // Kiểm tra xem res.data là mảng thì lấy length
          const count = Array.isArray(res.data) ? res.data.length : 0;
          setPendingCount(count);
        } catch (error) {
          console.error("Lỗi lấy thông báo lịch hẹn:", error);
        }
      }
    };

    fetchNotification();
  }, [user]);

  if (!user) return null;

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  const Trigger = (
    <button className="flex items-center gap-2 rounded-full p-1 pr-3 transition-colors hover:bg-gray-100 focus:outline-none border border-transparent hover:border-gray-200 relative">
      <div className="relative">
        <div className="h-8 w-8 rounded-full bg-primary/10 border flex items-center justify-center overflow-hidden">
          {user.avatarUrl ? (
            <img src={user.avatarUrl} alt="Avatar" className="h-full w-full object-cover" />
          ) : (
            <span className="text-sm font-bold text-primary">
              {user.fullName?.charAt(0).toUpperCase() || user.username.charAt(0).toUpperCase()}
            </span>
          )}
        </div>
        
        {/* 2. Dấu chấm đỏ thông báo trên Avatar */}
        {pendingCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 h-3 w-3 rounded-full bg-red-500 border-2 border-white animate-pulse" />
        )}
      </div>

      <div className="hidden md:block text-left">
        <p className="text-sm font-semibold text-gray-700 leading-none">{user.fullName || user.username}</p>
      </div>
      <ChevronDown className="h-4 w-4 text-gray-400" />
    </button>
  );

  return (
    <Dropdown trigger={Trigger}>
      {/* Thông tin User */}
      <div className="px-4 py-3">
        <p className="text-sm font-medium text-gray-900">{user.fullName}</p>
        <p className="text-xs text-gray-500 truncate">{user.email}</p>
      </div>
      
      <DropdownSeparator />
      
      {/* Menu điều hướng */}
      <Link to="/dashboard/rooms">
        <DropdownItem className="flex justify-between items-center">
          <div className="flex items-center">
            <LayoutDashboard className="mr-3 h-4 w-4 text-gray-500" />
            Quản lý nhà trọ
          </div>
          
          {/* 3. Badge số lượng bên trong Menu */}
          {pendingCount > 0 && (
            <span className="ml-auto bg-red-100 text-red-600 text-[10px] font-bold px-1.5 py-0.5 rounded-full">
              {pendingCount > 9 ? "9+" : pendingCount}
            </span>
          )}
        </DropdownItem>
      </Link>

      <Link to="/profile">
        <DropdownItem>
          <User className="mr-3 h-4 w-4 text-gray-500" />
          Hồ sơ cá nhân
        </DropdownItem>
      </Link>

      <DropdownSeparator />

      {/* Đăng xuất */}
      <DropdownItem onClick={handleLogout} danger>
        <LogOut className="mr-3 h-4 w-4" />
        Đăng xuất
      </DropdownItem>
    </Dropdown>
  );
}
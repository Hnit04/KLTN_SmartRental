import { Link, useNavigate } from "react-router-dom";
import { LogOut, User, LayoutDashboard, ChevronDown, FileText, Home } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { Dropdown, DropdownItem, DropdownSeparator } from "../ui/DropdownMenu";

export function UserNav() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  if (!user) return null;

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  // Nút bấm để mở Menu (Giữ nguyên giao diện cũ)
  const Trigger = (
    <button className="flex items-center gap-2 rounded-full p-1 pr-3 transition-colors hover:bg-gray-100 focus:outline-none border border-transparent hover:border-gray-200">
      <div className="h-8 w-8 rounded-full bg-primary/10 border flex items-center justify-center overflow-hidden">
        {user.avatarUrl ? (
          <img src={user.avatarUrl} alt="Avatar" className="h-full w-full object-cover" />
        ) : (
          <span className="text-sm font-bold text-primary">
            {user.fullName?.charAt(0).toUpperCase() || user.username?.charAt(0).toUpperCase() || 'U'}
          </span>
        )}
      </div>
      <div className="hidden md:block text-left">
        <p className="text-sm font-semibold text-gray-700 leading-none">{user.fullName || user.username} {user.role && `${user.role}`}</p>
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
      
      {/* ✅ MENU ĐỘNG DỰA TRÊN ROLE */}
      {user.role === 'LANDLORD' ? (
        <>
          <Link to="/dashboard">
            <DropdownItem>
              <LayoutDashboard className="mr-3 h-4 w-4 text-gray-500" />
              Tổng quan
            </DropdownItem>
          </Link>
          <Link to="/properties/manage">
            <DropdownItem>
              <Home className="mr-3 h-4 w-4 text-gray-500" />
              Quản lý nhà trọ
            </DropdownItem>
          </Link>
        </>
      ) : (
        <>
          <Link to="/contracts">
            <DropdownItem>
              <FileText className="mr-3 h-4 w-4 text-gray-500" />
              Hợp đồng của tôi
            </DropdownItem>
          </Link>
        </>
      )}

      <DropdownSeparator />

      {/* Dành cho mọi Role */}
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
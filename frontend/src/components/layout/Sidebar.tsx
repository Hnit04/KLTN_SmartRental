import { Link, useLocation } from 'react-router-dom';
import { 
  LayoutDashboard, 
  FileText, 
  Home, 
  Calendar, 
  Settings, 
  LogOut,
  UserCircle 
} from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { cn } from '@/utils/cn';

const Sidebar = () => {
  const location = useLocation();
  const { logout, user } = useAuth();

  // 1. Menu dùng chung
  const commonItems = [
    {
      title: 'Tổng quan',
      path: '/dashboard',
      icon: LayoutDashboard,
    },
  ];

  // 2. Menu dành cho CHỦ TRỌ (Cần nhiều chức năng quản lý)
  const landlordItems = [
    {
      title: 'Quản lý phòng',
      path: '/properties/manage', // Trang dành riêng cho chủ trọ (thêm/sửa/xóa)
      icon: Home,
    },
    {
      title: 'Quản lý hợp đồng',
      path: '/contracts',
      icon: FileText,
    },
    {
      title: 'Lịch hẹn khách xem',
      path: '/appointments',
      icon: Calendar,
    },
  ];

  // 3. Menu dành cho NGƯỜI THUÊ (Chỉ giữ lại những gì cần quản lý)
  const tenantItems = [
    // ❌ Đã bỏ mục "Tìm phòng" để tránh trùng với menu ngang
    {
      title: 'Hợp đồng của tôi',
      path: '/contracts',
      icon: FileText,
    },
    {
      title: 'Lịch sử xem phòng',
      path: '/appointments', 
      icon: Calendar,
    },
  ];

  // 4. Menu Cài đặt & Profile (Luôn hiển thị ở dưới)
  const bottomItems = [
    {
      title: 'Hồ sơ cá nhân',
      path: '/profile',
      icon: UserCircle,
    },
    {
      title: 'Cài đặt tài khoản',
      path: '/settings',
      icon: Settings,
    },
  ];

  // Logic chọn menu
  let menuItems = commonItems;
  if (user?.role === 'LANDLORD') {
    menuItems = [...commonItems, ...landlordItems, ...bottomItems];
  } else {
    // Với Tenant, bỏ mục "Tổng quan" nếu dashboard không có biểu đồ gì đặc biệt
    // Chỉ tập trung vào Hợp đồng và Hồ sơ
    menuItems = [...tenantItems, ...bottomItems];
  }

  return (
    <aside className="fixed left-0 top-0 z-40 h-screen w-64 border-r bg-white text-gray-900 transition-transform hidden md:flex flex-col">
      {/* Logo Area - Bấm vào đây để quay về trang chủ (Menu ngang) */}
      <div className="flex h-16 items-center border-b px-6">
        <Link to="/" className="flex items-center gap-2 font-bold text-xl text-primary hover:opacity-80 transition-opacity" title="Về trang chủ">
          <Home className="h-6 w-6" />
          <span>SmartRental</span>
        </Link>
      </div>

      {/* Navigation Links */}
      <div className="flex-1 overflow-y-auto py-6 px-3 space-y-1">
        {menuItems.map((item) => {
          const isActive = location.pathname === item.path;
          return (
            <Link
              key={item.path}
              to={item.path}
              className={cn(
                "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
                isActive
                  ? "bg-primary/10 text-primary"
                  : "text-gray-600 hover:bg-gray-100 hover:text-gray-900"
              )}
            >
              <item.icon className={cn("h-5 w-5", isActive ? "text-primary" : "text-gray-500")} />
              {item.title}
            </Link>
          );
        })}
      </div>

      {/* Bottom Area (Logout) */}
      <div className="border-t p-4 bg-gray-50/50">
        <button
          onClick={logout}
          className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-red-600 hover:bg-red-50 transition-colors"
        >
          <LogOut className="h-5 w-5" />
          Đăng xuất
        </button>
      </div>
    </aside>
  );
};

export default Sidebar;
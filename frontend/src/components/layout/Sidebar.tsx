import { Link, useLocation } from 'react-router-dom';
import { 
  LayoutDashboard, 
  FileText, 
  Home, 
  Calendar, 
  Settings, 
  LogOut 
} from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { cn } from '@/utils/cn'; // Hàm tiện ích class mà bạn đã có

const Sidebar = () => {
  const location = useLocation();
  const { logout } = useAuth();

  // Danh sách menu (có thể sửa lại tùy role Tenant/Landlord)
  const menuItems = [
    {
      title: 'Tổng quan',
      path: '/dashboard', // Hoặc /tenant/dashboard tùy route của bạn
      icon: LayoutDashboard,
    },
    {
      title: 'Quản lý phòng',
      path: '/dashboard/rooms',
      icon: Home,
    },
    {
      title: 'Hợp đồng',
      path: '/contracts',
      icon: FileText,
    },
    {
      title: 'Lịch hẹn',
      path: '/appointments',
      icon: Calendar,
    },
    {
      title: 'Cài đặt',
      path: '/settings',
      icon: Settings,
    },
  ];

  return (
    <aside className="fixed left-0 top-0 z-40 h-screen w-64 border-r bg-white text-gray-900 transition-transform">
      {/* Logo Area */}
      <div className="flex h-16 items-center border-b px-6">
        <Link to="/" className="flex items-center gap-2 font-bold text-xl text-primary">
          <Home className="h-6 w-6" />
          <span>SmartRental</span>
        </Link>
      </div>

      {/* Navigation Links */}
      <div className="flex h-[calc(100vh-4rem)] flex-col justify-between overflow-y-auto py-4">
        <nav className="space-y-1 px-3">
          {menuItems.map((item) => {
            const isActive = location.pathname.startsWith(item.path);
            return (
              <Link
                key={item.path}
                to={item.path}
                className={cn(
                  "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
                  isActive
                    ? "bg-primary/10 text-primary"
                    : "text-gray-700 hover:bg-gray-100 hover:text-gray-900"
                )}
              >
                <item.icon className={cn("h-5 w-5", isActive ? "text-primary" : "text-gray-500")} />
                {item.title}
              </Link>
            );
          })}
        </nav>

        {/* Bottom Area (Logout) */}
        <div className="border-t p-4">
          <button
            onClick={logout}
            className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-red-600 hover:bg-red-50 transition-colors"
          >
            <LogOut className="h-5 w-5" />
            Đăng xuất
          </button>
        </div>
      </div>
    </aside>
  );
};

export default Sidebar;
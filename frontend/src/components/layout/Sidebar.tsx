import { Link, useLocation } from 'react-router-dom';
import { 
  LayoutDashboard, 
  FileText, 
  Home, 
  Calendar, 
  LogOut,
  UserCircle,
  Building,
  PieChart,
  Wallet,
  Users,          // Thêm icon cho Quản lý người dùng
  Database,       // Thêm icon phù hợp cho Logs Blockchain
  CheckSquare,    // Thêm icon cho Duyệt tin
  BrainCircuit,   // Thêm icon cho AI Analytics
  DoorOpen,       // Thêm icon cho Phòng của tôi
  History,        // Thêm icon cho Lịch sử thuê phòng
} from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { cn } from '@/utils/cn';

const Sidebar = () => {
  const location = useLocation();
  const { logout, user } = useAuth();

  // 1. Menu dành cho CHỦ TRỌ (LANDLORD)
  const landlordItems = [
    {
      title: 'Tổng quan & Thống kê',
      path: '/dashboard',
      icon: LayoutDashboard,
    },
    {
      title: 'Khu trọ & Phòng trọ',
      path: '/properties/manage',
      icon: Building,
    },
    {
      title: 'Quản lý Hợp đồng',
      path: '/contracts',
      icon: FileText,
    },
    {
      title: 'Tài chính & Hóa đơn',
      path: '/finance',
      icon: Wallet,

    },
    {
      title: 'Quản lý Lịch hẹn',
      path: '/appointments',
      icon: Calendar,
    },
    {
      title: 'Báo cáo doanh thu',
      path: '/reports',
      icon: PieChart,
    },
  ];

  // 2. Menu dành cho NGƯỜI THUÊ (TENANT / USER mặc định)
  const tenantItems = [
    {
      title: 'Trang chủ',
      path: '/tenant-dashboard',
      icon: LayoutDashboard,
    },
    {
      title: 'Tìm phòng trọ',
      path: '/properties',
      icon: Home,
    },
    {
      title: 'Hợp đồng của tôi',
      path: '/contracts',
      icon: FileText,
    },
    {
      title: 'Phòng của tôi',
      path: '/my-room',
      icon: DoorOpen,
    },
    {
      title: 'Lịch sử thuê phòng',
      path: '/rental-history',
      icon: History,
    },
    {
      title: 'Lịch hẹn xem phòng',
      path: '/appointments', 
      icon: Calendar,
    },
  ];


  // 3. Menu dành cho ADMIN (mới thêm)
  const adminItems = [
    {
      title: 'Tổng quan & Thống kê',
      path: '/admin/dashboard',
      icon: LayoutDashboard,
    },
    {
      title: 'Quản lý người dùng',
      path: '/admin/users',
      icon: Users,
    },
    {
      title: 'Duyệt tin bài đăng',
      path: '/admin/approvals',
      icon: CheckSquare,
    },
    {
      title: 'Kiểm tra Logs Blockchain',
      path: '/admin/blockchain-logs',
      icon: Database,
    },
    {
      title: 'Thống kê AI & NLP',
      path: '/admin/ai-analytics',
      icon: BrainCircuit,
    },
  ];

  const bottomItems = [
    {
      title: 'Hồ sơ cá nhân',
      path: '/profile',
      icon: UserCircle,
    },
  ];

  // Logic chọn menu theo role
  let menuItems: typeof landlordItems = [...bottomItems];

  if (user?.role === 'ADMIN') {
    menuItems = [...adminItems, ...bottomItems];
  } else if (user?.role === 'LANDLORD') {
    menuItems = [...landlordItems, ...bottomItems];
  } else {
    // tenant / user mặc định hoặc role khác
    menuItems = [...tenantItems, ...bottomItems];
  }

  return (
    <aside className="fixed left-0 top-0 z-40 h-screen w-64 border-r bg-white text-gray-900 transition-transform hidden md:flex flex-col">
      {/* Logo Area */}
      <div className="flex h-16 items-center border-b px-6">
        <Link to="/" className="flex items-center gap-2 font-bold text-xl text-primary hover:opacity-80 transition-opacity" title="Về trang chủ">
          <Home className="h-6 w-6" />
          <span>SmartRental</span>
        </Link>
      </div>

      {/* Navigation Links */}
      <div className="flex-1 overflow-y-auto py-6 px-3 space-y-1">
        {menuItems.map((item) => {
          const isActive = location.pathname === item.path || location.pathname.startsWith(`${item.path}/`);
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
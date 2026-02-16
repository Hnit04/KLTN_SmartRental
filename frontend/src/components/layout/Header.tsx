import { Search } from 'lucide-react';
import { Input } from '@/components/ui/Input';

// Import component UserNav và NotificationBell để dùng chung
import { UserNav } from "../shared/UserNav"; 
import NotificationBell from "../shared/NotificationBell";

const Header = () => {
  return (
    <header className="sticky top-0 z-30 flex h-16 w-full items-center justify-between border-b bg-white/80 px-6 backdrop-blur-sm">
      {/* Bên Trái: Tiêu đề hoặc Tìm kiếm */}
      <div className="flex items-center gap-4">
        <h2 className="text-lg font-semibold text-gray-800">Dashboard</h2>
        
        {/* Thanh search nhanh */}
        <div className="hidden md:block relative">
          <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input 
            placeholder="Tìm kiếm..." 
            className="h-9 w-64 pl-9 bg-gray-50 border-none focus-visible:ring-1" 
          />
        </div>
      </div>

      {/* Bên Phải: Thông báo & User Profile */}
      <div className="flex items-center gap-4">
        
        {/* ✅ TÍCH HỢP COMPONENT CHUÔNG THÔNG BÁO VÀO ĐÂY */}
        <NotificationBell />

        {/* Đường kẻ dọc ngăn cách */}
        <div className="h-6 w-px bg-gray-200" />

        {/* ✅ USERNAV */}
        <UserNav />
      </div>
    </header>
  );
};

export default Header;
import { Bell, Search } from 'lucide-react';
import { Button } from '@/components/ui/Button'; 
import { Input } from '@/components/ui/Input';
// Import component UserNav để dùng chung
import { UserNav } from "../shared/UserNav"; 

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
        {/* Nút thông báo */}
        <Button variant="ghost" size="icon" className="relative text-gray-500 hover:text-gray-700">
          <Bell className="h-5 w-5" />
          <span className="absolute right-2 top-2 h-2 w-2 rounded-full bg-red-500 ring-2 ring-white" />
        </Button>

        {/* Đường kẻ dọc ngăn cách */}
        <div className="h-6 w-px bg-gray-200" />

        {/* ✅ THAY THẾ TOÀN BỘ CODE CŨ BẰNG USERNAV */}
        <UserNav />
      </div>
    </header>
  );
};

export default Header;
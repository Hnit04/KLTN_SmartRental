import { useAuth } from '@/context/AuthContext';
import { Bell, Search, User } from 'lucide-react';
import { Button } from '@/components/ui/Button'; // Import button có sẵn của bạn
import { Input } from '@/components/ui/Input';   // Import input có sẵn

const Header = () => {
  const { user } = useAuth();

  return (
    <header className="sticky top-0 z-30 flex h-16 w-full items-center justify-between border-b bg-white/80 px-6 backdrop-blur-sm">
      {/* Left: Page Title or Search */}
      <div className="flex items-center gap-4">
        <h2 className="text-lg font-semibold text-gray-800">Dashboard</h2>
        {/* Ví dụ thanh search nhỏ */}
        <div className="hidden md:block relative">
          <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input 
            placeholder="Tìm kiếm..." 
            className="h-9 w-64 pl-9 bg-gray-50 border-none focus-visible:ring-1" 
          />
        </div>
      </div>

      {/* Right: Actions & Profile */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" className="relative text-gray-500 hover:text-gray-700">
          <Bell className="h-5 w-5" />
          <span className="absolute right-2 top-2 h-2 w-2 rounded-full bg-red-500 ring-2 ring-white" />
        </Button>

        <div className="h-6 w-px bg-gray-200" />

        <div className="flex items-center gap-3">
          <div className="text-right hidden sm:block">
            <p className="text-sm font-medium leading-none text-gray-900">
              {user?.fullName || 'Người dùng'}
            </p>
            <p className="text-xs text-gray-500 mt-1">
              {user?.role || 'MEMBER'}
            </p>
          </div>
          <div className="h-9 w-9 rounded-full bg-primary/10 flex items-center justify-center text-primary overflow-hidden border">
             {user?.avatar ? (
                <img src={user.avatar} alt="Avatar" className="h-full w-full object-cover" />
             ) : (
                <User className="h-5 w-5" />
             )}
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;
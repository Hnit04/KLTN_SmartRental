import { Search } from 'lucide-react';
import { Input } from '@/components/ui/Input';
import { useLocation } from 'react-router-dom';
import { UserNav } from "../shared/UserNav"; 
import NotificationBell from "../shared/NotificationBell";
import { ROLE_NAV_ITEMS } from '@/config/navigation';

const NAV_TITLES = Object.values(ROLE_NAV_ITEMS).flat().reduce((acc, item) => {
  acc[item.path] = item.title;
  return acc;
}, {} as Record<string, string>);

// Map route → tên trang hiển thị trên Header
const PAGE_TITLES: Record<string, string> = {
  ...NAV_TITLES,
  '/properties': 'Tìm phòng trọ',
  '/properties/:id': 'Chi tiết khu trọ',
  '/rooms/:id': 'Chi tiết phòng',
  '/profile': 'Hồ sơ cá nhân',
  '/settings': 'Cài đặt tài khoản',
};

const Header = () => {
  const location = useLocation();

  // Tìm title phù hợp nhất theo pathname (startsWith để match cả sub-routes)
  const pageTitle = Object.entries(PAGE_TITLES).find(([path]) =>
    location.pathname === path || location.pathname.startsWith(path + '/')
  )?.[1] ?? 'SmartRental';

  return (
    <header className="sticky top-0 z-30 flex h-16 w-full items-center justify-between border-b bg-white/80 px-4 md:px-6 backdrop-blur-sm">
      {/* Bên Trái: Tên trang động */}
      <div className="flex items-center gap-4">
        <h2 className="text-base md:text-lg font-semibold text-gray-800 truncate max-w-[160px] md:max-w-none">
          {pageTitle}
        </h2>

      </div>

      {/* Bên Phải: Thông báo & User Profile */}
      <div className="flex items-center gap-3">
        <NotificationBell />
        <div className="h-6 w-px bg-gray-200 hidden sm:block" />
        <UserNav />
      </div>
    </header>
  );
};

export default Header;

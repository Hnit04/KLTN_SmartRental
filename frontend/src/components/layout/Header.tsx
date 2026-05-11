import { useLocation } from 'react-router-dom';
import { UserNav } from "../shared/UserNav"; 
import NotificationBell from "../shared/NotificationBell";
import { ThemeToggle } from "../shared/ThemeToggle";
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
    <header className="sticky top-0 z-30 flex h-14 w-full items-center justify-between border-b border-border/60 bg-background/80 px-4 shadow-[0_1px_3px_hsl(20_14%_15%/0.04)] backdrop-blur-lg supports-[backdrop-filter]:bg-background/65 md:h-16 md:px-6">
      {/* Bên Trái: Tên trang động */}
      <div className="flex min-w-0 items-center gap-4">
        <h2 className="truncate text-base font-semibold tracking-tight text-foreground md:text-lg md:max-w-none max-w-[min(200px,42vw)]">
          {pageTitle}
        </h2>

      </div>

      {/* Bên Phải: Thông báo & User Profile */}
      <div className="flex shrink-0 items-center gap-2 sm:gap-3">
        <NotificationBell />
        <ThemeToggle />
        <div className="hidden h-6 w-px bg-border sm:block" />
        <UserNav />
      </div>
    </header>
  );
};

export default Header;

import { Link, useLocation } from 'react-router-dom';
import { 
  LogOut,
  UserCircle,
} from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { cn } from '@/utils/cn';
import { ROLE_NAV_ITEMS, type AppRole } from '@/config/navigation';
import Logo from '@/components/shared/Logo';

const Sidebar = () => {
  const location = useLocation();
  const { logout, user } = useAuth();

  const bottomItems = [
    {
      title: 'Hồ sơ cá nhân',
      path: '/profile',
      icon: UserCircle,
    },
  ];

  const normalizedRole: AppRole = user?.role === 'ADMIN' ? 'ADMIN' : user?.role === 'LANDLORD' ? 'LANDLORD' : 'TENANT';
  const menuItems = [...ROLE_NAV_ITEMS[normalizedRole], ...bottomItems];

  return (
    <aside className="fixed left-0 top-0 z-40 hidden h-screen w-64 flex-col border-r border-sidebar-border bg-sidebar text-sidebar-foreground shadow-[1px_0_0_0_hsl(var(--sidebar-border)/0.5)] transition-transform md:flex">
      {/* Logo Area */}
      <div className="flex shrink-0 flex-col gap-2 border-b border-sidebar-border px-4 py-3">
        <Link to="/" className="flex items-center gap-2 text-lg font-semibold tracking-tight text-primary transition-opacity hover:opacity-85" title="Về trang chủ">
          <Logo size={34} variant="auto" showWordmark />
        </Link>
        <div className="flex items-center gap-2">
          <span
            className={`inline-flex max-w-full truncate rounded-full border px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide ${
              normalizedRole === 'ADMIN'
                ? 'border-violet-300/60 bg-violet-500/10 text-violet-900'
                : normalizedRole === 'LANDLORD'
                  ? 'border-primary/40 bg-primary/10 text-primary'
                  : 'border-sky-300/60 bg-sky-500/10 text-sky-900'
            }`}
          >
            {normalizedRole === 'ADMIN' ? 'Quản trị' : normalizedRole === 'LANDLORD' ? 'Chủ trọ' : 'Người thuê'}
          </span>
        </div>
      </div>

      {/* Navigation Links */}
      <div className="flex-1 space-y-0.5 overflow-y-auto px-2.5 py-4">
        {menuItems.map((item) => {
          const isActive = location.pathname === item.path || location.pathname.startsWith(`${item.path}/`);
          return (
            <Link
              key={item.path}
              to={item.path}
              className={cn(
                "flex items-center gap-3 rounded-xl px-3 py-2 text-sm font-medium transition-all duration-300",
                isActive
                  ? "bg-primary/10 text-primary font-bold shadow-sm"
                  : "text-sidebar-foreground/70 hover:bg-muted/50 hover:text-foreground hover:translate-x-1"
              )}
            >
              <item.icon className={cn("h-5 w-5 shrink-0 transition-colors duration-200 stroke-[1.5]", isActive ? "text-primary" : "text-sidebar-foreground/50")} />
              {item.title}
            </Link>
          );
        })}
      </div>

      {/* Bottom Area (Logout) */}
      <div className="shrink-0 border-t border-sidebar-border bg-muted/25 p-3">
        <button
          onClick={logout}
          className="flex w-full items-center gap-3 rounded-xl px-3 py-2 text-sm font-medium text-destructive transition-all duration-300 hover:bg-destructive/10 hover:translate-x-1 group"
        >
          <LogOut className="h-5 w-5 stroke-[1.5]" />
          Đăng xuất
        </button>
      </div>
    </aside>
  );
};

export default Sidebar;

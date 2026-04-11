import { Outlet, Link, NavLink } from "react-router-dom"; // Sử dụng NavLink
import { Button } from "../ui/Button";
import { Home, Star, LayoutDashboard } from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import { UserNav } from "../shared/UserNav"; 
import NotificationBell from "../shared/NotificationBell"; 

export default function PublicLayout() {
  const { isAuthenticated, user } = useAuth();

  // Hàm tạo class để xử lý focus khi link active
  const navLinkClass = ({ isActive }: { isActive: boolean }) => 
    `text-sm font-medium transition-colors hover:text-primary ${
      isActive ? "text-primary border-b-2 border-primary pb-1" : "text-muted-foreground"
    }`;

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* ─── HEADER ─── */}
      <header className="sticky top-0 z-50 border-b bg-card/80 backdrop-blur-sm">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary">
              <Home className="h-5 w-5 text-primary-foreground" />
            </div>
            <span className="text-xl font-bold text-foreground">SmartRental</span>
          </Link>

          {/* Menu Chính có Focus */}
          <nav className="hidden items-center gap-6 md:flex">
            <NavLink to="/" className={navLinkClass}>
              Trang chủ
            </NavLink>
            <NavLink to="/properties" className={navLinkClass}>
              Tìm phòng
            </NavLink>
            <NavLink to="/top-landlords" className={navLinkClass}>
              🔥 Bảng Xếp Hạng
            </NavLink>
            <NavLink to="/contact" className={navLinkClass}>
              Liên hệ
            </NavLink>
            <NavLink to="/help" className={navLinkClass}>
              Trợ giúp
            </NavLink>
            
            {isAuthenticated && (
              <NavLink
                to={user?.role === 'LANDLORD' ? '/landlord/dashboard' : '/tenant/dashboard'}
                className={({ isActive }) => 
                  `flex items-center gap-1.5 text-sm font-semibold px-3 py-1 rounded-full transition-colors ${
                    isActive 
                      ? "bg-primary text-primary-foreground" 
                      : "text-primary border border-primary/20 bg-primary/5 hover:bg-primary/10"
                  }`
                }
              >
                <LayoutDashboard className="h-3.5 w-3.5" />
                {user?.role === 'LANDLORD' ? 'Quản lý' : 'Của tôi'}
              </NavLink>
            )}
          </nav>

          <div className="flex items-center gap-3">
            {isAuthenticated ? (
              <>
                <NotificationBell />
                <div className="h-6 w-px bg-gray-200 hidden sm:block" />
                <UserNav />
              </>
            ) : (
              <>
                <Link to="/login">
                  <Button variant="ghost" size="sm">Đăng nhập</Button>
                </Link>
                <Link to="/register">
                  <Button size="sm">Đăng ký</Button>
                </Link>
              </>
            )}
          </div>
        </div>
      </header>

      {/* ─── MAIN CONTENT ─── */}
      <main className="flex-1">
        <Outlet />
      </main>

      {/* ─── FOOTER ─── */}
      <footer className="border-t bg-card py-12">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
            <div>
              <div className="flex items-center gap-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary">
                  <Home className="h-4 w-4 text-primary-foreground" />
                </div>
                <span className="text-lg font-bold">SmartRental</span>
              </div>
              <p className="mt-4 text-sm text-muted-foreground">
                Nền tảng thuê phòng thông minh, kết nối chủ trọ và người thuê.
              </p>
            </div>
            <div>
              <h4 className="font-semibold text-foreground">Sản phẩm</h4>
              <ul className="mt-4 space-y-2 text-sm text-muted-foreground">
                <li><Link to="/properties" className="hover:text-primary">Tìm phòng</Link></li>
                <li><Link to="/top-landlords" className="hover:text-primary">Bảng Xếp Hạng</Link></li>
                <li><Link to="#" className="hover:text-primary">Tính năng</Link></li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold text-foreground">Hỗ trợ</h4>
              <ul className="mt-4 space-y-2 text-sm text-muted-foreground">
                <li><Link to="/help" className="hover:text-primary">Trung tâm trợ giúp</Link></li>
                <li><Link to="/contact" className="hover:text-primary">Liên hệ</Link></li>
                <li><Link to="/faq" className="hover:text-primary">FAQ</Link></li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold text-foreground">Pháp lý</h4>
              <ul className="mt-4 space-y-2 text-sm text-muted-foreground">
                <li><Link to="/privacy" className="hover:text-primary">Chính sách bảo mật</Link></li>
                <li><Link to="/terms" className="hover:text-primary">Điều khoản sử dụng</Link></li>
              </ul>
            </div>
          </div>
          <div className="mt-12 flex flex-col items-center justify-between gap-4 border-t pt-8 sm:flex-row">
            <p className="text-sm text-muted-foreground">
              2024 SmartRental. All rights reserved.
            </p>
            <div className="flex items-center gap-1 text-sm text-muted-foreground">
              <Star className="h-4 w-4 fill-primary text-primary" />
              <span>4.8/5 trên 1,000+ đánh giá</span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
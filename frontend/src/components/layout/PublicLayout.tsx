import { Outlet, Link } from "react-router-dom";
import { Button } from "../ui/Button";
import { Home, Star } from "lucide-react";
import { useAuth } from "../../context/AuthContext";
// Import component UserNav mới (Giả sử bạn đã tạo ở Bước 1)
import { UserNav } from "../shared/UserNav"; 

export default function PublicLayout() {
  const { isAuthenticated } = useAuth();

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

          {/* Menu Chính */}
          <nav className="hidden items-center gap-6 md:flex">
            <Link to="/" className="text-sm font-medium text-foreground hover:text-primary">
              Trang chủ
            </Link>
            <Link to="/properties" className="text-sm font-medium text-muted-foreground hover:text-primary">
              Tìm phòng
            </Link>
            <Link to="/contact" className="text-sm font-medium text-muted-foreground hover:text-primary">
              Liên hệ
            </Link>
            <Link to="/help" className="text-sm font-medium text-muted-foreground hover:text-primary">
              Trợ giúp
            </Link>
          </nav>

          {/* Phần hiển thị User (Đã cập nhật) */}
          <div className="flex items-center gap-3">
            {isAuthenticated ? (
              // ✅ HIỂN THỊ USERNAV KHI ĐÃ ĐĂNG NHẬP
              <UserNav />
            ) : (
              // HIỂN THỊ NÚT ĐĂNG NHẬP/ĐĂNG KÝ KHI CHƯA LOGIN
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
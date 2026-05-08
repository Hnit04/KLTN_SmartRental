import { Outlet, Link, NavLink } from "react-router-dom"; // Sử dụng NavLink
import { Button } from "../ui/Button";
import { Home, Star, LayoutDashboard, Mail, Facebook, Linkedin, Twitter, MapPin, Phone, CheckCircle2, Heart } from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import { UserNav } from "../shared/UserNav"; 
import NotificationBell from "../shared/NotificationBell";
import { useState, useEffect } from "react"; 
import { ArrowUp, ShieldCheck, Globe, CreditCard } from "lucide-react";
import { DASHBOARD_BY_ROLE, type AppRole } from "@/config/navigation";
import { useFavorites } from "@/hooks/useFavorites";

export default function PublicLayout() {
  const { isAuthenticated, user } = useAuth();
  const normalizedRole: AppRole = user?.role === 'ADMIN' ? 'ADMIN' : user?.role === 'LANDLORD' ? 'LANDLORD' : 'TENANT';
  const dashboardPath = DASHBOARD_BY_ROLE[normalizedRole];
  const dashboardLabel = normalizedRole === 'LANDLORD' ? 'Quản lý' : normalizedRole === 'ADMIN' ? 'Quản trị' : 'Của tôi';
  const { favoriteIds } = useFavorites();
  const favCount = favoriteIds.length;
  const [newsletter, setNewsletter] = useState("");
  const [newsletterStatus, setNewsletterStatus] = useState<"idle" | "loading" | "success" | "error">("idle");

  const handleNewsletterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newsletter.trim()) return;
    
    setNewsletterStatus("loading");
    // Simulate API call
    setTimeout(() => {
      setNewsletterStatus("success");
      setNewsletter("");
      setTimeout(() => setNewsletterStatus("idle"), 2000);
    }, 1000);
  };

  const [showBackToTop, setShowBackToTop] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setShowBackToTop(window.scrollY > 400);
    };

    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

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
                to={dashboardPath}
                className={({ isActive }) => 
                  `flex items-center gap-1.5 text-sm font-semibold px-3 py-1 rounded-full transition-colors ${
                    isActive 
                      ? "bg-primary text-primary-foreground" 
                      : "text-primary border border-primary/20 bg-primary/5 hover:bg-primary/10"
                  }`
                }
              >
                <LayoutDashboard className="h-3.5 w-3.5" />
                {dashboardLabel}
              </NavLink>
            )}
          </nav>

          <div className="flex items-center gap-3">
            {isAuthenticated ? (
              <>
                {user?.role === 'TENANT' && (
                  <Link
                    to="/tenant/favorites"
                    className="relative p-2 rounded-full text-gray-500 hover:text-red-500 hover:bg-red-50 transition-all duration-200"
                    title="Phòng yêu thích"
                  >
                    <Heart className="h-5 w-5" />
                    {favCount > 0 && (
                      <span className="absolute -top-0.5 -right-0.5 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white shadow-sm">
                        {favCount}
                      </span>
                    )}
                  </Link>
                )}
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
      <footer className="bg-[#0f172a] text-slate-300 py-16 md:py-24 border-t border-slate-800 relative overflow-hidden">
        {/* Decorative background elements */}
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-primary/5 rounded-full blur-[120px] pointer-events-none"></div>
        <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-blue-500/5 rounded-full blur-[120px] pointer-events-none"></div>
        
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 relative z-10">
          {/* Newsletter CTA - Full Width Premium Glassmorphism */}
          <div className="mb-16 rounded-3xl bg-gradient-to-r from-primary/20 via-primary/10 to-transparent p-8 md:p-12 border border-primary/20 backdrop-blur-md shadow-xl relative overflow-hidden group">
            <div className="absolute -right-24 -top-24 w-64 h-64 bg-primary/10 rounded-full blur-3xl group-hover:bg-primary/20 transition-all duration-700"></div>
            <div className="flex flex-col items-center justify-between gap-8 md:flex-row relative z-10">
              <div className="text-center md:text-left">
                <h3 className="text-3xl font-extrabold text-white mb-3 tracking-tight">Gia nhập cộng đồng <span className="text-primary italic">SmartRental</span></h3>
                <p className="text-slate-400 max-w-md text-lg">Đăng ký ngay để nhận thông báo về những căn phòng tốt nhất sớm nhất.</p>
              </div>
              <form onSubmit={handleNewsletterSubmit} className="flex w-full md:w-auto gap-3 p-1.5 bg-white/5 rounded-2xl border border-white/10 shadow-inner backdrop-blur-sm">
                <input 
                  type="email" 
                  placeholder="Email của bạn..." 
                  value={newsletter}
                  onChange={(e) => setNewsletter(e.target.value)}
                  disabled={newsletterStatus === "loading"}
                  className="px-5 py-3 rounded-xl border-none bg-transparent flex-1 md:flex-none md:min-w-72 focus:ring-0 text-white placeholder:text-slate-500 disabled:opacity-50"
                />
                <Button 
                  type="submit"
                  disabled={newsletterStatus === "loading"}
                  className="gap-2 px-6 py-6 rounded-xl shadow-lg hover:shadow-primary/25 transition-all duration-300"
                  isLoading={newsletterStatus === "loading"}
                >
                  {newsletterStatus === "success" ? <CheckCircle2 className="h-5 w-5" /> : <Mail className="h-5 w-5" />}
                  <span className="font-bold">
                    {newsletterStatus === "success" ? "Đã xong!" : "Tham gia ngay"}
                  </span>
                </Button>
              </form>
            </div>
          </div>

          {/* Main Footer Grid */}
          <div className="grid gap-12 sm:grid-cols-2 lg:grid-cols-5 mb-12">
            {/* Brand Section */}
            <div className="lg:col-span-1">
              <div className="flex items-center gap-2 mb-6">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary">
                  <Home className="h-5 w-5 text-primary-foreground" />
                </div>
                <span className="text-xl font-bold text-white tracking-tight">SmartRental</span>
              </div>
              <p className="text-sm text-slate-400 leading-relaxed mb-8">
                Nền tảng thuê phòng thông minh, mang lại sự tiện nghi và an tâm tuyệt đối cho mọi nhà.
              </p>
              {/* Social Links */}
              <div className="flex items-center gap-4">
                <a href="https://facebook.com" target="_blank" rel="noreferrer" className="p-2.5 rounded-xl bg-white/5 border border-white/10 text-slate-400 hover:bg-primary hover:text-white hover:border-primary transition-all duration-300" aria-label="Facebook">
                  <Facebook className="h-4 w-4" />
                </a>
                <a href="https://linkedin.com" target="_blank" rel="noreferrer" className="p-2.5 rounded-xl bg-white/5 border border-white/10 text-slate-400 hover:bg-primary hover:text-white hover:border-primary transition-all duration-300" aria-label="LinkedIn">
                  <Linkedin className="h-4 w-4" />
                </a>
                <a href="https://twitter.com" target="_blank" rel="noreferrer" className="p-2.5 rounded-xl bg-white/5 border border-white/10 text-slate-400 hover:bg-primary hover:text-white hover:border-primary transition-all duration-300" aria-label="Twitter">
                  <Twitter className="h-4 w-4" />
                </a>
              </div>
            </div>

            {/* Products */}
            <div>
              <h4 className="font-semibold text-white mb-6 flex items-center gap-2 uppercase text-xs tracking-[0.2em]">
                Sản phẩm
              </h4>
              <ul className="space-y-4 text-sm">
                <li className="group"><Link to="/properties" className="text-slate-400 hover:text-white hover:translate-x-1 flex items-center gap-2 transition-all duration-300">🏠 <span>Tìm phòng</span></Link></li>
                <li className="group"><Link to="/top-landlords" className="text-slate-400 hover:text-white hover:translate-x-1 flex items-center gap-2 transition-all duration-300">🔥 <span>Bảng Xếp Hạng</span></Link></li>
                <li className="group"><Link to="/help" className="text-slate-400 hover:text-white hover:translate-x-1 flex items-center gap-2 transition-all duration-300">✨ <span>Tính năng</span></Link></li>
                <li className="group"><Link to="/terms" className="text-slate-400 hover:text-white hover:translate-x-1 flex items-center gap-2 transition-all duration-300">💳 <span>Giá cước</span></Link></li>
              </ul>
            </div>

            {/* Support */}
            <div>
              <h4 className="font-semibold text-white mb-6 flex items-center gap-2 uppercase text-xs tracking-[0.2em]">
                Hỗ trợ
              </h4>
              <ul className="space-y-4 text-sm">
                <li className="group"><Link to="/help" className="text-slate-400 hover:text-white hover:translate-x-1 flex items-center gap-2 transition-all duration-300">📚 <span>Trung tâm trợ giúp</span></Link></li>
                <li className="group"><Link to="/contact" className="text-slate-400 hover:text-white hover:translate-x-1 flex items-center gap-2 transition-all duration-300">💬 <span>Liên hệ</span></Link></li>
                <li className="group"><Link to="/faq" className="text-slate-400 hover:text-white hover:translate-x-1 flex items-center gap-2 transition-all duration-300">❓ <span>FAQ</span></Link></li>
                <li className="group"><Link to="/contact" className="text-slate-400 hover:text-white hover:translate-x-1 flex items-center gap-2 transition-all duration-300">🐛 <span>Báo lỗi</span></Link></li>
              </ul>
            </div>

            {/* Legal */}
            <div>
              <h4 className="font-semibold text-white mb-6 flex items-center gap-2 uppercase text-xs tracking-[0.2em]">
                Pháp lý
              </h4>
              <ul className="space-y-4 text-sm">
                <li className="group"><Link to="/privacy" className="text-slate-400 hover:text-white hover:translate-x-1 flex items-center gap-2 transition-all duration-300">🔒 <span>Chính sách bảo mật</span></Link></li>
                <li className="group"><Link to="/terms" className="text-slate-400 hover:text-white hover:translate-x-1 flex items-center gap-2 transition-all duration-300">⚖️ <span>Điều khoản sử dụng</span></Link></li>
                <li className="group"><Link to="/terms" className="text-slate-400 hover:text-white hover:translate-x-1 flex items-center gap-2 transition-all duration-300">📋 <span>Quy tắc cộng đồng</span></Link></li>
              </ul>
            </div>

            {/* Contact Info */}
            <div className="lg:col-span-1">
              <h4 className="font-semibold text-white mb-6 uppercase text-xs tracking-[0.2em]">
                Tải ứng dụng
              </h4>
              <div className="flex flex-col gap-3">
                <button className="flex items-center gap-3 px-4 py-2 bg-slate-800 text-white rounded-xl hover:bg-slate-700 transition-all duration-300 border border-white/5">
                   <div className="p-1"><Home className="h-5 w-5" /></div>
                   <div className="text-left">
                      <p className="text-[9px] leading-none opacity-60 uppercase">Download on</p>
                      <p className="text-sm font-bold leading-none mt-1">App Store</p>
                   </div>
                </button>
                <button className="flex items-center gap-3 px-4 py-2 bg-slate-800 text-white rounded-xl hover:bg-slate-700 transition-all duration-300 border border-white/5">
                   <div className="p-1"><Home className="h-5 w-5" /></div>
                   <div className="text-left">
                      <p className="text-[9px] leading-none opacity-60 uppercase">Get it on</p>
                      <p className="text-sm font-bold leading-none mt-1">Google Play</p>
                   </div>
                </button>
              </div>
              
              <div className="mt-8 pt-8 border-t border-white/5">
                 <div className="flex items-center gap-4 grayscale opacity-30 hover:grayscale-0 hover:opacity-100 transition-all duration-500">
                    <ShieldCheck className="h-7 w-7 text-white" />
                    <CreditCard className="h-7 w-7 text-white" />
                    <Globe className="h-7 w-7 text-white" />
                 </div>
              </div>
            </div>
          </div>

          {/* Bottom Footer */}
          <div className="border-t border-white/5 pt-10 flex flex-col items-center justify-between gap-6 md:flex-row">
            <div className="flex flex-col sm:flex-row items-center gap-6 text-xs text-slate-500 font-medium">
              <p>© {new Date().getFullYear()} SmartRental. All rights reserved.</p>
              <div className="hidden sm:block h-4 w-px bg-white/5"></div>
              <p>Phiên bản: 2.1.0-stable</p>
            </div>
            <div className="flex items-center gap-2 text-xs font-bold text-slate-400 bg-white/5 px-4 py-2 rounded-full border border-white/5">
              <Star className="h-4 w-4 fill-primary text-primary" />
              <span>4.8/5</span>
              <span className="opacity-40">|</span>
              <span className="font-normal opacity-60">1,200+ Reviews</span>
            </div>
          </div>
        </div>
      </footer>

      {/* ─── BACK TO TOP BUTTON ─── */}
      <Button
        onClick={scrollToTop}
        className={`fixed bottom-24 right-8 z-[60] h-12 w-12 rounded-full shadow-2xl transition-all duration-500 hover:scale-110 active:scale-95 border-2 border-white/20 ${
          showBackToTop ? "translate-y-0 opacity-100" : "translate-y-20 opacity-0 pointer-events-none"
        }`}
        size="icon"
      >
        <ArrowUp className="h-5 w-5" />
      </Button>
    </div>
  );
}
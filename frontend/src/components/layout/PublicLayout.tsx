import { Outlet, Link, NavLink, useLocation } from "react-router-dom";
import { Button } from "../ui/Button";
import { Home, Star, LayoutDashboard, Mail, Facebook, Linkedin, Twitter, CheckCircle2, Heart, Menu, X } from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import { UserNav } from "../shared/UserNav"; 
import NotificationBell from "../shared/NotificationBell";
import { ThemeToggle } from "../shared/ThemeToggle";
import { useState, useEffect } from "react"; 
import { ArrowUp, ShieldCheck, Globe, CreditCard, Search, TrendingUp, Sparkles, BookOpen, MessageCircle, HelpCircle, Bug, Shield, Scale, ClipboardList } from "lucide-react";
import { DASHBOARD_BY_ROLE, type AppRole } from "@/config/navigation";
import { useFavorites } from "@/hooks/useFavorites";

export default function PublicLayout() {
  const location = useLocation();
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
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    setMobileMenuOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    if (mobileMenuOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [mobileMenuOpen]);

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

  // Ham tao class de xu ly focus khi link active
  const navLinkClass = ({ isActive }: { isActive: boolean }) => 
    `text-sm font-medium transition-colors hover:text-primary ${
      isActive ? "text-primary border-b-2 border-primary pb-1" : "text-muted-foreground"
    }`;

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* HEADER */}
      <header className="sticky top-0 z-50 border-b bg-card/80 backdrop-blur-sm">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-2 px-4 sm:px-6 lg:px-8 min-w-0">
          {/* Logo */}
          <Link to="/" className="flex min-w-0 items-center gap-2 shrink-0" onClick={() => setMobileMenuOpen(false)}>
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary">
              <Home className="h-5 w-5 text-primary-foreground" />
            </div>
            <span className="text-lg sm:text-xl font-bold text-foreground truncate">SmartRental</span>
          </Link>

          {/* Menu Chinh co Focus */}
          <nav className="hidden items-center gap-6 md:flex">
            <NavLink to="/" className={navLinkClass}>
              Trang chủ
            </NavLink>
            <NavLink to="/properties" className={navLinkClass}>
              Tìm phòng
            </NavLink>
            {/* <NavLink to="/top-landlords" className={navLinkClass}>
              🔥 Bảng Xếp Hạng
            </NavLink> */}
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

          <div className="flex min-w-0 shrink-0 items-center justify-end gap-1 sm:gap-2 md:gap-3">
            <button
              type="button"
              className="md:hidden inline-flex h-10 w-10 items-center justify-center rounded-lg text-foreground hover:bg-muted border border-border"
              aria-expanded={mobileMenuOpen}
              aria-controls="public-mobile-nav"
              aria-label={mobileMenuOpen ? "Đóng menu" : "Mở menu"}
              onClick={() => setMobileMenuOpen((o) => !o)}
            >
              {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>
            {isAuthenticated ? (
              <>
                {user?.role === 'TENANT' && (
                  <Link
                    to="/tenant/favorites"
                    className="relative rounded-full p-1.5 text-gray-500 transition-all duration-200 hover:bg-red-50 hover:text-red-500 sm:p-2"
                    title="Phòng yêu thích"
                  >
                    <Heart className="h-[1.125rem] w-[1.125rem] sm:h-5 sm:w-5" />
                    {favCount > 0 && (
                      <span className="absolute -top-0.5 -right-0.5 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white shadow-sm">
                        {favCount}
                      </span>
                    )}
                  </Link>
                )}
                <NotificationBell />
                <ThemeToggle />
                <div className="h-6 w-px bg-gray-200 hidden sm:block" />
                <UserNav />
              </>
            ) : (
              <>
                <ThemeToggle />
                <Link to="/login">
                  <Button variant="ghost" size="sm" className="px-2.5 sm:px-3 text-xs sm:text-sm whitespace-nowrap">
                    Đăng nhập
                  </Button>
                </Link>
                <Link to="/register">
                  <Button size="sm" className="px-2.5 sm:px-3 text-xs sm:text-sm whitespace-nowrap">
                    Đăng ký
                  </Button>
                </Link>
              </>
            )}
          </div>
        </div>
      </header>

      {/* Mobile drawer - cung route voi nav desktop */}
      {mobileMenuOpen && (
        <>
          <button
            type="button"
            className="fixed inset-0 z-[55] bg-black/50 md:hidden animate-in fade-in duration-200"
            aria-hidden
            onClick={() => setMobileMenuOpen(false)}
          />
          <div
            id="public-mobile-nav"
            className="fixed inset-y-0 right-0 z-[56] flex w-[min(100%,20rem)] flex-col border-l bg-card shadow-2xl md:hidden animate-in slide-in-from-right duration-200"
            role="dialog"
            aria-modal="true"
            aria-label="Menu điều hướng"
          >
            <div className="flex h-16 items-center justify-between border-b px-4">
              <span className="font-semibold text-foreground">Menu</span>
              <button
                type="button"
                className="inline-flex h-9 w-9 items-center justify-center rounded-lg hover:bg-muted"
                aria-label="Đóng menu"
                onClick={() => setMobileMenuOpen(false)}
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <nav className="flex flex-1 flex-col gap-0.5 overflow-y-auto p-3">
              <NavLink
                to="/"
                onClick={() => setMobileMenuOpen(false)}
                className={({ isActive }) =>
                  `rounded-lg px-3 py-3 text-sm font-medium ${isActive ? "bg-primary/10 text-primary" : "text-foreground hover:bg-muted"}`
                }
              >
                Trang chủ
              </NavLink>
              <NavLink
                to="/properties"
                onClick={() => setMobileMenuOpen(false)}
                className={({ isActive }) =>
                  `rounded-lg px-3 py-3 text-sm font-medium ${isActive ? "bg-primary/10 text-primary" : "text-foreground hover:bg-muted"}`
                }
              >
                Tìm phòng
              </NavLink>
              <NavLink
                to="/contact"
                onClick={() => setMobileMenuOpen(false)}
                className={({ isActive }) =>
                  `rounded-lg px-3 py-3 text-sm font-medium ${isActive ? "bg-primary/10 text-primary" : "text-foreground hover:bg-muted"}`
                }
              >
                Liên hệ
              </NavLink>
              <NavLink
                to="/help"
                onClick={() => setMobileMenuOpen(false)}
                className={({ isActive }) =>
                  `rounded-lg px-3 py-3 text-sm font-medium ${isActive ? "bg-primary/10 text-primary" : "text-foreground hover:bg-muted"}`
                }
              >
                Trợ giúp
              </NavLink>
              {isAuthenticated && (
                <NavLink
                  to={dashboardPath}
                  onClick={() => setMobileMenuOpen(false)}
                  className={({ isActive }) =>
                    `mt-2 flex items-center gap-2 rounded-lg px-3 py-3 text-sm font-semibold ${
                      isActive ? "bg-primary text-primary-foreground" : "border border-primary/20 bg-primary/5 text-primary"
                    }`
                  }
                >
                  <LayoutDashboard className="h-4 w-4" />
                  {dashboardLabel}
                </NavLink>
              )}
              {user?.role === "TENANT" && (
                <Link
                  to="/tenant/favorites"
                  onClick={() => setMobileMenuOpen(false)}
                  className="mt-1 flex items-center gap-2 rounded-lg px-3 py-3 text-sm font-medium text-foreground hover:bg-muted"
                >
                  <Heart className="h-4 w-4 text-red-500" />
                  Phòng yêu thích
                  {favCount > 0 && (
                    <span className="ml-auto rounded-full bg-red-500 px-2 py-0.5 text-[10px] font-bold text-white">{favCount}</span>
                  )}
                </Link>
              )}
            </nav>
          </div>
        </>
      )}

      {/* MAIN CONTENT */}
      <main className="flex-1">
        <Outlet />
      </main>

      {/* FOOTER */}
      <footer className="relative overflow-hidden border-t border-slate-800/70 bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 py-14 text-slate-300 md:py-20">
        <div className="pointer-events-none absolute -left-20 top-16 h-72 w-72 rounded-full bg-primary/18 blur-3xl" />
        <div className="pointer-events-none absolute -right-20 bottom-12 h-72 w-72 rounded-full bg-primary/10 blur-3xl" />

        <div className="relative z-10 mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="mb-14 rounded-3xl border border-white/10 bg-white/[0.04] p-6 backdrop-blur-sm md:p-8">
            <div className="flex flex-col items-start justify-between gap-6 lg:flex-row lg:items-center">
              <div>
                <h3 className="text-2xl font-extrabold tracking-tight text-white md:text-3xl">
                  Gia nhập cộng đồng <span className="text-primary italic">SmartRental</span>
                </h3>
                <p className="mt-2 max-w-xl text-sm text-slate-300/85 md:text-base">
                  Đăng ký để nhận thông báo sớm về phòng phù hợp, ưu đãi mới và cập nhật sản phẩm.
                </p>
              </div>
              <form
                onSubmit={handleNewsletterSubmit}
                className="flex w-full flex-col gap-2 rounded-2xl border border-white/15 bg-slate-900/70 p-1.5 sm:flex-row lg:max-w-xl"
              >
                <input
                  type="email"
                  placeholder="Email của bạn..."
                  value={newsletter}
                  onChange={(e) => setNewsletter(e.target.value)}
                  disabled={newsletterStatus === "loading"}
                  className="h-11 flex-1 rounded-xl border-none bg-transparent px-4 text-sm text-white placeholder:text-slate-400 focus:outline-none disabled:opacity-50"
                />
                <Button
                  type="submit"
                  disabled={newsletterStatus === "loading"}
                  className="h-11 w-full gap-2 rounded-xl px-5 shadow-lg shadow-primary/20 sm:w-auto"
                  isLoading={newsletterStatus === "loading"}
                >
                  {newsletterStatus === "success" ? <CheckCircle2 className="h-4 w-4" /> : <Mail className="h-4 w-4" />}
                  <span>{newsletterStatus === "success" ? "Đã đăng ký" : "Tham gia ngay"}</span>
                </Button>
              </form>
            </div>
          </div>

          <div className="grid gap-10 sm:grid-cols-2 lg:grid-cols-5">
            <div>
              <div className="mb-5 flex items-center gap-2">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary">
                  <Home className="h-5 w-5 text-primary-foreground" />
                </div>
                <span className="text-2xl font-bold tracking-tight text-white">SmartRental</span>
              </div>
              <p className="max-w-xs text-sm leading-relaxed text-slate-300/85">
                Nền tảng thuê phòng thông minh, mang lại sự tiện nghi và an tâm rõ ràng cho cả Chủ trọ và Người thuê.
              </p>
              <div className="mt-6 flex items-center gap-3">
                <a
                  href="https://facebook.com"
                  target="_blank"
                  rel="noreferrer"
                  className="rounded-xl border border-white/15 bg-white/5 p-2.5 text-slate-300 transition-all duration-300 hover:-translate-y-0.5 hover:border-primary/50 hover:bg-primary/20 hover:text-white"
                  aria-label="Facebook"
                >
                  <Facebook className="h-4 w-4 stroke-[1.5]" />
                </a>
                <a
                  href="https://linkedin.com"
                  target="_blank"
                  rel="noreferrer"
                  className="rounded-xl border border-white/15 bg-white/5 p-2.5 text-slate-300 transition-all duration-300 hover:-translate-y-0.5 hover:border-primary/50 hover:bg-primary/20 hover:text-white"
                  aria-label="LinkedIn"
                >
                  <Linkedin className="h-4 w-4 stroke-[1.5]" />
                </a>
                <a
                  href="https://twitter.com"
                  target="_blank"
                  rel="noreferrer"
                  className="rounded-xl border border-white/15 bg-white/5 p-2.5 text-slate-300 transition-all duration-300 hover:-translate-y-0.5 hover:border-primary/50 hover:bg-primary/20 hover:text-white"
                  aria-label="Twitter"
                >
                  <Twitter className="h-4 w-4 stroke-[1.5]" />
                </a>
              </div>
            </div>

            <div>
              <h4 className="mb-5 text-xs font-bold uppercase tracking-[0.2em] text-primary/90">Sản phẩm</h4>
              <ul className="space-y-3 text-sm">
                <li>
                  <Link to="/properties" className="group inline-flex items-center gap-2 text-slate-300/90 transition hover:text-white">
                    <Search className="h-4 w-4 stroke-[1.5] text-slate-400 transition group-hover:text-primary" />
                    Tìm phòng
                  </Link>
                </li>
                <li>
                  <Link to="/help" className="group inline-flex items-center gap-2 text-slate-300/90 transition hover:text-white">
                    <Sparkles className="h-4 w-4 stroke-[1.5] text-slate-400 transition group-hover:text-primary" />
                    Tính năng
                  </Link>
                </li>
                <li>
                  <Link to="/terms" className="group inline-flex items-center gap-2 text-slate-300/90 transition hover:text-white">
                    <CreditCard className="h-4 w-4 stroke-[1.5] text-slate-400 transition group-hover:text-primary" />
                    Giá cước
                  </Link>
                </li>
              </ul>
            </div>

            <div>
              <h4 className="mb-5 text-xs font-bold uppercase tracking-[0.2em] text-primary/90">Hỗ trợ</h4>
              <ul className="space-y-3 text-sm">
                <li>
                  <Link to="/help" className="group inline-flex items-center gap-2 text-slate-300/90 transition hover:text-white">
                    <BookOpen className="h-4 w-4 stroke-[1.5] text-slate-400 transition group-hover:text-primary" />
                    Trung tâm trợ giúp
                  </Link>
                </li>
                <li>
                  <Link to="/contact" className="group inline-flex items-center gap-2 text-slate-300/90 transition hover:text-white">
                    <MessageCircle className="h-4 w-4 stroke-[1.5] text-slate-400 transition group-hover:text-primary" />
                    Liên hệ
                  </Link>
                </li>
                <li>
                  <Link to="/faq" className="group inline-flex items-center gap-2 text-slate-300/90 transition hover:text-white">
                    <HelpCircle className="h-4 w-4 stroke-[1.5] text-slate-400 transition group-hover:text-primary" />
                    FAQ
                  </Link>
                </li>
                <li>
                  <Link to="/contact" className="group inline-flex items-center gap-2 text-slate-300/90 transition hover:text-white">
                    <Bug className="h-4 w-4 stroke-[1.5] text-slate-400 transition group-hover:text-primary" />
                    Báo lỗi
                  </Link>
                </li>
              </ul>
            </div>

            <div>
              <h4 className="mb-5 text-xs font-bold uppercase tracking-[0.2em] text-primary/90">Pháp lý</h4>
              <ul className="space-y-3 text-sm">
                <li>
                  <Link to="/privacy" className="group inline-flex items-center gap-2 text-slate-300/90 transition hover:text-white">
                    <Shield className="h-4 w-4 stroke-[1.5] text-slate-400 transition group-hover:text-primary" />
                    Chính sách bảo mật
                  </Link>
                </li>
                <li>
                  <Link to="/terms" className="group inline-flex items-center gap-2 text-slate-300/90 transition hover:text-white">
                    <Scale className="h-4 w-4 stroke-[1.5] text-slate-400 transition group-hover:text-primary" />
                    Điều khoản sử dụng
                  </Link>
                </li>
                <li>
                  <Link to="/terms" className="group inline-flex items-center gap-2 text-slate-300/90 transition hover:text-white">
                    <ClipboardList className="h-4 w-4 stroke-[1.5] text-slate-400 transition group-hover:text-primary" />
                    Quy tắc cộng đồng
                  </Link>
                </li>
              </ul>
            </div>

            <div>
              <h4 className="mb-5 text-xs font-bold uppercase tracking-[0.2em] text-primary/90">Tải ứng dụng</h4>
              <div className="space-y-3">
                <button className="w-full rounded-xl border border-white/15 bg-white/5 px-4 py-2.5 text-left transition-all duration-300 hover:border-primary/50 hover:bg-primary/20">
                  <div className="flex items-center gap-3">
                    <Home className="h-5 w-5 text-slate-200" />
                    <div>
                      <p className="text-[10px] uppercase tracking-wide text-slate-400">Download on</p>
                      <p className="text-sm font-bold text-white">App Store</p>
                    </div>
                  </div>
                </button>
                <button className="w-full rounded-xl border border-white/15 bg-white/5 px-4 py-2.5 text-left transition-all duration-300 hover:border-primary/50 hover:bg-primary/20">
                  <div className="flex items-center gap-3">
                    <Home className="h-5 w-5 text-slate-200" />
                    <div>
                      <p className="text-[10px] uppercase tracking-wide text-slate-400">Get it on</p>
                      <p className="text-sm font-bold text-white">Google Play</p>
                    </div>
                  </div>
                </button>
              </div>

              <div className="mt-7 border-t border-white/10 pt-6">
                <div className="flex items-center gap-4 text-slate-500">
                  <ShieldCheck className="h-6 w-6 stroke-[1.5]" />
                  <CreditCard className="h-6 w-6 stroke-[1.5]" />
                  <Globe className="h-6 w-6 stroke-[1.5]" />
                </div>
              </div>
            </div>
          </div>

          <div className="mt-12 flex flex-col items-center justify-between gap-5 border-t border-white/10 pt-8 md:flex-row">
            <div className="flex flex-col items-center gap-4 text-xs text-slate-400 sm:flex-row">
              <p>© {new Date().getFullYear()} SmartRental. All rights reserved.</p>
              <span className="hidden h-4 w-px bg-white/20 sm:block" />
              <p>Phiên bản: 2.1.0-stable</p>
            </div>
            <div className="inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/15 px-4 py-2 text-xs font-semibold text-slate-200">
              <Star className="h-4 w-4 fill-primary text-primary stroke-[1.5]" />
              <span className="text-primary">4.8/5</span>
              <span className="opacity-40">|</span>
              <span className="font-normal text-slate-300/80">1,200+ Reviews</span>
            </div>
          </div>
        </div>
      </footer>

      {/* BACK TO TOP BUTTON */}
      <Button
        onClick={scrollToTop}
        className={`fixed bottom-28 right-4 z-[60] h-12 w-12 rounded-full shadow-2xl transition-all duration-500 hover:scale-110 active:scale-95 border-2 border-white/20 sm:bottom-24 sm:right-8 ${
          showBackToTop ? "translate-y-0 opacity-100" : "translate-y-20 opacity-0 pointer-events-none"
        }`}
        size="icon"
      >
        <ArrowUp className="h-5 w-5" />
      </Button>
    </div>
  );
}

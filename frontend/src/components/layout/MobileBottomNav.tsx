import { Link, useLocation } from "react-router-dom";
import { Home, Search, FileText, CalendarClock, LayoutDashboard, DoorOpen, Wallet, PieChart } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { cn } from "@/utils/cn";

/**
 * Mobile Bottom Navigation Bar — hiển thị khi màn hình nhỏ hơn md.
 * Chỉ dùng cho layout có Sidebar (MainLayout).
 * TENANT: Trang chủ / Tìm phòng / Hợp đồng / Lịch hẹn
 * LANDLORD: Tổng quan / Khu trọ / Hợp đồng / Lịch hẹn
 */
export default function MobileBottomNav() {
  const location = useLocation();
  const { user } = useAuth();

  const tenantNav = [
    { to: "/tenant/dashboard", icon: LayoutDashboard, label: "Tổng quan" },
    { to: "/properties",       icon: Search,          label: "Tìm phòng" },
    { to: "/tenant/my-room",     icon: DoorOpen,        label: "Phòng trọ" },
    { to: "/tenant/contracts",   icon: FileText,        label: "Hợp đồng" },
    { to: "/tenant/appointments", icon: CalendarClock,   label: "Lịch hẹn" },
  ];

  const landlordNav = [
    { to: "/landlord/dashboard",    icon: LayoutDashboard, label: "Tổng quan" },
    { to: "/landlord/properties",   icon: Home,            label: "Khu trọ" },
    { to: "/landlord/contracts",    icon: FileText,        label: "Hợp đồng" },
    { to: "/landlord/finance",      icon: Wallet,          label: "Tài chính" },
    { to: "/landlord/appointments", icon: CalendarClock,   label: "Lịch hẹn" },
    { to: "/landlord/reports",      icon: PieChart,        label: "Báo cáo" },
  ];

  const navItems = user?.role === "LANDLORD" ? landlordNav : tenantNav;

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 md:hidden bg-white border-t border-gray-200 shadow-[0_-2px_12px_rgba(0,0,0,0.08)]">
      <div className="flex items-stretch h-16">
        {navItems.map((item) => {
          const isActive =
            location.pathname === item.to ||
            (item.to !== "/" && location.pathname.startsWith(item.to + "/"));
          return (
            <Link
              key={item.to}
              to={item.to}
              className={cn(
                "flex flex-col items-center justify-center flex-1 gap-0.5 text-[10px] font-semibold transition-colors active:scale-95",
                isActive
                  ? "text-primary"
                  : "text-gray-400 hover:text-gray-700"
              )}
            >
              <item.icon
                className={cn(
                  "h-5 w-5 transition-transform",
                  isActive && "scale-110"
                )}
                strokeWidth={isActive ? 2.5 : 1.8}
              />
              <span>{item.label}</span>
              {isActive && (
                <span className="absolute bottom-0 w-8 h-0.5 bg-primary rounded-full" />
              )}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}

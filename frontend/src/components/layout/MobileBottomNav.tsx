import { useEffect, useMemo, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { MoreHorizontal, Search, X, type LucideIcon } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { cn } from "@/utils/cn";
import { ROLE_NAV_ITEMS, type AppRole } from "@/config/navigation";
import { useMobileLayer } from "@/context/MobileLayerContext";

type MobileNavItem = {
  to: string;
  label: string;
  icon: LucideIcon;
};

/**
 * Mobile Bottom Navigation Bar — hiển thị khi màn hình nhỏ hơn md.
 * Chỉ dùng cho layout có Sidebar (MainLayout).
 * TENANT: Trang chủ / Tìm phòng / Hợp đồng / Lịch hẹn
 * LANDLORD: Tổng quan / Khu trọ / Hợp đồng / Lịch hẹn
 */
export default function MobileBottomNav() {
  const location = useLocation();
  const { user } = useAuth();
  const { registerLayer, unregisterLayer, getZIndex } = useMobileLayer();
  const [isMoreOpen, setIsMoreOpen] = useState(false);
  const normalizedRole: AppRole = user?.role === 'ADMIN' ? 'ADMIN' : user?.role === 'LANDLORD' ? 'LANDLORD' : 'TENANT';
  const roleItems = ROLE_NAV_ITEMS[normalizedRole];

  useEffect(() => {
    registerLayer("bottomNav", { active: true, height: 64, zIndex: 50, priority: 100 });
    return () => unregisterLayer("bottomNav");
  }, [registerLayer, unregisterLayer]);

  useEffect(() => {
    setIsMoreOpen(false);
  }, [location.pathname]);

  const findRoleItem = (path: string) => roleItems.find((item) => item.path === path);

  const primaryItems: MobileNavItem[] = useMemo(() => {
    if (normalizedRole === "TENANT") {
      const dashboard = findRoleItem("/tenant/dashboard");
      const contracts = findRoleItem("/tenant/contracts");
      const appointments = findRoleItem("/tenant/appointments");
      return [
        { to: "/properties", icon: Search, label: "Tìm phòng" },
        ...(dashboard ? [{ to: dashboard.path, icon: dashboard.icon, label: dashboard.mobileLabel || dashboard.title }] : []),
        ...(contracts ? [{ to: contracts.path, icon: contracts.icon, label: contracts.mobileLabel || contracts.title }] : []),
        ...(appointments ? [{ to: appointments.path, icon: appointments.icon, label: appointments.mobileLabel || appointments.title }] : []),
      ].slice(0, 4);
    }

    if (normalizedRole === "LANDLORD") {
      const orderedPaths = ["/landlord/dashboard", "/landlord/properties", "/landlord/contracts", "/landlord/finance"];
      return orderedPaths
        .map((path) => findRoleItem(path))
        .filter(Boolean)
        .map((item) => ({ to: item!.path, icon: item!.icon, label: item!.mobileLabel || item!.title }));
    }

    const orderedPaths = ["/admin/dashboard", "/admin/approvals", "/admin/users", "/admin/blockchain-logs"];
    return orderedPaths
      .map((path) => findRoleItem(path))
      .filter(Boolean)
      .map((item) => ({ to: item!.path, icon: item!.icon, label: item!.mobileLabel || item!.title }));
  }, [normalizedRole, roleItems]);

  const primaryPaths = new Set(primaryItems.map((item) => item.to));
  const moreItems: MobileNavItem[] = roleItems
    .filter((item) => !primaryPaths.has(item.path))
    .map((item) => ({
      to: item.path,
      icon: item.icon,
      label: item.mobileLabel || item.title,
    }));

  const isPathActive = (path: string) =>
    location.pathname === path || (path !== "/" && location.pathname.startsWith(path + "/"));

  const isMoreActive = moreItems.some((item) => isPathActive(item.to));

  return (
    <>
      <nav
        className="fixed bottom-0 left-0 right-0 md:hidden bg-white/95 backdrop-blur-md border-t border-gray-200/80 shadow-[0_-2px_12px_rgba(0,0,0,0.06)]"
        style={{ paddingBottom: "env(safe-area-inset-bottom, 0px)", zIndex: getZIndex("bottomNav") }}
      >
      <div className="flex items-stretch h-16">
        {primaryItems.map((item) => {
          const isActive = isPathActive(item.to);
          return (
            <Link
              key={item.to}
              to={item.to}
              className={cn(
                "relative flex flex-col items-center justify-center flex-1 gap-0.5 min-h-[48px] text-[10px] font-semibold transition-all duration-200 active:scale-95",
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
                <span className="absolute bottom-0 w-8 h-0.5 bg-primary rounded-full transition-all duration-300" />
              )}
            </Link>
          );
        })}

        <button
          type="button"
          onClick={() => setIsMoreOpen(true)}
          className={cn(
            "relative flex flex-1 min-h-[48px] flex-col items-center justify-center gap-0.5 text-[10px] font-semibold transition-all duration-200 active:scale-95",
            isMoreActive ? "text-primary" : "text-gray-400 hover:text-gray-700"
          )}
          aria-expanded={isMoreOpen}
          aria-label="Mở thêm menu"
        >
          <MoreHorizontal className={cn("h-5 w-5 transition-transform", isMoreActive && "scale-110")} strokeWidth={isMoreActive ? 2.5 : 1.8} />
          <span>Thêm</span>
          {isMoreActive && <span className="absolute bottom-0 h-0.5 w-8 rounded-full bg-primary transition-all duration-300" />}
        </button>
      </div>
      </nav>

      {isMoreOpen && (
        <div
          className="fixed inset-0 md:hidden"
          style={{ zIndex: getZIndex("bottomNav") + 8 }}
        >
          <button
            type="button"
            onClick={() => setIsMoreOpen(false)}
            className="absolute inset-0 bg-black/35 backdrop-blur-[1px]"
            aria-label="Đóng menu thêm"
          />
          <div className="absolute inset-x-0 bottom-0 rounded-t-2xl border-t border-border bg-background p-4 shadow-2xl animate-in slide-in-from-bottom-6 duration-200">
            <div className="mb-3 flex items-center justify-between">
              <p className="text-sm font-semibold text-foreground">Tính năng khác</p>
              <button
                type="button"
                onClick={() => setIsMoreOpen(false)}
                className="rounded-full p-1.5 text-muted-foreground hover:bg-muted"
                aria-label="Đóng"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="grid grid-cols-2 gap-2 pb-[calc(env(safe-area-inset-bottom,0px)+0.25rem)]">
              {moreItems.map((item) => (
                <Link
                  key={item.to}
                  to={item.to}
                  onClick={() => setIsMoreOpen(false)}
                  className={cn(
                    "flex min-h-12 items-center gap-2 rounded-xl border px-3 py-2 text-sm font-medium",
                    isPathActive(item.to)
                      ? "border-primary/25 bg-primary/5 text-primary"
                      : "border-border bg-background text-foreground hover:bg-muted/40"
                  )}
                >
                  <item.icon className="h-4 w-4" />
                  <span className="truncate">{item.label}</span>
                </Link>
              ))}
            </div>
          </div>
        </div>
      )}
    </>
  );
}

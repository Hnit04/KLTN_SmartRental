import {
  LayoutDashboard,
  Building,
  FileText,
  Wallet,
  CalendarClock,
  DoorOpen,
  History,
  Users,
  Database,
  CheckSquare,
  BrainCircuit,
  ArrowRightLeft,
  Heart,
  Crown,
  Flag,
  Gavel,
  type LucideIcon,
} from "lucide-react";

export type AppRole = "TENANT" | "LANDLORD" | "ADMIN";

export type NavItem = {
  title: string;
  path: string;
  icon: LucideIcon;
  mobileLabel?: string;
};

export const DASHBOARD_BY_ROLE: Record<AppRole, string> = {
  TENANT: "/tenant/dashboard",
  LANDLORD: "/landlord/dashboard",
  ADMIN: "/admin/dashboard",
};

export const ROLE_NAV_ITEMS: Record<AppRole, NavItem[]> = {
  TENANT: [
    { title: "Tổng quan", path: "/tenant/dashboard", icon: LayoutDashboard, mobileLabel: "Tổng quan" },
    { title: "Phòng trọ của tôi", path: "/tenant/my-room", icon: DoorOpen, mobileLabel: "Phòng trọ" },
    { title: "Phòng yêu thích", path: "/tenant/favorites", icon: Heart, mobileLabel: "Yêu thích" },
    { title: "Hợp đồng của tôi", path: "/tenant/contracts", icon: FileText, mobileLabel: "Hợp đồng" },
    { title: "Lịch hẹn của tôi", path: "/tenant/appointments", icon: CalendarClock, mobileLabel: "Lịch hẹn" },
    { title: "Lịch sử thuê", path: "/tenant/rental-history", icon: History, mobileLabel: "Lịch sử" },
  ],
  LANDLORD: [
    { title: "Tổng quan", path: "/landlord/dashboard", icon: LayoutDashboard, mobileLabel: "Tổng quan" },
    { title: "Khu trọ & Phòng trọ", path: "/landlord/properties", icon: Building, mobileLabel: "Khu trọ" },
    { title: "Quản lý hợp đồng", path: "/landlord/contracts", icon: FileText, mobileLabel: "Hợp đồng" },
    { title: "Tài chính & Hóa đơn", path: "/landlord/finance", icon: Wallet, mobileLabel: "Tài chính" },
    { title: "Quản lý lịch hẹn", path: "/landlord/appointments", icon: CalendarClock, mobileLabel: "Lịch hẹn" },
    { title: "⭐ Gói VIP", path: "/landlord/vip", icon: Crown, mobileLabel: "VIP" },
  ],
  ADMIN: [
    { title: "Quản trị hệ thống", path: "/admin/dashboard", icon: LayoutDashboard, mobileLabel: "Dashboard" },
    { title: "Duyệt tin bài đăng", path: "/admin/approvals", icon: CheckSquare, mobileLabel: "Duyệt tin" },
    { title: "Quản lý người dùng", path: "/admin/users", icon: Users, mobileLabel: "Người dùng" },
    { title: "Logs Blockchain", path: "/admin/blockchain-logs", icon: Database, mobileLabel: "Blockchain" },
    { title: "Thống kê AI & NLP", path: "/admin/ai-analytics", icon: BrainCircuit, mobileLabel: "AI" },
    { title: "Giải quyết Tranh chấp", path: "/admin/disputes", icon: Gavel, mobileLabel: "Tranh chấp" },
    { title: "Quyết toán & Đối soát", path: "/admin/settlements", icon: ArrowRightLeft, mobileLabel: "Quyết toán" },
    { title: "Quản lý Báo cáo", path: "/admin/reports", icon: Flag, mobileLabel: "Báo cáo" },
  ],
};


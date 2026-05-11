import { useEffect, useState } from "react";
import type { ReactNode } from "react";
import { Link } from "react-router-dom";
import {
  Home, FileText, CalendarClock, Receipt, CheckCircle,
  Clock, XCircle, AlertCircle, MapPin, Loader2,
  ChevronRight, Search, CalendarDays, Banknote, Star, Bot,
  DoorOpen, Zap, Droplets, Wifi, ShieldCheck, ExternalLink
} from "lucide-react";
import { contractApi } from "@/api/contractApi";
import { appointmentApi } from "@/api/appointmentApi";
import { billApi } from "@/api/billApi";
import { useAuth } from "@/context/AuthContext";
import type { Contract, AppointmentResponse, Bill } from "@/types/index";
import { Button } from "@/components/ui/Button";
import { PageHeader } from "@/components/ui/PageHeader";
import { Skeleton } from "@/components/ui/Skeleton";
import { EmptyState } from "@/components/ui/EmptyState";
import { StatKpiCard } from "@/components/dashboard";
import StatusBadge from "@/components/shared/StatusBadge";
import { toast } from "sonner";

// ---- HELPER ----
const fmt = (n: number) => new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND" }).format(n);
const fmtDate = (s: string) => new Date(s).toLocaleDateString("vi-VN", { day: "2-digit", month: "2-digit", year: "numeric" });

const ContractStatusBadge = ({ status }: { status: string }) => {
  const map: Record<string, { label: string; tone: "success" | "warning" | "danger" | "neutral" }> = {
    ACTIVE: { label: "Đang thuê", tone: "success" },
    PENDING_SIGNATURE: { label: "Chờ ký", tone: "warning" },
    EXPIRED: { label: "Hết hạn", tone: "neutral" },
    CANCELLED: { label: "Đã hủy", tone: "danger" },
  };
  const cfg = map[status] ?? { label: status, tone: "neutral" as const };
  return <StatusBadge label={cfg.label} tone={cfg.tone} />;
};

const AppointmentStatusBadge = ({ status }: { status: string }) => {
  const map: Record<string, { label: string; icon: ReactNode; cls: string }> = {
    PENDING: { label: "Chờ duyệt", icon: <Clock className="h-3 w-3" />, cls: "text-yellow-700 bg-yellow-50 border-yellow-200" },
    CONFIRMED: { label: "Đã duyệt", icon: <CheckCircle className="h-3 w-3" />, cls: "text-green-700 bg-green-50 border-green-200" },
    APPROVED: { label: "Đã duyệt", icon: <CheckCircle className="h-3 w-3" />, cls: "text-green-700 bg-green-50 border-green-200" },
    CANCELLED: { label: "Đã hủy", icon: <XCircle className="h-3 w-3" />, cls: "text-red-600 bg-red-50 border-red-200" },
    COMPLETED: { label: "Hoàn thành", icon: <CheckCircle className="h-3 w-3" />, cls: "text-blue-700 bg-blue-50 border-blue-200" },
  };
  const { label, icon, cls } = map[status] ?? { label: status, icon: <Clock className="h-3 w-3" />, cls: "text-gray-500 bg-muted/40 border-gray-200" };
  return <span className={`text-xs font-bold px-2.5 py-1 rounded-full border flex items-center gap-1 w-fit ${cls}`}>{icon}{label}</span>;
};

const BillStatusBadge = ({ status }: { status: string }) => {
  const map: Record<string, { label: string; tone: "success" | "warning" | "danger" | "neutral" }> = {
    PAID: { label: "Đã thanh toán", tone: "success" },
    PENDING: { label: "Chờ thanh toán", tone: "warning" },
    LATE: { label: "Quá hạn", tone: "danger" },
    UNBILLED: { label: "Chưa xuất", tone: "neutral" },
  };
  const cfg = map[status] ?? { label: status, tone: "neutral" as const };
  return <StatusBadge label={cfg.label} tone={cfg.tone} />;
};

// ---- MAIN COMPONENT ----
export default function TenantDashboardPage() {
  const { user } = useAuth();

  const [contracts, setContracts] = useState<Contract[]>([]);
  const [appointments, setAppointments] = useState<AppointmentResponse[]>([]);
  const [bills, setBills] = useState<Bill[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Hợp đồng đang active để lấy bills
  const activeContract = contracts.find(c => c.status === "ACTIVE");
  const pendingContracts = contracts.filter(c => c.status === "PENDING_SIGNATURE");

  const load = async () => {
    setIsLoading(true);
    try {
      const [cRes, aRes] = await Promise.allSettled([
        contractApi.getMyContracts(),
        appointmentApi.getMyAppointments(),
      ]);

      let loadedContracts: Contract[] = [];
      if (cRes.status === "fulfilled") {
        const d = (cRes.value as any)?.data;
        loadedContracts = Array.isArray(d) ? d : (Array.isArray(cRes.value) ? cRes.value as any : []);
        setContracts(loadedContracts);
      }
      if (aRes.status === "fulfilled") {
        const d = (aRes.value as any)?.data;
        setAppointments(Array.isArray(d) ? d : []);
      }

      // Lấy hóa đơn từ hợp đồng active
      const active = loadedContracts.find(c => c.status === "ACTIVE");
      if (active) {
        const bRes = await billApi.getBillsByContract(active.id);
        const bd = (bRes as any)?.data;
        setBills(Array.isArray(bd) ? bd : []);
      }
    } catch (e) {
      console.error(e);
      toast.error("Có lỗi khi tải dữ liệu.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    load();

    const handleRefresh = (e: any) => {
      console.log("🔄 [Realtime] Refreshing Tenant Dashboard...", e.detail);
      load();
    };

    window.addEventListener('app:refresh-data', handleRefresh);
    return () => window.removeEventListener('app:refresh-data', handleRefresh);
  }, []);

  const unpaidBills = bills.filter(b => b.status === "PENDING" || b.status === "LATE");
  const recentAppts = appointments.slice(0, 3);

  if (isLoading) {
    return (
      <div className="space-y-8 pb-10">
        <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
          <div className="space-y-2">
            <Skeleton className="h-9 w-56 rounded-lg" />
            <Skeleton className="h-4 w-72 max-w-full rounded-md" />
          </div>
          <Skeleton className="hidden h-10 w-36 rounded-lg sm:block" />
        </div>
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-[128px] rounded-2xl" />
          ))}
        </div>
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          <div className="space-y-3 lg:col-span-2">
            <Skeleton className="h-6 w-40 rounded-md" />
            <Skeleton className="h-36 w-full rounded-2xl" />
            <Skeleton className="h-36 w-full rounded-2xl" />
          </div>
          <div className="space-y-3">
            <Skeleton className="h-6 w-40 rounded-md" />
            <Skeleton className="h-24 w-full rounded-xl" />
            <Skeleton className="h-24 w-full rounded-xl" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8 pb-10">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-6 sm:p-8 bg-gradient-to-r from-card to-primary/5 border border-border/40 rounded-3xl shadow-soft">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-foreground">
            Xin chào, <span className="text-primary">{user?.fullName?.split(" ").pop() || "bạn"}</span> 👋
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Theo dõi phòng, hợp đồng, lịch hẹn và hóa đơn — tập trung vào việc cần làm tiếp theo.
          </p>
        </div>
        <Link to="/properties">
          <Button className="gap-2 bg-primary/10 text-primary hover:bg-primary hover:text-white shadow-none border border-primary/20 transition-all rounded-xl h-11 px-5">
            <Search className="h-4 w-4 stroke-[1.5]" /> Tìm phòng mới
          </Button>
        </Link>
      </div>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatKpiCard
          to={activeContract ? `/tenant/contracts/${activeContract.id}` : "/properties"}
          icon={<Home className="h-6 w-6 stroke-[1.5]" />}
          iconClassName="text-sky-600 bg-sky-500/10"
          label="Phòng đang thuê"
          value={activeContract ? "1 phòng" : "Chưa có"}
          description={activeContract?.roomName ? <span className="line-clamp-2">{activeContract.roomName}</span> : "Khám phá phòng phù hợp"}
        />
        <StatKpiCard
          to="/tenant/contracts"
          icon={<FileText className="h-6 w-6 stroke-[1.5]" />}
          iconClassName="text-violet-600 bg-violet-500/10"
          label="Hợp đồng chờ ký"
          value={pendingContracts.length}
          description={pendingContracts.length > 0 ? "Cần ký sớm" : "Không có"}
          className={pendingContracts.length > 0 ? "border-amber-300/50 ring-1 ring-amber-200/40" : ""}
        />
        <StatKpiCard
          to="/tenant/appointments"
          icon={<CalendarClock className="h-6 w-6 stroke-[1.5]" />}
          iconClassName="text-amber-600 bg-amber-500/10"
          label="Lịch hẹn đã duyệt"
          value={appointments.filter((a) => a.status === "CONFIRMED" || a.status === "APPROVED").length}
          description="Lịch xem phòng đã được chấp nhận"
        />
        <StatKpiCard
          to="/tenant/my-room"
          icon={<Receipt className="h-6 w-6 stroke-[1.5]" />}
          iconClassName={unpaidBills.length > 0 ? "text-red-600 bg-red-500/10" : "text-emerald-600 bg-emerald-500/10"}
          label="Hóa đơn chưa trả"
          value={unpaidBills.length}
          description={
            unpaidBills.length > 0
              ? fmt(unpaidBills.reduce((a, b) => a + b.totalAmount, 0))
              : "Đã thanh toán hết"
          }
          className={unpaidBills.length > 0 ? "border-red-200/80" : ""}
        />
      </div>

      {/* ── PHÒNG HIỆN TẠI CỦA TÔI ── */}
      {activeContract && (
        <div className="bg-gradient-to-br from-primary/5 via-blue-50/50 to-indigo-50/30 rounded-2xl border border-primary/15 p-6 shadow-sm hover:shadow-md transition-all">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-bold text-gray-800 flex items-center gap-2">
              <div className="p-2 bg-primary/10 rounded-xl">
                <DoorOpen className="h-5 w-5 text-primary" />
              </div>
              Phòng hiện tại của tôi
            </h2>
            <Link to={`/tenant/contracts/${activeContract.id}`}
              className="text-sm text-primary hover:underline flex items-center gap-1 font-medium">
              Xem hợp đồng <ExternalLink className="h-3.5 w-3.5" />
            </Link>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-[1fr_auto] gap-5">
            {/* Thông tin phòng */}
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <h3 className="text-xl font-extrabold text-gray-900">
                  {activeContract.roomName || `Phòng #${activeContract.roomId}`}
                </h3>
                <StatusBadge label="Đang thuê" tone="success" />
              </div>
              {activeContract.propertyAddress && (
                <p className="text-sm text-gray-500 flex items-center gap-1.5">
                  <MapPin className="h-4 w-4 text-gray-400" />
                  {activeContract.propertyAddress}
                </p>
              )}

              <div className="flex flex-wrap gap-3 mt-2">
                <div className="flex items-center gap-2 bg-white px-3 py-2 rounded-lg border text-sm">
                  <Banknote className="h-4 w-4 text-green-600" />
                  <span className="text-gray-500">Giá thuê:</span>
                  <span className="font-bold text-gray-900">{fmt(activeContract.actualPrice)}/tháng</span>
                </div>
                <div className="flex items-center gap-2 bg-white px-3 py-2 rounded-lg border text-sm">
                  <CalendarDays className="h-4 w-4 text-blue-600" />
                  <span className="text-gray-500">Thời hạn:</span>
                  <span className="font-bold text-gray-900">{fmtDate(activeContract.startDate)} → {fmtDate(activeContract.endDate)}</span>
                </div>
              </div>

              {/* Utility prices */}
              <div className="flex flex-wrap gap-2 mt-1">
                {activeContract.elecPrice != null && (
                  <span className="flex items-center gap-1.5 text-xs bg-yellow-50 text-yellow-700 px-2.5 py-1.5 rounded-lg border border-yellow-200">
                    <Zap className="h-3.5 w-3.5" /> Điện: {new Intl.NumberFormat('vi-VN').format(activeContract.elecPrice)}đ/kWh
                  </span>
                )}
                {activeContract.waterPrice != null && (
                  <span className="flex items-center gap-1.5 text-xs bg-cyan-50 text-cyan-700 px-2.5 py-1.5 rounded-lg border border-cyan-200">
                    <Droplets className="h-3.5 w-3.5" /> Nước: {new Intl.NumberFormat('vi-VN').format(activeContract.waterPrice)}đ/m³
                  </span>
                )}
                {activeContract.internetPrice != null && activeContract.internetPrice > 0 && (
                  <span className="flex items-center gap-1.5 text-xs bg-purple-50 text-purple-700 px-2.5 py-1.5 rounded-lg border border-purple-200">
                    <Wifi className="h-3.5 w-3.5" /> Internet: {new Intl.NumberFormat('vi-VN').format(activeContract.internetPrice)}đ/tháng
                  </span>
                )}
              </div>
            </div>

            {/* Chủ nhà */}
            <div className="flex flex-col items-end justify-center bg-white px-5 py-4 rounded-xl border min-w-[180px]">
              <p className="text-xs text-gray-400 uppercase font-bold mb-1">Chủ nhà</p>
              <p className="font-bold text-gray-900">{activeContract.landlordName || '—'}</p>
              <div className="flex items-center gap-1 mt-2">
                <ShieldCheck className="h-4 w-4 text-green-500" />
                <span className="text-xs text-green-600 font-medium">Đã xác minh</span>
              </div>
            </div>
          </div>

          {/* Cảnh báo hóa đơn chưa trả */}
          {unpaidBills.length > 0 && (
            <div className="mt-4 flex items-center gap-2 text-sm text-red-700 bg-red-50 px-4 py-3 rounded-xl border border-red-200">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span>Bạn có <strong>{unpaidBills.length} hóa đơn</strong> chưa thanh toán ({fmt(unpaidBills.reduce((a, b) => a + b.totalAmount, 0))})</span>
            </div>
          )}
        </div>
      )}

      {/* ── MAIN GRID ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* HỢP ĐỒNG HIỆN TẠI */}
        <div className="lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold text-gray-800 flex items-center gap-2">
              <FileText className="h-5 w-5 text-primary" /> Hợp đồng của tôi
            </h2>
            <Link to="/tenant/contracts" className="text-sm text-primary hover:underline flex items-center gap-1">
              Xem tất cả <ChevronRight className="h-4 w-4" />
            </Link>
          </div>

          {contracts.length === 0 ? (
            <EmptyState
              icon={FileText}
              title="Bạn chưa có hợp đồng nào"
              description="Tìm phòng và đặt lịch xem để bắt đầu — chúng tôi giữ mọi thứ gọn ở đây."
              action={
                <Link to="/properties">
                  <Button className="gap-2 shadow-soft">
                    <Search className="h-4 w-4" /> Tìm phòng ngay
                  </Button>
                </Link>
              }
            />
          ) : (
            <div className="space-y-3">
              {contracts.slice(0, 4).map(c => (
                <Link key={c.id} to={`/tenant/contracts/${c.id}`}
                  className="block bg-white rounded-2xl border p-5 hover:shadow-lg transition-all hover:border-primary/50 hover:-translate-y-1 active:scale-[0.98] group">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1 flex-wrap">
                        <p className="font-bold text-gray-900 group-hover:text-primary transition-colors">
                          {c.roomName || "Phòng " + c.roomId}
                        </p>
                        <ContractStatusBadge status={c.status} />
                      </div>
                      {c.propertyAddress && (
                        <p className="text-xs text-gray-400 flex items-center gap-1 mb-2">
                          <MapPin className="h-3 w-3" />{c.propertyAddress}
                        </p>
                      )}
                      <div className="flex flex-wrap gap-4 text-xs text-gray-500">
                        <span className="flex items-center gap-1">
                          <CalendarDays className="h-3.5 w-3.5" />
                          {fmtDate(c.startDate)} → {fmtDate(c.endDate)}
                        </span>
                        <span className="flex items-center gap-1 font-semibold text-primary">
                          <Banknote className="h-3.5 w-3.5" />
                          {fmt(c.actualPrice)}/tháng
                        </span>
                      </div>
                    </div>
                    <ChevronRight className="h-5 w-5 text-gray-300 group-hover:text-primary group-hover:translate-x-1.5 transition-all shrink-0 mt-1" />
                  </div>

                  {/* Cảnh báo chờ ký */}
                  {c.status === "PENDING_SIGNATURE" && (
                    <div className="mt-3 flex items-center gap-2 text-xs text-yellow-800 bg-yellow-50 px-3 py-2 rounded-lg border border-yellow-300 shadow-sm animate-pulse relative overflow-hidden">
                      <div className="absolute inset-0 bg-gradient-to-r from-yellow-200/0 via-yellow-200/40 to-yellow-200/0 animate-[shimmer_2s_infinite] -translate-x-[100%]" />
                      <AlertCircle className="h-4 w-4 shrink-0 text-yellow-600" />
                      Hợp đồng đang chờ chữ ký của bạn — nhấn vào đây để xem và ký ngay!
                    </div>
                  )}
                </Link>
              ))}
            </div>
          )}

          {/* HÓA ĐƠN GẦN ĐÂY */}
          {bills.length > 0 && (
            <div className="mt-2">
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-lg font-bold text-gray-800 flex items-center gap-2">
                  <Receipt className="h-5 w-5 text-primary" /> Hóa đơn gần đây
                </h2>
              </div>
              <div className="bg-white rounded-2xl border overflow-hidden shadow-sm">
                <table className="w-full text-sm">
                  <thead className="bg-muted/40 border-b">
                    <tr>
                      <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Tháng</th>
                      <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Phòng</th>
                      <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Tổng tiền</th>
                      <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Trạng thái</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {bills.slice(0, 5).map(b => (
                      <tr key={b.id} className="hover:bg-muted/40 transition-colors">
                        <td className="px-4 py-3 font-medium text-gray-700">T{b.month}/{b.year}</td>
                        <td className="px-4 py-3 text-gray-500 truncate max-w-[120px]">{b.roomName}</td>
                        <td className="px-4 py-3 text-right font-semibold text-gray-900">{fmt(b.totalAmount)}</td>
                        <td className="px-4 py-3 text-right"><BillStatusBadge status={b.status} /></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>

        {/* CỘT PHẢI */}
        <div className="space-y-4">

          {/* LỊCH HẸN */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-base font-bold text-gray-800 flex items-center gap-2">
                <CalendarClock className="h-4 w-4 text-primary" /> Lịch hẹn xem phòng
              </h2>
              <Link to="/tenant/appointments" className="text-xs text-primary hover:underline">Xem tất cả</Link>
            </div>

            {recentAppts.length === 0 ? (
              <div className="bg-white rounded-2xl border border-dashed p-6 text-center">
                <CalendarClock className="h-8 w-8 text-gray-300 mx-auto mb-2" />
                <p className="text-sm text-gray-500">Chưa có lịch hẹn nào</p>
                <Link to="/properties">
                  <Button variant="outline" size="sm" className="mt-3 gap-1 text-xs">
                    <Search className="h-3 w-3" /> Tìm phòng & đặt lịch
                  </Button>
                </Link>
              </div>
            ) : (
              <div className="space-y-3">
                {recentAppts.map(a => (
                  <div key={a.id} className="bg-white rounded-xl border p-4 hover:shadow-md hover:-translate-y-0.5 hover:border-primary/30 active:scale-[0.98] transition-all cursor-pointer">
                    <div className="flex items-start justify-between gap-2 mb-1.5">
                      <p className="font-semibold text-gray-800 text-sm">{a.roomName}</p>
                      <AppointmentStatusBadge status={a.status} />
                    </div>
                    <p className="text-xs text-gray-500 flex items-center gap-1">
                      <CalendarDays className="h-3 w-3" />
                      {new Date(a.meetTime).toLocaleString("vi-VN", { dateStyle: "short", timeStyle: "short" })}
                    </p>
                    {a.landlordFullName && (
                      <p className="text-xs text-gray-400 mt-1">Chủ nhà: {a.landlordFullName}</p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* QUICK LINKS */}
          <div className="bg-white rounded-2xl border p-5 space-y-2 shadow-sm">
            <p className="text-sm font-bold text-gray-700 mb-3">Truy cập nhanh</p>
            {[
              { to: "/properties", icon: <Search className="h-4 w-4" />, label: "Tìm phòng trọ" },
              { to: "/tenant/contracts", icon: <FileText className="h-4 w-4" />, label: "Hợp đồng của tôi" },
              { to: "/tenant/appointments", icon: <CalendarClock className="h-4 w-4" />, label: "Lịch hẹn xem phòng" },
            ].map(item => (
              <Link key={item.to} to={item.to}
                className="flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-muted/40 transition-all text-gray-600 hover:text-primary hover:shadow-sm hover:border-gray-100 border border-transparent active:scale-[0.98] group">
                <span className="text-gray-400 group-hover:text-primary group-hover:scale-110 transition-all">{item.icon}</span>
                <span className="text-sm font-medium">{item.label}</span>
                <ChevronRight className="h-4 w-4 ml-auto text-gray-300 group-hover:text-primary group-hover:translate-x-1 transition-all" />
              </Link>
            ))}
          </div>

          {/* AI TƯ VẤN */}
          <button
            className="w-full bg-gradient-to-br from-primary/10 to-blue-50 border border-primary/20 rounded-2xl p-5 text-left hover:shadow-md transition-all group"
            onClick={() => window.dispatchEvent(new CustomEvent("openAiChat", {
              detail: { question: "Tư vấn cho mình về việc thuê phòng tại Việt Nam: cần lưu ý gì khi ký hợp đồng và quyền lợi của người thuê?" }
            }))}
          >
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 bg-primary/10 rounded-xl">
                <Bot className="h-5 w-5 text-primary" />
              </div>
              <p className="font-bold text-gray-900 group-hover:text-primary transition-colors text-sm">Hỏi AI tư vấn</p>
            </div>
            <p className="text-xs text-gray-500 leading-relaxed">
              Nhờ AI giải đáp thắc mắc về hợp đồng, quyền lợi người thuê, hoặc phân tích khu vực tốt nhất.
            </p>
          </button>

          {/* ĐÁNH GIÁ */}
          {activeContract && (
            <div className="bg-amber-50 border border-amber-100 rounded-2xl p-5">
              <p className="text-sm font-bold text-amber-800 flex items-center gap-2 mb-1">
                <Star className="h-4 w-4 fill-amber-500 text-amber-500" /> Chia sẻ trải nghiệm
              </p>
              <p className="text-xs text-amber-700 mb-3">Bạn có thể đánh giá chủ nhà và phòng trọ sau khi kết thúc hợp đồng.</p>
              <Link to={`/tenant/contracts/${activeContract.id}`}>
                <Button size="sm" variant="outline" className="text-amber-700 border-amber-300 hover:bg-amber-100 text-xs w-full">
                  Xem hợp đồng & đánh giá
                </Button>
              </Link>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

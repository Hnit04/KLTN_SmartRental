import { useEffect, useState } from "react";
import type { ReactNode } from "react";
import { Link } from "react-router-dom";
import {
  Home, FileText, CalendarClock, Receipt, CheckCircle,
  Clock, XCircle, AlertCircle, MapPin, Loader2,
  ChevronRight, Search, CalendarDays, Banknote, Star, Bot
} from "lucide-react";
import { contractApi } from "@/api/contractApi";
import { appointmentApi } from "@/api/appointmentApi";
import { billApi } from "@/api/billApi";
import { useAuth } from "@/context/AuthContext";
import type { Contract, AppointmentResponse, Bill } from "@/types/index";
import { Button } from "@/components/ui/Button";
import { toast } from "sonner";

// ---- HELPER ----
const fmt = (n: number) => new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND" }).format(n);
const fmtDate = (s: string) => new Date(s).toLocaleDateString("vi-VN", { day: "2-digit", month: "2-digit", year: "numeric" });

const ContractStatusBadge = ({ status }: { status: string }) => {
  const map: Record<string, { label: string; cls: string }> = {
    ACTIVE:            { label: "Đang thuê",      cls: "bg-green-100 text-green-700 border-green-200" },
    PENDING_SIGNATURE: { label: "Chờ ký",          cls: "bg-yellow-100 text-yellow-700 border-yellow-200" },
    EXPIRED:           { label: "Hết hạn",         cls: "bg-gray-100 text-gray-500 border-gray-200" },
    CANCELLED:         { label: "Đã hủy",          cls: "bg-red-100 text-red-600 border-red-200" },
  };
  const { label, cls } = map[status] ?? { label: status, cls: "bg-gray-100 text-gray-500 border-gray-200" };
  return <span className={`text-xs font-bold px-2.5 py-1 rounded-full border ${cls}`}>{label}</span>;
};

const AppointmentStatusBadge = ({ status }: { status: string }) => {
  const map: Record<string, { label: string; icon: ReactNode; cls: string }> = {
    PENDING:   { label: "Chờ duyệt", icon: <Clock className="h-3 w-3" />,        cls: "text-yellow-700 bg-yellow-50 border-yellow-200" },
    CONFIRMED: { label: "Đã duyệt",  icon: <CheckCircle className="h-3 w-3" />,  cls: "text-green-700 bg-green-50 border-green-200" },
    APPROVED:  { label: "Đã duyệt",  icon: <CheckCircle className="h-3 w-3" />,  cls: "text-green-700 bg-green-50 border-green-200" },
    CANCELLED: { label: "Đã hủy",    icon: <XCircle className="h-3 w-3" />,      cls: "text-red-600 bg-red-50 border-red-200" },
    COMPLETED: { label: "Hoàn thành",icon: <CheckCircle className="h-3 w-3" />,  cls: "text-blue-700 bg-blue-50 border-blue-200" },
  };
  const { label, icon, cls } = map[status] ?? { label: status, icon: <Clock className="h-3 w-3" />, cls: "text-gray-500 bg-gray-50 border-gray-200" };
  return <span className={`text-xs font-bold px-2.5 py-1 rounded-full border flex items-center gap-1 w-fit ${cls}`}>{icon}{label}</span>;
};

const BillStatusBadge = ({ status }: { status: string }) => {
  const map: Record<string, { label: string; cls: string }> = {
    PAID:    { label: "Đã thanh toán", cls: "text-green-700 bg-green-50 border-green-200" },
    PENDING: { label: "Chờ thanh toán",cls: "text-yellow-700 bg-yellow-50 border-yellow-200" },
    LATE:    { label: "Quá hạn",       cls: "text-red-600 bg-red-50 border-red-200" },
    UNBILLED:{ label: "Chưa xuất",     cls: "text-gray-500 bg-gray-50 border-gray-200" },
  };
  const { label, cls } = map[status] ?? { label: status, cls: "text-gray-500 bg-gray-50 border-gray-200" };
  return <span className={`text-xs font-bold px-2.5 py-1 rounded-full border ${cls}`}>{label}</span>;
};

// ---- MAIN COMPONENT ----
export default function TenantDashboardPage() {
  const { user } = useAuth();

  const [contracts, setContracts]       = useState<Contract[]>([]);
  const [appointments, setAppointments] = useState<AppointmentResponse[]>([]);
  const [bills, setBills]               = useState<Bill[]>([]);
  const [isLoading, setIsLoading]       = useState(true);

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

  if (isLoading) return (
    <div className="space-y-6 pb-10">
      {/* Skeleton Header */}
      <div className="flex justify-between items-center animate-pulse">
         <div className="space-y-2">
            <div className="h-8 w-64 bg-gray-200 rounded" />
            <div className="h-4 w-48 bg-gray-200 rounded" />
         </div>
         <div className="h-10 w-32 bg-gray-200 rounded-md block hidden sm:block" />
      </div>
      {/* Skeleton Stat Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[1, 2, 3, 4].map(i => (
          <div key={i} className="h-[120px] bg-white rounded-2xl border p-5 shadow-sm animate-pulse">
            <div className="w-10 h-10 bg-gray-200 rounded-xl mb-3" />
            <div className="h-3 w-20 bg-gray-200 rounded mb-3" />
            <div className="h-6 w-16 bg-gray-200 rounded" />
          </div>
        ))}
      </div>
      {/* Skeleton Content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
         <div className="lg:col-span-2 space-y-4">
             <div className="h-6 w-40 bg-gray-200 rounded mb-2 animate-pulse" />
             {[1, 2].map(i => <div key={i} className="h-32 w-full bg-white rounded-2xl border animate-pulse" />)}
         </div>
         <div className="space-y-4">
             <div className="h-6 w-40 bg-gray-200 rounded mb-2 animate-pulse" />
             {[1, 2, 3].map(i => <div key={i} className="h-20 w-full bg-white rounded-xl border animate-pulse" />)}
         </div>
      </div>
    </div>
  );

  return (
    <div className="space-y-6 pb-10">

      {/* ── HEADER ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            Xin chào, {user?.fullName?.split(" ").pop() || "bạn"} 👋
          </h1>
          <p className="text-muted-foreground mt-0.5">Quản lý việc thuê phòng của bạn tại đây.</p>
        </div>
        <Link to="/properties">
          <Button className="gap-2">
            <Search className="h-4 w-4" /> Tìm phòng mới
          </Button>
        </Link>
      </div>

      {/* ── STAT CARDS ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          {
            icon: <Home className="h-5 w-5 text-blue-600" />,
            bg: "bg-blue-50",
            label: "Phòng đang thuê",
            value: activeContract ? "1 phòng" : "Chưa có",
            sub: activeContract?.roomName,
          },
          {
            icon: <FileText className="h-5 w-5 text-purple-600" />,
            bg: "bg-purple-50",
            label: "Hợp đồng chờ ký",
            value: pendingContracts.length,
            sub: pendingContracts.length > 0 ? "Cần ký sớm" : "Không có",
            alert: pendingContracts.length > 0,
          },
          {
            icon: <CalendarClock className="h-5 w-5 text-orange-600" />,
            bg: "bg-orange-50",
            label: "Lịch hẹn sắp tới",
            value: appointments.filter(a => a.status === "CONFIRMED" || a.status === "APPROVED").length,
            sub: "Đã được duyệt",
          },
          {
            icon: <Receipt className="h-5 w-5 text-red-600" />,
            bg: "bg-red-50",
            label: "Hóa đơn chưa trả",
            value: unpaidBills.length,
            sub: unpaidBills.length > 0 ? `${fmt(unpaidBills.reduce((a, b) => a + b.totalAmount, 0))}` : "Đã thanh toán hết",
            alert: unpaidBills.length > 0,
          },
        ].map((s, i) => (
          <div key={i} className="bg-white rounded-2xl border p-5 shadow-sm hover:shadow-md transition-shadow">
            <div className={`w-10 h-10 rounded-xl ${s.bg} flex items-center justify-center mb-3`}>{s.icon}</div>
            <p className="text-xs text-gray-500 font-medium">{s.label}</p>
            <p className={`text-2xl font-extrabold mt-1 ${s.alert ? "text-red-600" : "text-gray-900"}`}>
              {s.value}
            </p>
            {s.sub && <p className="text-xs text-gray-400 mt-0.5 truncate">{s.sub}</p>}
          </div>
        ))}
      </div>

      {/* ── MAIN GRID ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* HỢP ĐỒNG HIỆN TẠI */}
        <div className="lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold text-gray-800 flex items-center gap-2">
              <FileText className="h-5 w-5 text-primary" /> Hợp đồng của tôi
            </h2>
            <Link to="/contracts" className="text-sm text-primary hover:underline flex items-center gap-1">
              Xem tất cả <ChevronRight className="h-4 w-4" />
            </Link>
          </div>

          {contracts.length === 0 ? (
            <div className="bg-white rounded-2xl border border-dashed p-10 text-center">
              <FileText className="h-10 w-10 text-gray-300 mx-auto mb-3" />
              <p className="text-gray-600 font-medium">Bạn chưa có hợp đồng nào</p>
              <p className="text-sm text-gray-400 mt-1">Tìm phòng và đặt lịch xem để bắt đầu nhé!</p>
              <Link to="/properties"><Button className="mt-4 gap-2"><Search className="h-4 w-4" />Tìm phòng ngay</Button></Link>
            </div>
          ) : (
            <div className="space-y-3">
              {contracts.slice(0, 4).map(c => (
                <Link key={c.id} to={`/contracts/${c.id}`}
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
                  <thead className="bg-gray-50 border-b">
                    <tr>
                      <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Tháng</th>
                      <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Phòng</th>
                      <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Tổng tiền</th>
                      <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Trạng thái</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {bills.slice(0, 5).map(b => (
                      <tr key={b.id} className="hover:bg-gray-50 transition-colors">
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
              <Link to="/appointments" className="text-xs text-primary hover:underline">Xem tất cả</Link>
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
              { to: "/contracts", icon: <FileText className="h-4 w-4" />, label: "Hợp đồng của tôi" },
              { to: "/appointments", icon: <CalendarClock className="h-4 w-4" />, label: "Lịch hẹn xem phòng" },
            ].map(item => (
              <Link key={item.to} to={item.to}
                className="flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-gray-50 transition-all text-gray-600 hover:text-primary hover:shadow-sm hover:border-gray-100 border border-transparent active:scale-[0.98] group">
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
              <Link to={`/contracts/${activeContract.id}`}>
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

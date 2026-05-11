import type { ReactNode } from 'react';
import { useQuery } from '@tanstack/react-query';
import { userApi } from '@/api/userApi';
import { propertyApi } from '@/api/propertyApi';
import { contractApi } from '@/api/contractApi';
import { adminApi } from '@/api/adminApi';
import {
  Users,
  Building,
  ShieldCheck,
  FileText,
  ChevronRight,
  Search,
  LayoutDashboard,
  ArrowRightLeft,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { cn } from '@/utils/cn';
import { PageHeader } from '@/components/ui/PageHeader';
import { Input } from '@/components/ui/Input';
import { Skeleton } from '@/components/ui/Skeleton';
import { StatKpiCard, DashboardPanel } from '@/components/dashboard';

export default function SystemAdminDashboard() {
  const { data: tenants = [], isLoading: tenantsLoading } = useQuery({
    queryKey: ['users', 'TENANT'],
    queryFn: () => userApi.getUsersByRole('TENANT'),
  });

  const { data: landlords = [], isLoading: landlordsLoading } = useQuery({
    queryKey: ['users', 'LANDLORD'],
    queryFn: () => userApi.getUsersByRole('LANDLORD'),
  });

  const { data: pendingProperties = [], isLoading: propsLoading } = useQuery({
    queryKey: ['properties', 'pending'],
    queryFn: async () => {
      const res = await propertyApi.getPendingProperties();
      return (res as any).data || res;
    },
  });

  const { data: pendingRooms = [], isLoading: roomsLoading } = useQuery({
    queryKey: ['rooms', 'pending'],
    queryFn: async () => {
      const res = await propertyApi.getPendingRooms();
      return (res as any).data || res;
    },
  });

  const { data: allContracts = [], isLoading: contractsLoading } = useQuery({
    queryKey: ['contracts', 'all'],
    queryFn: async () => {
      const res = await contractApi.getAll();
      return (res as any).data || res;
    },
  });

  const { data: pendingSettlements = [], isLoading: settlementsLoading } = useQuery({
    queryKey: ['admin', 'settlements'],
    queryFn: async () => {
      const res = await adminApi.getPendingSettlements();
      return (res as any).data || res;
    },
  });

  const isLoading =
    tenantsLoading ||
    landlordsLoading ||
    propsLoading ||
    roomsLoading ||
    contractsLoading ||
    settlementsLoading;

  const totalUsers = tenants.length + landlords.length;
  const pendingKYC = [...tenants, ...landlords].filter((u) => u.kycStatus === 'PENDING').length;
  const pendingApprovals = pendingProperties.length + pendingRooms.length;
  const activeContracts = (allContracts as any[]).filter((c) => c.status === 'ACTIVE').length;

  const systemStats: {
    title: string;
    value: number;
    badge: string;
    icon: ReactNode;
    iconClassName: string;
    link: string;
    badgeTone: 'warning' | 'neutral';
  }[] = [
    {
      title: 'Tổng người dùng',
      value: totalUsers,
      badge: `+${tenants.length} khách · ${landlords.length} chủ`,
      icon: <Users className="h-5 w-5" />,
      iconClassName: 'text-indigo-600',
      link: '/admin/users',
      badgeTone: 'neutral',
    },
    {
      title: 'Tin đăng chờ duyệt',
      value: pendingApprovals,
      badge: `${pendingProperties.length} khu · ${pendingRooms.length} phòng`,
      icon: <Building className="h-5 w-5" />,
      iconClassName: 'text-amber-600',
      link: '/admin/approvals',
      badgeTone: pendingApprovals > 0 ? 'warning' : 'neutral',
    },
    {
      title: 'Định danh chờ duyệt',
      value: pendingKYC,
      badge: 'KYC thủ công',
      icon: <ShieldCheck className="h-5 w-5" />,
      iconClassName: 'text-emerald-600',
      link: '/admin/users',
      badgeTone: pendingKYC > 0 ? 'warning' : 'neutral',
    },
    {
      title: 'Hợp đồng hiệu lực',
      value: activeContracts,
      badge: `${(allContracts as any[]).length} tổng số`,
      icon: <FileText className="h-5 w-5" />,
      iconClassName: 'text-sky-600',
      link: '/admin/blockchain-logs',
      badgeTone: 'neutral',
    },
    {
      title: 'Cần đối soát',
      value: pendingSettlements.length,
      badge: `${pendingSettlements.length} chủ trọ`,
      icon: <ArrowRightLeft className="h-5 w-5" />,
      iconClassName: 'text-violet-600',
      link: '/admin/settlements',
      badgeTone: pendingSettlements.length > 0 ? 'warning' : 'neutral',
    },
  ];

  const recentLandlords = [...landlords].sort((a, b) => b.id - a.id).slice(0, 5);

  if (isLoading) {
    return (
      <div className="space-y-8 pb-10">
        <div className="space-y-2">
          <Skeleton className="h-9 w-72 rounded-lg" />
          <Skeleton className="h-4 w-96 max-w-full rounded-md" />
        </div>
        <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-5">
          {[1, 2, 3, 4, 5].map((i) => (
            <Skeleton key={i} className="h-[140px] rounded-2xl" />
          ))}
        </div>
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          <Skeleton className="h-[320px] rounded-2xl lg:col-span-2" />
          <Skeleton className="h-[320px] rounded-2xl" />
        </div>
        <p className="text-center text-xs font-medium text-muted-foreground">Đang tải dữ liệu hệ thống…</p>
      </div>
    );
  }

  return (
    <div className="space-y-8 pb-10">
      <PageHeader
        title="Quản trị hệ thống"
        description="Tổng quan vận hành, kiểm duyệt và rủi ro — một màn hình để nắm tình hình nhanh."
        actions={
          <div className="relative w-full min-w-0 sm:w-64">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              type="search"
              placeholder="Tìm kiếm nhanh…"
              className="pl-9"
              aria-label="Tìm kiếm nhanh (giao diện)"
              readOnly
            />
          </div>
        }
      />

      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-5">
        {systemStats.map((s, i) => (
          <StatKpiCard
            key={i}
            to={s.link}
            icon={s.icon}
            iconClassName={s.iconClassName}
            label={s.title}
            value={s.value}
            badge={
              <span
                className={cn(
                  'rounded-md px-2 py-1 text-[10px] font-semibold leading-tight',
                  s.badgeTone === 'warning'
                    ? 'bg-amber-500/15 text-amber-950'
                    : 'bg-muted text-muted-foreground'
                )}
              >
                {s.badge}
              </span>
            }
          />
        ))}
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="min-w-0 lg:col-span-2">
          <DashboardPanel
            title="Chủ trọ mới gia nhập"
            description="Theo thứ tự đăng ký gần nhất"
            action={
              <Link
                to="/admin/users"
                className="inline-flex items-center gap-1 text-sm font-semibold text-primary transition-colors hover:gap-1.5"
              >
                Quản lý user <ChevronRight className="h-4 w-4" />
              </Link>
            }
          >
            <div className="overflow-x-auto">
              <table className="w-full min-w-[520px] text-left text-sm">
                <thead className="border-b border-border/60 bg-muted/35 text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                  <tr>
                    <th className="px-5 py-3.5">Họ và tên</th>
                    <th className="px-5 py-3.5">Liên hệ</th>
                    <th className="px-5 py-3.5">KYC</th>
                    <th className="px-5 py-3.5">Uy tín</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/60">
                  {recentLandlords.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="px-5 py-10 text-center text-sm italic text-muted-foreground">
                        Chưa có chủ trọ nào
                      </td>
                    </tr>
                  ) : (
                    recentLandlords.map((m, i) => (
                      <tr key={i} className="transition-colors hover:bg-muted/25">
                        <td className="px-5 py-4">
                          <div className="font-semibold text-foreground">{m.fullName || m.username}</div>
                          <div className="text-[10px] text-muted-foreground">ID #{m.id}</div>
                        </td>
                        <td className="px-5 py-4">
                          <div className="text-foreground/90">{m.phoneNumber || '—'}</div>
                          <div className="text-xs text-primary">{m.email}</div>
                        </td>
                        <td className="px-5 py-4">
                          <span
                            className={`inline-flex rounded-md border px-2 py-0.5 text-[10px] font-bold uppercase ${
                              m.kycStatus === 'VERIFIED'
                                ? 'border-emerald-200 bg-emerald-50 text-emerald-800'
                                : m.kycStatus === 'PENDING'
                                  ? 'border-amber-200 bg-amber-50 text-amber-900'
                                  : 'border-border bg-muted/50 text-muted-foreground'
                            }`}
                          >
                            {m.kycStatus || 'Chưa nộp'}
                          </span>
                        </td>
                        <td className="px-5 py-4">
                          <span
                            className={`text-sm font-bold tabular-nums ${
                              (m.reputationScore ?? 0) >= 80 ? 'text-emerald-600' : 'text-amber-600'
                            }`}
                          >
                            {m.reputationScore ?? 0}/100
                          </span>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </DashboardPanel>
        </div>

        <div className="space-y-5">
          <DashboardPanel title="Việc cần xử lý" description="Ưu tiên kiểm duyệt và tài chính">
            <div className="space-y-3 p-4 sm:p-5">
              <div className="rounded-xl border border-amber-200/80 bg-amber-50/90 p-4">
                <p className="text-[10px] font-bold uppercase tracking-wider text-amber-900">Tin đăng chờ duyệt</p>
                <p className="mt-1 text-sm text-amber-900/95">
                  Có <span className="text-lg font-bold">{pendingApprovals}</span> mục đang chờ phê duyệt.
                </p>
                <Link
                  to="/admin/approvals"
                  className="mt-3 inline-flex text-xs font-bold text-amber-950 underline-offset-2 hover:underline"
                >
                  Đến trang phê duyệt →
                </Link>
              </div>
              <div className="rounded-xl border border-primary/20 bg-primary/[0.06] p-4">
                <p className="text-[10px] font-bold uppercase tracking-wider text-primary">Xác thực danh tính</p>
                <p className="mt-1 text-sm text-foreground/90">
                  <span className="text-lg font-bold text-primary">{pendingKYC}</span> hồ sơ KYC chờ kiểm tra.
                </p>
                <Link
                  to="/admin/users"
                  className="mt-3 inline-flex text-xs font-bold text-primary underline-offset-2 hover:underline"
                >
                  Kiểm tra ngay →
                </Link>
              </div>
              {pendingSettlements.length > 0 && (
                <div className="rounded-xl border border-violet-200/80 bg-violet-50/90 p-4">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-violet-900">Quyết toán tài chính</p>
                  <p className="mt-1 text-sm text-violet-900/95">
                    <span className="text-lg font-bold">{pendingSettlements.length}</span> khoản thu hộ cần chuyển trả.
                  </p>
                  <Link
                    to="/admin/settlements"
                    className="mt-3 inline-flex text-xs font-bold text-violet-950 underline-offset-2 hover:underline"
                  >
                    Quyết toán ngay →
                  </Link>
                </div>
              )}
            </div>
          </DashboardPanel>

          <div className="rounded-2xl border border-primary/25 bg-primary p-5 text-primary-foreground shadow-card sm:p-6">
            <div className="mb-1 flex items-center gap-2">
              <LayoutDashboard className="h-5 w-5 opacity-90" />
              <h3 className="text-base font-bold">Bảo mật & Blockchain</h3>
            </div>
            <p className="text-sm leading-relaxed text-primary-foreground/90">
              Giám sát tính toàn vẹn hợp đồng qua smart contract (mạng thử nghiệm).
            </p>
            <Link
              to="/admin/blockchain-logs"
              className="mt-4 inline-flex items-center gap-2 rounded-lg bg-primary-foreground/15 px-4 py-2.5 text-sm font-semibold transition-colors hover:bg-primary-foreground/25"
            >
              Xem logs <ChevronRight className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

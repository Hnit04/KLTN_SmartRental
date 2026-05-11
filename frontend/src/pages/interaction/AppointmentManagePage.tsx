import { useState, useEffect, useMemo } from 'react';
import {
  Calendar,
  Clock,
  MapPin,
  User,
  Video,
  CheckCircle2,
  XCircle,
  MessageSquare,
  Search,
  Loader2,
  FileText,
  X,
  AlertTriangle,
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { PageHeader } from '@/components/ui/PageHeader';
import { StatKpiCard } from '@/components/dashboard';
import { SegmentedControl, type SegmentItem } from '@/components/ui/SegmentedControl';
import { TableShell } from '@/components/ui/TableShell';
import { EmptyState } from '@/components/ui/EmptyState';
import { Skeleton } from '@/components/ui/Skeleton';
import StatusBadge from '@/components/shared/StatusBadge';
import { toast } from 'sonner';
import { appointmentApi } from '@/api/appointmentApi';
import type { AppointmentResponse } from '@/types';
import { useAuth } from '@/context/AuthContext';
import { AttentionBanner } from '@/components/detail';

export default function AppointmentManagePage() {
  const { user } = useAuth();

  const [appointments, setAppointments] = useState<AppointmentResponse[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const [searchTerm, setSearchTerm] = useState('');

  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [viewingApt, setViewingApt] = useState<AppointmentResponse | null>(null);

  const [filterStatus, setFilterStatus] = useState<'ALL' | 'PENDING' | 'CONFIRMED' | 'CANCELLED'>('ALL');

  const fetchAppointments = async () => {
    if (!user) return;
    try {
      setIsLoading(true);
      let res;

      if (user.role === 'LANDLORD') {
        res = await appointmentApi.getAllByLandlord();
      } else {
        res = await appointmentApi.getMyAppointments();
      }

      let data = (res as any)?.data !== undefined ? (res as any).data : res;
      if (!Array.isArray(data)) data = [];
      setAppointments(data);
    } catch (error) {
      toast.error('Không thể tải danh sách lịch hẹn!');
      setAppointments([]);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchAppointments();

    const handleRefresh = (e: any) => {
      console.log('🔄 [Realtime] Refreshing Appointments...', e.detail);
      fetchAppointments();
    };

    window.addEventListener('app:refresh-data', handleRefresh);
    return () => window.removeEventListener('app:refresh-data', handleRefresh);
  }, [user]);

  const handleUpdateStatus = async (id: number, status: 'CONFIRMED' | 'CANCELLED') => {
    try {
      await appointmentApi.updateStatus(id, status);
      toast.success(status === 'CONFIRMED' ? 'Đã xác nhận lịch hẹn!' : 'Đã từ chối lịch hẹn!');

      fetchAppointments();
      if (isDetailModalOpen) setIsDetailModalOpen(false);
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Có lỗi xảy ra, vui lòng thử lại!');
    }
  };

  const openDetailModal = (apt: AppointmentResponse) => {
    setViewingApt(apt);
    setIsDetailModalOpen(true);
  };

  const filteredAppointments = useMemo(() => {
    return appointments.filter((apt) => {
      const searchLower = searchTerm.toLowerCase();
      const matchSearch =
        apt.roomName?.toLowerCase().includes(searchLower) ||
        apt.tenantFullName?.toLowerCase().includes(searchLower) ||
        apt.landlordFullName?.toLowerCase().includes(searchLower) ||
        apt.tenantPhone?.includes(searchTerm);
      const matchStatus = filterStatus === 'ALL' || apt.status === filterStatus;
      return matchSearch && matchStatus;
    });
  }, [appointments, searchTerm, filterStatus]);

  const pendingCount = appointments.filter((a) => a.status === 'PENDING').length;
  const confirmedCount = appointments.filter((a) => a.status === 'CONFIRMED').length;
  const rejectedCount = appointments.filter((a) => a.status === 'CANCELLED').length;
  const totalCount = appointments.length;

  const filterItems: SegmentItem[] = [
    { id: 'ALL', label: 'Tất cả', badge: <span className="tabular-nums text-muted-foreground">{totalCount}</span> },
    { id: 'PENDING', label: 'Chờ duyệt', badge: <span className="tabular-nums text-amber-700">{pendingCount}</span> },
    { id: 'CONFIRMED', label: 'Đã chốt', badge: <span className="tabular-nums text-emerald-700">{confirmedCount}</span> },
    { id: 'CANCELLED', label: 'Đã hủy', badge: <span className="tabular-nums text-muted-foreground">{rejectedCount}</span> },
  ];

  const sortedAppointments = useMemo(() => {
    const list = [...filteredAppointments];
    const now = Date.now();
    const rank = (a: AppointmentResponse) => {
      const t = new Date(a.meetTime || 0).getTime();
      if (a.status === 'PENDING') {
        if (t < now) return 10_000_000_000 + t;
        return 20_000_000_000 + t;
      }
      if (a.status === 'CONFIRMED') return 30_000_000_000 + t;
      return 90_000_000_000 - t;
    };
    list.sort((a, b) => rank(a) - rank(b));
    return list;
  }, [filteredAppointments]);

  const urgentPendingCount = useMemo(() => {
    const now = Date.now();
    const horizon = now + 48 * 3600000;
    return filteredAppointments.filter(
      (a) =>
        a.status === 'PENDING' &&
        a.meetTime &&
        new Date(a.meetTime).getTime() >= now &&
        new Date(a.meetTime).getTime() <= horizon
    ).length;
  }, [filteredAppointments]);

  const overduePendingCount = useMemo(() => {
    const now = Date.now();
    return filteredAppointments.filter(
      (a) => a.status === 'PENDING' && a.meetTime && new Date(a.meetTime).getTime() < now
    ).length;
  }, [filteredAppointments]);

  return (
    <div className="mx-auto min-w-0 max-w-[1200px] space-y-6 pb-24">
      <PageHeader
        title={user?.role === 'LANDLORD' ? 'Quản lý lịch hẹn' : 'Lịch xem phòng của bạn'}
        description={
          user?.role === 'LANDLORD'
            ? 'Ưu tiên phản hồi lịch chờ — khách đang chờ xác nhận để sắp xếp thời gian xem phòng.'
            : 'Theo dõi trạng thái từng yêu cầu và thông tin chủ nhà.'
        }
        actions={
          <Button type="button" variant="outline" className="min-h-11 gap-2" onClick={() => fetchAppointments()} disabled={isLoading}>
            {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Clock className="h-4 w-4" />}
            Làm mới
          </Button>
        }
      />

      {user?.role === 'LANDLORD' && (urgentPendingCount > 0 || overduePendingCount > 0) ? (
        <AttentionBanner
          tone={overduePendingCount > 0 ? 'danger' : 'warning'}
          icon={AlertTriangle}
          title={
            overduePendingCount > 0
              ? `${overduePendingCount} lịch chờ duyệt đã quá giờ hẹn`
              : `${urgentPendingCount} lịch sắp diễn ra trong 48 giờ`
          }
          description={
            overduePendingCount > 0
              ? 'Phản hồi sớm để trải nghiệm khách không bị gián đoạn và giữ uy tín vận hành.'
              : 'Ưu tiên xác nhận hoặc đề xuất đổi giờ để khách chủ động sắp xếp.'
          }
        />
      ) : null}

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatKpiCard
          icon={<Calendar className="h-5 w-5" />}
          iconClassName="text-primary"
          label="Tổng lịch"
          value={totalCount}
          description="Trong danh sách hiện tại"
        />
        <StatKpiCard
          icon={<Clock className="h-5 w-5" />}
          iconClassName="text-amber-600"
          label="Chờ bạn xử lý"
          value={pendingCount}
          description={user?.role === 'LANDLORD' ? 'Cần xác nhận hoặc từ chối' : 'Đang chờ chủ nhà'}
        />
        <StatKpiCard
          icon={<CheckCircle2 className="h-5 w-5" />}
          iconClassName="text-emerald-600"
          label="Đã chốt"
          value={confirmedCount}
          description="Lịch đã được xác nhận"
        />
        <StatKpiCard
          icon={<XCircle className="h-5 w-5" />}
          iconClassName="text-muted-foreground"
          label="Đã hủy / từ chối"
          value={rejectedCount}
          description="Không còn hiệu lực"
        />
      </div>

      <section className="section-card overflow-hidden">
        <div className="flex flex-col gap-3 border-b border-border/60 bg-muted/[0.12] p-4 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
          <SegmentedControl
            aria-label="Lọc trạng thái lịch hẹn"
            items={filterItems}
            value={filterStatus}
            onChange={(id) => setFilterStatus(id as typeof filterStatus)}
            className="w-full sm:w-auto"
          />
          <div className="relative w-full min-w-0 sm:max-w-xs">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              className="min-h-11 pl-9"
              placeholder="Tìm phòng, tên, SĐT…"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>

        {isLoading ? (
          <div className="space-y-3 p-4 sm:p-5">
            {[1, 2, 3, 4, 5].map((i) => (
              <Skeleton key={i} className="h-14 w-full rounded-xl" />
            ))}
          </div>
        ) : filteredAppointments.length === 0 ? (
          <div className="px-4 py-12 sm:px-6">
            <EmptyState
              icon={Calendar}
              title={searchTerm ? 'Không có lịch khớp tìm kiếm' : 'Chưa có lịch hẹn'}
              description={
                searchTerm
                  ? 'Thử bỏ bộ lọc hoặc từ khóa khác.'
                  : user?.role === 'LANDLORD'
                    ? 'Khi khách đặt lịch xem, yêu cầu sẽ xuất hiện ở đây.'
                    : 'Đặt lịch xem phòng từ trang chi tiết phòng để theo dõi tại đây.'
              }
            />
          </div>
        ) : (
          <TableShell>
            <table className="w-full min-w-[720px] text-left text-sm">
              <thead>
                <tr className="border-b border-border/60 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                  <th className="px-4 py-3 sm:px-6">Phòng</th>
                  <th className="px-4 py-3 sm:px-6">{user?.role === 'LANDLORD' ? 'Khách' : 'Chủ nhà'}</th>
                  <th className="px-4 py-3 sm:px-6">Thời gian</th>
                  <th className="px-4 py-3 sm:px-6">Hình thức</th>
                  <th className="px-4 py-3 text-center sm:px-6">Trạng thái</th>
                  <th className="px-4 py-3 text-right sm:px-6">Thao tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60">
                {sortedAppointments.map((apt) => {
                  const meetMs = apt.meetTime ? new Date(apt.meetTime).getTime() : 0;
                  const nowMs = Date.now();
                  const isPendingOverdue = apt.status === 'PENDING' && meetMs > 0 && meetMs < nowMs;
                  const isPendingSoon =
                    apt.status === 'PENDING' && meetMs >= nowMs && meetMs <= nowMs + 48 * 3600000;
                  return (
                  <tr key={apt.id} className="transition-colors hover:bg-muted/30">
                    <td className="px-4 py-3.5 font-semibold text-foreground sm:px-6 sm:py-4">{apt.roomName}</td>
                    <td className="px-4 py-3.5 sm:px-6 sm:py-4">
                      {user?.role === 'LANDLORD' ? (
                        <>
                          <div className="font-medium text-foreground">{apt.tenantFullName || 'Chưa có tên'}</div>
                          <div className="text-xs text-muted-foreground">{apt.tenantPhone || '—'}</div>
                        </>
                      ) : (
                        <div className="font-medium text-foreground">{apt.landlordFullName || '—'}</div>
                      )}
                    </td>
                    <td className="px-4 py-3.5 sm:px-6 sm:py-4">
                      <div className="font-semibold tabular-nums text-primary">
                        {apt.meetTime
                          ? new Date(apt.meetTime).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })
                          : '—'}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {apt.meetTime ? new Date(apt.meetTime).toLocaleDateString('vi-VN') : '—'}
                      </div>
                    </td>
                    <td className="px-4 py-3.5 sm:px-6 sm:py-4">
                      {apt.meetingLink ? (
                        <span className="inline-flex items-center gap-1 text-sm font-medium text-violet-700">
                          <Video className="h-4 w-4 shrink-0" /> Online
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-sm font-medium text-emerald-700">
                          <MapPin className="h-4 w-4 shrink-0" /> Tại phòng
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3.5 text-center sm:px-6 sm:py-4">
                      <div className="flex flex-col items-center gap-1">
                        {apt.status === 'PENDING' && <StatusBadge label="Chờ duyệt" tone="warning" className="text-xs" />}
                        {apt.status === 'CONFIRMED' && <StatusBadge label="Đã chốt" tone="success" className="text-xs" />}
                        {apt.status === 'CANCELLED' && <StatusBadge label="Đã hủy" tone="danger" className="text-xs" />}
                        {isPendingOverdue ? (
                          <span className="text-[10px] font-semibold uppercase tracking-wide text-destructive">Quá giờ hẹn</span>
                        ) : isPendingSoon ? (
                          <span className="text-[10px] font-semibold uppercase tracking-wide text-amber-700">Sắp diễn ra</span>
                        ) : null}
                      </div>
                    </td>
                    <td className="px-4 py-3.5 text-right sm:px-6 sm:py-4">
                      <div className="flex flex-wrap justify-end gap-1.5">
                        {user?.role === 'LANDLORD' && apt.status === 'PENDING' ? (
                          <>
                            <Button
                              size="sm"
                              variant="outline"
                              className="min-h-9 border-destructive/30 text-destructive hover:bg-destructive/5"
                              onClick={() => handleUpdateStatus(apt.id, 'CANCELLED')}
                            >
                              <XCircle className="h-4 w-4" />
                            </Button>
                            <Button size="sm" className="min-h-9 bg-emerald-600 text-white hover:bg-emerald-700" onClick={() => handleUpdateStatus(apt.id, 'CONFIRMED')}>
                              <CheckCircle2 className="h-4 w-4" />
                            </Button>
                            <Button size="sm" variant="ghost" className="min-h-9 text-muted-foreground hover:text-primary" onClick={() => openDetailModal(apt)}>
                              <FileText className="h-4 w-4" />
                            </Button>
                          </>
                        ) : (
                          <Button size="sm" variant="outline" className="min-h-9 gap-1" onClick={() => openDetailModal(apt)}>
                            <FileText className="h-4 w-4" /> Chi tiết
                          </Button>
                        )}
                      </div>
                    </td>
                  </tr>
                  );
                })}
              </tbody>
            </table>
          </TableShell>
        )}
      </section>

      {isDetailModalOpen && viewingApt && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-md p-4 animate-in fade-in duration-200">
          <div className="relative max-h-[90vh] w-full max-w-md overflow-y-auto rounded-2xl border border-border/80 bg-card shadow-2xl animate-in zoom-in-95">
            <button
              type="button"
              onClick={() => setIsDetailModalOpen(false)}
              className="absolute right-3 top-3 z-10 rounded-full p-2 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
              aria-label="Đóng"
            >
              <X className="h-5 w-5" />
            </button>

            <div className="border-b border-border/60 bg-muted/20 px-6 pb-6 pt-8 text-center">
              <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-full border border-border/60 bg-card shadow-soft">
                <Calendar className="h-7 w-7 text-primary" />
              </div>
              <h2 className="text-lg font-semibold text-foreground">Chi tiết lịch hẹn</h2>
              <p className="mt-1 text-sm text-muted-foreground">Phòng {viewingApt.roomName}</p>
              <div className="mt-3 flex justify-center">
                {viewingApt.status === 'PENDING' && <StatusBadge label="Chờ xác nhận" tone="warning" className="text-xs" />}
                {viewingApt.status === 'CONFIRMED' && <StatusBadge label="Đã chốt lịch" tone="success" className="text-xs" />}
                {viewingApt.status === 'CANCELLED' && <StatusBadge label="Đã từ chối" tone="danger" className="text-xs" />}
              </div>
            </div>

            <div className="space-y-5 p-6">
              <div className="flex items-start gap-4 border-b border-border/60 pb-4">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                  <User className="h-5 w-5" />
                </div>
                {user?.role === 'LANDLORD' ? (
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Khách hàng</p>
                    <p className="mt-1 font-semibold text-foreground">{viewingApt.tenantFullName}</p>
                    <p className="text-sm text-muted-foreground">{viewingApt.tenantPhone || 'Chưa có SĐT'}</p>
                  </div>
                ) : (
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Chủ nhà</p>
                    <p className="mt-1 font-semibold text-foreground">{viewingApt.landlordFullName}</p>
                  </div>
                )}
              </div>

              <div className="grid grid-cols-2 gap-4 border-b border-border/60 pb-4">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Ngày xem</p>
                  <p className="mt-1 font-semibold text-foreground">
                    {viewingApt.meetTime ? new Date(viewingApt.meetTime).toLocaleDateString('vi-VN') : '—'}
                  </p>
                </div>
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Giờ hẹn</p>
                  <p className="mt-1 font-semibold text-primary">
                    {viewingApt.meetTime
                      ? new Date(viewingApt.meetTime).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })
                      : '—'}
                  </p>
                </div>
              </div>

              <div className="border-b border-border/60 pb-4">
                <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Hình thức gặp</p>
                {viewingApt.meetingLink ? (
                  <div className="rounded-xl border border-violet-500/20 bg-violet-500/5 p-3">
                    <p className="flex items-center gap-2 text-sm font-semibold text-violet-900">
                      <Video className="h-4 w-4" /> Video call
                    </p>
                    <a
                      href={viewingApt.meetingLink}
                      target="_blank"
                      rel="noreferrer"
                      className="mt-1 block break-all text-xs text-violet-700 underline-offset-2 hover:underline"
                    >
                      {viewingApt.meetingLink}
                    </a>
                  </div>
                ) : (
                  <div className="rounded-xl border border-border/60 bg-muted/30 p-3">
                    <p className="flex items-center gap-2 text-sm font-semibold text-foreground">
                      <MapPin className="h-4 w-4 text-emerald-600" /> Tại phòng
                    </p>
                  </div>
                )}
              </div>

              {viewingApt.note && (
                <div>
                  <p className="mb-2 flex items-center gap-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    <MessageSquare className="h-3.5 w-3.5" /> Lời nhắn
                  </p>
                  <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-3 text-sm italic text-amber-950">“{viewingApt.note}”</div>
                </div>
              )}

              {user?.role === 'LANDLORD' && viewingApt.status === 'PENDING' && (
                <div className="flex gap-2 pt-2">
                  <Button
                    type="button"
                    variant="outline"
                    className="min-h-11 flex-1 border-destructive/30 text-destructive hover:bg-destructive/5"
                    onClick={() => handleUpdateStatus(viewingApt.id, 'CANCELLED')}
                  >
                    Từ chối
                  </Button>
                  <Button type="button" className="min-h-11 flex-1 bg-emerald-600 text-white hover:bg-emerald-700" onClick={() => handleUpdateStatus(viewingApt.id, 'CONFIRMED')}>
                    Chấp nhận
                  </Button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

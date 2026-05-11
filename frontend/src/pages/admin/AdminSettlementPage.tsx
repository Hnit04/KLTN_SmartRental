import React from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { adminApi, type SettlementItemDetail } from '@/api/adminApi';
import type { LandlordSettlement } from '@/api/adminApi';
import { 
  Wallet, 
  CreditCard, 
  Building2, 
  ChevronRight, 
  Search, 
  Loader2, 
  AlertCircle,
  TrendingDown,
  ArrowRightLeft,
  X,
  FileText,
  CalendarDays,
  QrCode
} from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/utils/cn';
import { PageHeader } from '@/components/ui/PageHeader';
import { StatKpiCard } from '@/components/dashboard';
import { SegmentedControl, type SegmentItem } from '@/components/ui/SegmentedControl';
import { Input } from '@/components/ui/Input';
import { TableShell } from '@/components/ui/TableShell';
import { EmptyState } from '@/components/ui/EmptyState';
import { Skeleton } from '@/components/ui/Skeleton';
import { DashboardPanel } from '@/components/dashboard';

export default function AdminSettlementPage() {
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = React.useState('');
  const [viewMode, setViewMode] = React.useState<'PENDING' | 'HISTORY'>('PENDING');
  const [selectedLandlord, setSelectedLandlord] = React.useState<LandlordSettlement | null>(null);
  const [qrData, setQrData] = React.useState<{qrUrl: string, realAmount: number, qrAmount: string, addInfo: string} | null>(null);
  const [isLoadingQr, setIsLoadingQr] = React.useState(false);

  const fetchQr = async (landlordId: number) => {
    setIsLoadingQr(true);
    try {
      const res = await adminApi.getPayoutQrCode(landlordId);
      setQrData((res as any).data || res);
    } catch (error) {
      toast.error('Không thể lấy mã QR');
    } finally {
      setIsLoadingQr(false);
    }
  };

  const { data: settlements = [], isLoading } = useQuery({
    queryKey: ['admin', 'settlements', viewMode],
    queryFn: async () => {
      const res = viewMode === 'PENDING' 
        ? await adminApi.getPendingSettlements()
        : await adminApi.getSettledHistory();
      return (res as any).data || res;
    },
  });

  const { data: details = [], isLoading: isLoadingDetails } = useQuery({
    queryKey: ['admin', 'settlement-details', selectedLandlord?.landlordId, viewMode],
    queryFn: async () => {
      if (!selectedLandlord) return [];
      const res = await adminApi.getSettlementDetails(
        selectedLandlord.landlordId, 
        viewMode === 'HISTORY'
      );
      return (res as any).data || res;
    },
    enabled: !!selectedLandlord
  });

  const payoutMutation = useMutation({
    mutationFn: (landlordId: number) => adminApi.processPayout(landlordId),
    onSuccess: () => {
      toast.success('Đã xác nhận thanh toán thành công');
      setSelectedLandlord(null);
      queryClient.invalidateQueries({ queryKey: ['admin', 'settlements'] });
    },
    onError: () => {
      toast.error('Có lỗi xảy ra khi xử lý thanh toán');
    }
  });

  const filteredSettlements = settlements.filter((s: LandlordSettlement) => 
    s.landlordName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    s.landlordEmail.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const totalCollected = settlements.reduce((acc: number, curr: LandlordSettlement) => acc + curr.totalRevenue, 0);
  const totalCommission = settlements.reduce((acc: number, curr: LandlordSettlement) => acc + curr.platformFee, 0);
  const totalPayout = settlements.reduce((acc: number, curr: LandlordSettlement) => acc + curr.finalPayoutAmount, 0);

  const settlementViewItems: SegmentItem[] = [
    { id: 'PENDING', label: 'Chờ thanh toán' },
    { id: 'HISTORY', label: 'Lịch sử đã trả' },
  ];

  if (isLoading) {
    return (
      <div className="mx-auto max-w-[1200px] space-y-6 pb-10">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div className="space-y-2">
            <Skeleton className="h-9 w-72 rounded-lg" />
            <Skeleton className="h-4 w-full max-w-md rounded-md" />
          </div>
          <Skeleton className="h-11 w-full max-w-xs rounded-xl" />
        </div>
        <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-28 rounded-2xl" />
          ))}
        </div>
        <Skeleton className="h-72 w-full rounded-2xl" />
      </div>
    );
  }

  return (
    <div className="mx-auto min-w-0 max-w-[1200px] space-y-6 pb-10">
      <PageHeader
        title="Đối soát thu hộ & quyết toán"
        description="Theo dõi ví admin, phí 3% và payout cho chủ trọ — chọn dòng để xem chi tiết giao dịch trước khi xác nhận."
        actions={
          <div className="flex w-full flex-col gap-3 sm:w-auto sm:flex-row sm:items-center">
            <SegmentedControl
              aria-label="Chế độ xem đối soát"
              items={settlementViewItems}
              value={viewMode}
              onChange={(id) => {
                setViewMode(id as 'PENDING' | 'HISTORY');
                setSelectedLandlord(null);
              }}
            />
            <div className="relative w-full min-w-0 sm:max-w-xs">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" size={18} />
              <Input
                placeholder="Tìm tên hoặc email chủ trọ…"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>
        }
      />

      <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
        <StatKpiCard
          icon={<Wallet className="h-5 w-5" />}
          iconClassName="text-emerald-600"
          label={viewMode === 'PENDING' ? 'Tổng tiền thu hộ (ví admin)' : 'Tổng đã quyết toán'}
          value={`${totalCollected.toLocaleString()} đ`}
          description={viewMode === 'PENDING' ? 'Đã nhận qua MBBank' : 'Đã chuyển cho chủ trọ'}
        />
        <StatKpiCard
          icon={<TrendingDown className="h-5 w-5" />}
          iconClassName="text-primary"
          label="Hoa hồng platform (3%)"
          value={`${totalCommission.toLocaleString()} đ`}
          description={viewMode === 'PENDING' ? 'Lợi nhuận dự kiến' : 'Lợi nhuận thực tế'}
        />
        <StatKpiCard
          icon={<CreditCard className="h-5 w-5" />}
          iconClassName="text-primary"
          className="border-primary/25 bg-primary/[0.04]"
          label={viewMode === 'PENDING' ? 'Cần chi trả (payout)' : 'Số chủ trọ trong kỳ'}
          value={viewMode === 'PENDING' ? `${totalPayout.toLocaleString()} đ` : settlements.length}
          description={viewMode === 'PENDING' ? `Cho ${settlements.length} chủ trọ` : 'Dữ liệu lưu trữ'}
        />
      </div>

      {filteredSettlements.length === 0 ? (
        <EmptyState
          icon={AlertCircle}
          title="Không có dữ liệu đối soát"
          description={
            viewMode === 'PENDING'
              ? 'Hiện không có khoản nào cần thanh toán cho chủ trọ.'
              : 'Chưa có lịch sử thanh toán hoặc bộ lọc tìm kiếm không khớp.'
          }
        />
      ) : (
        <DashboardPanel
          title={viewMode === 'PENDING' ? 'Danh sách chờ thanh toán' : 'Lịch sử đã quyết toán'}
          description="Nhấn dòng để mở chi tiết giao dịch và QR chuyển khoản."
        >
          <TableShell className="rounded-none border-0 border-t-0 shadow-none bg-transparent">
            <table className="w-full min-w-[900px] text-left text-sm">
              <thead className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                <tr>
                  <th className="px-4 py-3 sm:px-6">Chủ trọ</th>
                  <th className="px-4 py-3 sm:px-6">Thông tin MBBank</th>
                  <th className="px-4 py-3 sm:px-6">Chi tiết thu</th>
                  <th className="px-4 py-3 sm:px-6">Phí (3%)</th>
                  <th className="px-4 py-3 sm:px-6">Thực nhận</th>
                  <th className="px-4 py-3 text-center sm:px-6">Hành động</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60">
                {filteredSettlements.map((s: LandlordSettlement) => (
                  <tr
                    key={s.landlordId}
                    className="cursor-pointer transition-colors hover:bg-muted/40"
                    onClick={() => setSelectedLandlord(s)}
                  >
                    <td className="px-4 py-4 sm:px-6 sm:py-5">
                      <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10 font-bold text-primary">
                          {s.landlordName.charAt(0)}
                        </div>
                        <div className="min-w-0">
                          <div className="font-semibold text-foreground">{s.landlordName}</div>
                          <div className="text-[11px] text-muted-foreground">{s.landlordEmail}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-4 sm:px-6 sm:py-5">
                      <div className="inline-block rounded-lg border border-border/60 bg-muted/30 p-2">
                        <div className="flex items-center gap-1.5 text-xs font-semibold text-foreground">
                          <Building2 size={14} className="text-muted-foreground" />
                          {s.bankName} - {s.bankAccountNumber}
                        </div>
                        <div className="ml-5 text-[10px] uppercase text-muted-foreground">{s.bankAccountHolder}</div>
                      </div>
                    </td>
                    <td className="px-4 py-4 sm:px-6 sm:py-5">
                      <div className="text-xs font-semibold text-foreground">{s.totalRevenue.toLocaleString()} đ</div>
                      <div className="mt-1 inline-block rounded bg-primary/10 px-1.5 py-0.5 text-[10px] font-bold text-primary">
                        {s.pendingItemCount} giao dịch
                      </div>
                    </td>
                    <td className="px-4 py-4 text-sm font-bold text-destructive sm:px-6 sm:py-5">
                      -{s.platformFee.toLocaleString()}
                    </td>
                    <td className="px-4 py-4 sm:px-6 sm:py-5">
                      <div className="text-lg font-bold tabular-nums text-emerald-600">{s.finalPayoutAmount.toLocaleString()} đ</div>
                    </td>
                    <td className="px-4 py-4 sm:px-6 sm:py-5">
                      <div className="flex justify-center">
                        <button
                          type="button"
                          className="rounded-lg p-2 text-primary transition-colors hover:bg-primary/10"
                          aria-label="Mở chi tiết"
                        >
                          <ChevronRight size={20} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </TableShell>
        </DashboardPanel>
      )}

      {/* DETAIL MODAL */}
      {selectedLandlord && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-md p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl w-full max-w-3xl shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200">
            <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
              <div>
                <h3 className="text-xl font-bold text-slate-900">Chi tiết đối soát: {selectedLandlord.landlordName}</h3>
                <p className="text-xs text-slate-500 font-medium uppercase mt-1 tracking-wider">
                  {selectedLandlord.bankName} • {selectedLandlord.bankAccountNumber}
                </p>
              </div>
              <button 
                onClick={() => setSelectedLandlord(null)}
                className="p-2 hover:bg-slate-200 rounded-full transition-colors text-slate-400"
              >
                <X size={20} />
              </button>
            </div>

            <div className="p-6 max-h-[60vh] overflow-y-auto">
              {isLoadingDetails ? (
                <div className="py-12 flex justify-center"><Loader2 className="animate-spin text-indigo-600" /></div>
              ) : details.length > 0 ? (
                <div className="space-y-4">
                  {details.map((item: SettlementItemDetail) => (
                    <div key={`${item.type}-${item.id}`} className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl border border-slate-100 hover:border-indigo-200 transition-colors">
                      <div className="flex items-center gap-4">
                        <div className={cn(
                          "p-3 rounded-xl",
                          item.type === 'BILL' ? "bg-amber-100 text-amber-600" : "bg-emerald-100 text-emerald-600"
                        )}>
                          {item.type === 'BILL' ? <FileText size={20}/> : <CreditCard size={20}/>}
                        </div>
                        <div>
                          <div className="font-bold text-slate-800 text-sm">{item.description}</div>
                          <div className="flex items-center gap-3 mt-1">
                            <span className="text-[10px] text-slate-400 flex items-center gap-1 font-medium">
                               <CalendarDays size={12} /> {new Date(item.paidAt).toLocaleDateString('vi-VN')}
                            </span>
                            <span className="text-[10px] text-slate-400 font-mono">#{item.referenceCode}</span>
                          </div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="font-black text-slate-900 text-base">{item.amount.toLocaleString()} đ</div>
                        <div className="text-[10px] text-indigo-500 font-bold uppercase bg-indigo-50 px-2 py-0.5 rounded">Chưa quyết toán</div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="py-12 text-center">
                   <AlertCircle className="mx-auto text-slate-300 mb-2" size={40} />
                   <p className="text-slate-400 text-sm">Không có dữ liệu chi tiết cho đợt đối soát này.</p>
                   {selectedLandlord?.pendingItemCount && selectedLandlord.pendingItemCount > 0 && (
                     <p className="text-red-400 text-[10px] mt-1 italic">
                       Cảnh báo: Có {selectedLandlord.pendingItemCount} giao dịch được ghi nhận ở Backend nhưng không tải được chi tiết.
                     </p>
                   )}
                </div>
              )}
            </div>

            <div className="p-6 bg-slate-50 border-t border-slate-100 flex justify-between items-center">
              <div className="space-y-1">
                <div className="text-xs text-slate-500">Tổng thực nhận (đã trừ phí 3%)</div>
                <div className="text-2xl font-black text-indigo-600">
                  {selectedLandlord ? (selectedLandlord.finalPayoutAmount).toLocaleString() : 0} đ
                </div>
              </div>
              <div className="flex gap-3">
                <button 
                  onClick={() => setSelectedLandlord(null)}
                  className="px-6 py-3 rounded-xl text-sm font-bold text-slate-600 hover:bg-slate-200 transition-colors"
                >
                  Đóng
                </button>
                {viewMode === 'PENDING' && (
                  <>
                    <button 
                      onClick={() => fetchQr(selectedLandlord.landlordId)}
                      disabled={isLoadingQr}
                      className="bg-emerald-50 text-emerald-600 border border-emerald-200 px-6 py-3 rounded-xl text-sm font-bold flex items-center gap-2 hover:bg-emerald-100 transition-colors"
                    >
                      {isLoadingQr ? <Loader2 className="animate-spin" size={18}/> : <QrCode size={18}/>}
                      Quét mã chuyển tiền
                    </button>
                    <button 
                      onClick={() => payoutMutation.mutate(selectedLandlord.landlordId)}
                      disabled={payoutMutation.isPending}
                      className="bg-indigo-600 hover:bg-indigo-700 text-white px-8 py-3 rounded-xl text-sm font-bold shadow-lg shadow-indigo-200 flex items-center gap-2 transition-all active:scale-95"
                    >
                      {payoutMutation.isPending ? <Loader2 className="animate-spin" size={18}/> : 'Xác nhận đã Payout'}
                    </button>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* QR MODAL */}
      {qrData && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-900/80 backdrop-blur-md p-4">
          <div className="bg-white rounded-[2rem] w-full max-w-sm shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200">
            <div className="p-6 border-b border-slate-100 flex justify-between items-center">
              <h3 className="font-bold text-slate-900">Mã QR Thanh toán</h3>
              <button onClick={() => setQrData(null)} className="p-2 hover:bg-slate-100 rounded-full transition-colors text-slate-400">
                <X size={20} />
              </button>
            </div>
            
            <div className="p-8 flex flex-col items-center text-center">
              <div className="bg-slate-50 p-4 rounded-3xl mb-6 border border-slate-100">
                <img src={qrData.qrUrl} alt="Payout QR" className="w-64 h-64 shadow-inner" />
              </div>
              
              <div className="space-y-2">
                <p className="text-xs text-slate-400 font-bold uppercase tracking-widest">Số tiền quyết toán</p>
                <h4 className="text-3xl font-black text-indigo-600">
                  {qrData.realAmount.toLocaleString()} đ
                </h4>
                <div className="bg-amber-50 text-amber-600 text-[10px] font-bold px-3 py-1 rounded-full border border-amber-100 inline-block">
                  Nội dung: {qrData.addInfo}
                </div>
              </div>
            </div>
            
            <div className="p-6 bg-slate-50 border-t border-slate-100 flex flex-col gap-2">
              <button 
                onClick={() => setQrData(null)}
                className="w-full bg-slate-900 text-white py-4 rounded-2xl font-bold hover:bg-slate-800 transition-all active:scale-95"
              >
                Đóng mã QR
              </button>
              <p className="text-[10px] text-center text-slate-400 italic">
                * Vui lòng bấm "Xác nhận đã Payout" ở màn hình sau khi chuyển khoản thành công.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Manual Notice - SAME */}
      <div className="section-card flex gap-4 border-primary/20 bg-primary/[0.04] p-4">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-card text-primary shadow-soft">
          <AlertCircle size={24} />
        </div>
        <div>
          <h4 className="text-sm font-semibold text-foreground">Hướng dẫn quyết toán (payout)</h4>
          <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
            Bấm từng dòng để kiểm tra chi tiết hóa đơn trước khi chuyển tiền. Sau khi chuyển khoản thành công qua app ngân hàng, bấm{' '}
            <span className="font-semibold text-foreground">Xác nhận đã Payout</span> để hệ thống gạch nợ.
          </p>
        </div>
      </div>
    </div>
  );
}

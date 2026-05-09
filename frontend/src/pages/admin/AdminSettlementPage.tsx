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

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh]">
        <Loader2 className="h-10 w-10 animate-spin text-indigo-600 mb-4" />
        <p className="text-slate-500 font-medium">Đang tải dữ liệu đối soát...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f8fafc] p-8">
      {/* Header section - SAME */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
            <ArrowRightLeft className="text-primary" />
            Đối soát thu hộ & Quyết toán
          </h1>
          <p className="text-slate-500 text-sm mt-1">Quản lý dòng tiền trung gian và hoa hồng 3% từ chủ trọ</p>
        </div>
        
        <div className="flex items-center gap-3">
          <div className="flex bg-slate-200/50 p-1 rounded-xl mr-2">
            <button 
              onClick={() => { setViewMode('PENDING'); setSelectedLandlord(null); }}
              className={cn(
                "px-4 py-1.5 rounded-lg text-xs font-bold transition-all",
                viewMode === 'PENDING' ? "bg-white text-primary shadow-sm" : "text-slate-500 hover:text-slate-700"
              )}
            >
              Chờ thanh toán
            </button>
            <button 
              onClick={() => { setViewMode('HISTORY'); setSelectedLandlord(null); }}
              className={cn(
                "px-4 py-1.5 rounded-lg text-xs font-bold transition-all",
                viewMode === 'HISTORY' ? "bg-white text-primary shadow-sm" : "text-slate-500 hover:text-slate-700"
              )}
            >
              Lịch sử đã trả
            </button>
          </div>
          <div className="relative">
            <Search className="absolute left-3 top-2.5 text-slate-400" size={18}/>
            <input 
              type="text" 
              placeholder="Tìm tên chủ trọ..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 pr-4 py-2 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white w-64 shadow-sm"
            />
          </div>
        </div>
      </div>

      {/* Summary Stats - SAME */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
        <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm relative overflow-hidden group">
          <div className="absolute right-[-10px] top-[-10px] opacity-5 group-hover:scale-110 transition-transform">
            <Wallet size={120} />
          </div>
          <p className="text-slate-500 text-sm font-medium mb-1">{viewMode === 'PENDING' ? 'Tổng tiền thu hộ (Ví Admin)' : 'Tổng tiền đã quyết toán'}</p>
          <h3 className="text-3xl font-bold text-slate-900">{totalCollected.toLocaleString()} đ</h3>
          <div className="flex items-center gap-1 text-emerald-500 text-xs font-bold mt-2">
             {viewMode === 'PENDING' ? 'Đã nhận qua MBBank' : 'Đã chuyển cho Chủ trọ'}
          </div>
        </div>

        <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm relative overflow-hidden group">
          <div className="absolute right-[-10px] top-[-10px] opacity-5 text-indigo-600 group-hover:scale-110 transition-transform">
            <TrendingDown size={120} />
          </div>
          <p className="text-slate-500 text-sm font-medium mb-1">Hoa hồng Platform (3%)</p>
          <h3 className="text-3xl font-bold text-primary">{totalCommission.toLocaleString()} đ</h3>
          <div className="flex items-center gap-1 text-primary text-xs font-bold mt-2">
             Lợi nhuận {viewMode === 'PENDING' ? 'dự kiến' : 'thực tế'}
          </div>
        </div>

        <div className="bg-primary p-6 rounded-2xl shadow-lg shadow-indigo-200 relative overflow-hidden group">
          <div className="absolute right-[-10px] top-[-10px] opacity-10 text-white group-hover:scale-110 transition-transform">
            <CreditCard size={120} />
          </div>
          <p className="text-white/80 text-sm font-medium mb-1">{viewMode === 'PENDING' ? 'Cần chi trả (Payout)' : 'Tổng số chủ trọ'}</p>
          <h3 className="text-3xl font-bold text-white">{viewMode === 'PENDING' ? totalPayout.toLocaleString() : settlements.length} {viewMode === 'HISTORY' ? '' : 'đ'}</h3>
          <div className="flex items-center gap-1 text-white/60 text-xs font-bold mt-2 text-wrap">
             {viewMode === 'PENDING' ? `Cho ${settlements.length} chủ trọ` : 'Dữ liệu lưu trữ'}
          </div>
        </div>
      </div>

      {/* Main Table section */}
      <div className="bg-white rounded-3xl border border-slate-100 shadow-xl overflow-hidden">
        <div className="p-6 border-b border-slate-50 flex justify-between items-center">
          <h2 className="font-bold text-slate-800 text-lg">
            {viewMode === 'PENDING' ? 'Danh sách chờ thanh toán' : 'Lịch sử đã quyết toán'}
          </h2>
        </div>
        
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-slate-50/50 text-slate-400 text-[11px] font-bold uppercase tracking-wider">
              <tr>
                <th className="px-6 py-4">Chủ trọ</th>
                <th className="px-6 py-4">Thông tin MBBank</th>
                <th className="px-6 py-4">Chi tiết thu</th>
                <th className="px-6 py-4">Phí (3%)</th>
                <th className="px-6 py-4">Thực nhận</th>
                <th className="px-6 py-4 text-center">Hành động</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {filteredSettlements.length > 0 ? (
                filteredSettlements.map((s: LandlordSettlement) => (
                  <tr key={s.landlordId} className="hover:bg-slate-50/80 transition-colors group cursor-pointer" onClick={() => setSelectedLandlord(s)}>
                    <td className="px-6 py-5">
                      <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center font-bold">
                          {s.landlordName.charAt(0)}
                        </div>
                        <div>
                          <div className="font-bold text-slate-700">{s.landlordName}</div>
                          <div className="text-[11px] text-slate-400">{s.landlordEmail}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-5">
                      <div className="p-2 bg-slate-50 rounded-lg border border-slate-100 inline-block">
                        <div className="flex items-center gap-1.5 text-xs font-bold text-slate-700">
                           <Building2 size={14} className="text-slate-400" />
                           {s.bankName} - {s.bankAccountNumber}
                        </div>
                        <div className="text-[10px] text-slate-500 ml-5 uppercase">{s.bankAccountHolder}</div>
                      </div>
                    </td>
                    <td className="px-6 py-5">
                      <div className="text-xs text-slate-600 font-semibold">{s.totalRevenue.toLocaleString()} đ</div>
                      <div className="text-[10px] font-bold text-indigo-500 bg-indigo-50 px-1.5 py-0.5 rounded inline-block mt-1">
                         {s.pendingItemCount} giao dịch
                      </div>
                    </td>
                    <td className="px-6 py-5 text-sm font-bold text-red-500">
                      -{s.platformFee.toLocaleString()}
                    </td>
                    <td className="px-6 py-5">
                      <div className="text-lg font-black text-emerald-600">
                        {s.finalPayoutAmount.toLocaleString()} đ
                      </div>
                    </td>
                    <td className="px-6 py-5">
                       <div className="flex justify-center">
                          <button className="text-indigo-600 hover:bg-indigo-50 p-2 rounded-lg transition-colors">
                             <ChevronRight size={20}/>
                          </button>
                       </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center">
                    <div className="flex flex-col items-center justify-center text-slate-400">
                      <AlertCircle size={48} className="mb-3 text-slate-300" />
                      <p className="text-base font-medium text-slate-600">Không có dữ liệu đối soát</p>
                      <p className="text-sm mt-1">
                        {viewMode === 'PENDING' ? 'Hiện tại không có khoản tiền nào cần thanh toán cho chủ trọ.' : 'Chưa có lịch sử thanh toán nào.'}
                      </p>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* DETAIL MODAL */}
      {selectedLandlord && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
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
      <div className="mt-8 p-4 bg-primary-50 border border-primary-100 rounded-2xl flex gap-4">
         <div className="h-10 w-10 rounded-full bg-white flex items-center justify-center text-primary shadow-sm shrink-0">
            <AlertCircle size={24} />
         </div>
         <div>
            <h4 className="font-bold text-primary text-sm">Hướng dẫn Quyết toán (Payout)</h4>
            <p className="text-primary text-xs mt-1 leading-relaxed">
              Hãy bấm vào từng dòng để kiểm tra chi tiết các hóa đơn trước khi chuyển tiền. 
              Sau khi đã chuyển tiền thật thành công qua App Ngân hàng, hãy bấm nút <b>Xác nhận Payout</b> để hệ thống gạch nợ.
            </p>
         </div>
      </div>
    </div>
  );
}

function cn(...classes: any[]) {
  return classes.filter(Boolean).join(' ');
}

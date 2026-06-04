import React from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { adminApi } from '@/api/adminApi';
import { contractApi } from '@/api/contractApi';
import { 
  AlertCircle,
  Search, 
  Loader2, 
  Gavel,
  ChevronRight,
  X,
  FileText,
  ShieldAlert,
  Building2
} from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/utils/cn';
import { PageHeader } from '@/components/ui/PageHeader';
import { SegmentedControl, type SegmentItem } from '@/components/ui/SegmentedControl';
import { Input } from '@/components/ui/Input';
import { TableShell } from '@/components/ui/TableShell';
import { EmptyState } from '@/components/ui/EmptyState';
import { Skeleton } from '@/components/ui/Skeleton';
import { DashboardPanel } from '@/components/dashboard';

type Dispute = {
  id: number;
  contractId: number;
  contractSmartContractAddress: string | null;
  roomName: string;
  propertyId: number;
  violationType: string;
  description: string;
  evidenceUrls: string | null;
  status: 'OPEN' | 'RESOLVED';
  openedById: number;
  openedByName: string;
  openedByRole: string;
  createdAt: string;
  resolvedAt: string | null;
  resolutionNote: string | null;
};

export default function AdminDisputePage() {
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = React.useState('');
  const [viewMode, setViewMode] = React.useState<'OPEN' | 'RESOLVED'>('OPEN');
  const [selectedDispute, setSelectedDispute] = React.useState<Dispute | null>(null);

  const [tenantRefundAmount, setTenantRefundAmount] = React.useState<string>('0');
  const [landlordDeductionAmount, setLandlordDeductionAmount] = React.useState<string>('0');
  const [resolutionNote, setResolutionNote] = React.useState<string>('');
  const [terminateContract, setTerminateContract] = React.useState<boolean>(false);

  const { data: disputes = [], isLoading } = useQuery({
    queryKey: ['admin', 'disputes'],
    queryFn: async () => {
      const res = await adminApi.getAdminDisputes();
      return (res as any).data || res;
    },
  });

  const resolveMutation = useMutation({
    mutationFn: () => {
      if (!selectedDispute) throw new Error('No dispute selected');
      return adminApi.resolveDispute(selectedDispute.id, {
        tenantRefundAmount: parseFloat(tenantRefundAmount) || 0,
        landlordDeductionAmount: parseFloat(landlordDeductionAmount) || 0,
        resolutionNote,
        terminateContract
      });
    },
    onSuccess: () => {
      toast.success('Phán quyết tranh chấp thành công! Đã đẩy lệnh lên Blockchain.');
      setSelectedDispute(null);
      setResolutionNote('');
      setTenantRefundAmount('0');
      setLandlordDeductionAmount('0');
      setTerminateContract(false);
      queryClient.invalidateQueries({ queryKey: ['admin', 'disputes'] });
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.message || 'Có lỗi xảy ra khi xử lý phán quyết');
    }
  });

  const rejectMutation = useMutation({
    mutationFn: () => {
      if (!selectedDispute) throw new Error('No dispute selected');
      return adminApi.rejectDispute(selectedDispute.id, {
        resolutionNote
      });
    },
    onSuccess: () => {
      toast.success('Từ chối tranh chấp thành công! Hợp đồng đã được khôi phục trạng thái cũ.');
      setSelectedDispute(null);
      setResolutionNote('');
      queryClient.invalidateQueries({ queryKey: ['admin', 'disputes'] });
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.message || 'Có lỗi xảy ra khi từ chối tranh chấp');
    }
  });

  const filteredDisputes = disputes.filter((d: Dispute) => {
    if (d.status !== viewMode) return false;
    if (!searchTerm) return true;
    return d.roomName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
           d.openedByName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
           d.description?.toLowerCase().includes(searchTerm.toLowerCase());
  });

  const settlementViewItems: SegmentItem[] = [
    { id: 'OPEN', label: 'Cần phán quyết' },
    { id: 'RESOLVED', label: 'Đã xử lý' },
  ];

  const [previewContract, setPreviewContract] = React.useState<any>(null);
  const [isPreviewLoading, setIsPreviewLoading] = React.useState(false);

  const fetchAndPreviewContract = async (contractId: number) => {
    try {
      setIsPreviewLoading(true);
      const res = await contractApi.getDetail(contractId);
      setPreviewContract((res as any).data || res);
    } catch (err) {
      toast.error('Lỗi khi tải chi tiết hợp đồng');
    } finally {
      setIsPreviewLoading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="mx-auto max-w-[1200px] space-y-6 pb-10">
        <Skeleton className="h-20 w-full rounded-2xl" />
        <Skeleton className="h-72 w-full rounded-2xl" />
      </div>
    );
  }

  return (
    <div className="mx-auto min-w-0 max-w-[1200px] space-y-6 pb-10">
      <PageHeader
        title="Giải quyết tranh chấp"
        description="Đóng vai trò trọng tài trung lập, xem xét bằng chứng và phân bổ lại tiền cọc trên Blockchain."
        actions={
          <div className="flex w-full flex-col gap-3 sm:w-auto sm:flex-row sm:items-center">
            <SegmentedControl
              aria-label="Chế độ xem"
              items={settlementViewItems}
              value={viewMode}
              onChange={(id) => {
                setViewMode(id as 'OPEN' | 'RESOLVED');
                setSelectedDispute(null);
                setPreviewContract(null);
              }}
            />
            <div className="relative w-full min-w-0 sm:max-w-xs">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" size={18} />
              <Input
                placeholder="Tìm phòng, người gửi…"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>
        }
      />

      {filteredDisputes.length === 0 ? (
        <EmptyState
          icon={Gavel}
          title="Không có tranh chấp"
          description={
            viewMode === 'OPEN'
              ? 'Tất cả các tranh chấp hợp đồng đã được giải quyết hoặc chưa có ai mở tranh chấp.'
              : 'Chưa có lịch sử phán quyết.'
          }
        />
      ) : (
        <DashboardPanel
          title={viewMode === 'OPEN' ? 'Danh sách cần phán quyết' : 'Lịch sử phán quyết'}
          description="Nhấn dòng để xem chi tiết và đưa ra quyết định."
        >
          <TableShell className="rounded-none border-0 border-t-0 shadow-none bg-transparent">
            <table className="w-full min-w-[900px] text-left text-sm">
              <thead className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                <tr>
                  <th className="px-4 py-3 sm:px-6">Ngày tạo</th>
                  <th className="px-4 py-3 sm:px-6">Phòng trọ</th>
                  <th className="px-4 py-3 sm:px-6">Người yêu cầu</th>
                  <th className="px-4 py-3 sm:px-6">Loại vi phạm</th>
                  <th className="px-4 py-3 sm:px-6">Trạng thái Blockchain</th>
                  <th className="px-4 py-3 text-center sm:px-6">Hành động</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60">
                {filteredDisputes.map((d: Dispute) => (
                  <tr
                    key={d.id}
                    className="cursor-pointer transition-colors hover:bg-muted/40"
                    onClick={() => setSelectedDispute(d)}
                  >
                    <td className="px-4 py-4 sm:px-6 sm:py-5">
                      <div className="font-medium text-foreground">
                        {new Date(d.createdAt).toLocaleDateString('vi-VN')}
                      </div>
                    </td>
                    <td className="px-4 py-4 sm:px-6 sm:py-5">
                      <div className="inline-block rounded-lg border border-border/60 bg-muted/30 p-2">
                        <div className="flex items-center gap-1.5 text-xs font-semibold text-foreground">
                          <Building2 size={14} className="text-muted-foreground" />
                          {d.roomName}
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-4 sm:px-6 sm:py-5">
                      <div className="flex items-center gap-2">
                         <div className="font-semibold text-foreground">{d.openedByName}</div>
                         <div className="text-[10px] font-bold uppercase bg-slate-100 px-2 py-0.5 rounded text-slate-500">
                           {d.openedByRole === 'TENANT' ? 'Người thuê' : 'Chủ trọ'}
                         </div>
                      </div>
                    </td>
                    <td className="px-4 py-4 sm:px-6 sm:py-5">
                      <div className="text-xs font-semibold text-amber-600 bg-amber-50 inline-block px-2 py-1 rounded">
                        {d.violationType}
                      </div>
                    </td>
                    <td className="px-4 py-4 sm:px-6 sm:py-5">
                       {d.contractSmartContractAddress ? (
                         <div className="text-[10px] bg-indigo-50 text-indigo-600 font-mono px-2 py-1 rounded w-fit border border-indigo-100 truncate max-w-[120px]">
                           {d.contractSmartContractAddress}
                         </div>
                       ) : (
                         <span className="text-xs text-muted-foreground italic">Truyền thống</span>
                       )}
                    </td>
                    <td className="px-4 py-4 sm:px-6 sm:py-5">
                      <div className="flex justify-center">
                        <button
                          type="button"
                          className="rounded-lg p-2 text-primary transition-colors hover:bg-primary/10"
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
      {selectedDispute && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl w-full max-w-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
            <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50">
              <div>
                <h3 className="text-xl font-bold text-slate-900 flex items-center gap-2">
                  <Gavel className="text-indigo-600" />
                  Xử lý Tranh chấp
                </h3>
                <div className="flex items-center gap-3 mt-1">
                  <p className="text-xs text-slate-500 font-medium">Hợp đồng phòng: {selectedDispute.roomName}</p>
                  <button
                    onClick={() => fetchAndPreviewContract(selectedDispute.contractId)}
                    disabled={isPreviewLoading}
                    className="text-[10px] font-bold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded border border-indigo-200 hover:bg-indigo-100 transition-colors flex items-center gap-1 disabled:opacity-50"
                  >
                    {isPreviewLoading ? <Loader2 size={12} className="animate-spin" /> : <FileText size={12} />}
                    Xem hợp đồng
                  </button>
                </div>
              </div>
              <button 
                onClick={() => { setSelectedDispute(null); setPreviewContract(null); }}
                className="p-2 hover:bg-slate-200 rounded-full transition-colors text-slate-400"
              >
                <X size={20} />
              </button>
            </div>

            <div className="p-6 overflow-y-auto flex-1 space-y-6">
               <div className="bg-amber-50/50 border border-amber-100 rounded-2xl p-4">
                 <div className="flex items-center gap-2 text-amber-800 font-bold mb-2">
                   <ShieldAlert size={18} />
                   Nội dung khiếu nại ({selectedDispute.openedByRole === 'TENANT' ? 'Từ Người thuê' : 'Từ Chủ trọ'})
                 </div>
                 <p className="text-sm text-slate-700 leading-relaxed whitespace-pre-wrap">
                   {selectedDispute.description || 'Không có mô tả chi tiết.'}
                 </p>
                 {selectedDispute.evidenceUrls && (
                   <div className="mt-4 pt-4 border-t border-amber-200/50">
                     <p className="text-xs font-semibold text-amber-700 mb-2">Bằng chứng (Link ảnh/video):</p>
                     <a href={selectedDispute.evidenceUrls} target="_blank" rel="noreferrer" className="text-sm text-indigo-600 hover:underline break-all">
                       {selectedDispute.evidenceUrls}
                     </a>
                   </div>
                 )}
               </div>

               {selectedDispute.status === 'OPEN' ? (
                 <div className="space-y-4">
                    <h4 className="font-bold text-slate-800 border-b pb-2">Quyết định của Trọng tài (Admin)</h4>
                    
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-1.5">
                        <label className="text-xs font-bold text-slate-600">Hoàn lại tiền cọc cho Tenant (VNĐ)</label>
                        <Input 
                          type="number"
                          placeholder="Ví dụ: 1000000"
                          value={tenantRefundAmount}
                          onChange={(e) => setTenantRefundAmount(e.target.value)}
                        />
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-xs font-bold text-slate-600">Khấu trừ đền bù cho Landlord (VNĐ)</label>
                        <Input 
                          type="number"
                          placeholder="Ví dụ: 500000"
                          value={landlordDeductionAmount}
                          onChange={(e) => setLandlordDeductionAmount(e.target.value)}
                        />
                      </div>
                    </div>

                    <div className="space-y-1.5 pt-2">
                      <label className="text-xs font-bold text-slate-600">Ghi chú / Lý do phán quyết <span className="text-red-500">*</span></label>
                      <textarea
                        className="w-full min-h-[80px] rounded-xl border border-input bg-transparent px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                        placeholder="Giải thích lý do phân chia tiền đền bù để lưu vết trên Blockchain..."
                        value={resolutionNote}
                        onChange={(e) => setResolutionNote(e.target.value)}
                      />
                    </div>

                    <label className="flex items-center gap-3 p-3 bg-slate-50 border rounded-xl cursor-pointer hover:bg-slate-100 transition-colors">
                      <input 
                        type="checkbox" 
                        checked={terminateContract}
                        onChange={(e) => setTerminateContract(e.target.checked)}
                        className="w-5 h-5 rounded border-slate-300 text-indigo-600 focus:ring-indigo-600"
                      />
                      <div className="flex flex-col">
                         <span className="text-sm font-bold text-slate-900">Chấm dứt hợp đồng sớm</span>
                         <span className="text-xs text-slate-500">Phòng sẽ được trả về trạng thái Trống sau khi phân xử xong.</span>
                      </div>
                    </label>
                 </div>
               ) : (
                 <div className="space-y-4">
                    <h4 className="font-bold text-slate-800 border-b pb-2">Kết quả phán quyết</h4>
                    <div className="bg-slate-50 p-4 rounded-xl space-y-3">
                      <div className="text-sm">
                        <span className="text-slate-500 mr-2">Thời gian xử lý:</span> 
                        <span className="font-semibold">{selectedDispute.resolvedAt ? new Date(selectedDispute.resolvedAt).toLocaleString('vi-VN') : ''}</span>
                      </div>
                      <div className="text-sm">
                        <span className="text-slate-500 mr-2">Ghi chú từ Admin:</span> 
                        <span className="font-semibold text-slate-900">{selectedDispute.resolutionNote || 'Không có'}</span>
                      </div>
                    </div>
                 </div>
               )}
            </div>

            <div className="p-6 bg-slate-50 border-t border-slate-100 flex justify-end gap-3 shrink-0">
               <button 
                 onClick={() => { setSelectedDispute(null); setPreviewContract(null); }}
                 className="px-6 py-2.5 rounded-xl text-sm font-bold text-slate-600 hover:bg-slate-200 transition-colors"
               >
                 Đóng
               </button>
               {selectedDispute.status === 'OPEN' && (
                 <div className="flex gap-2">
                   <button 
                     onClick={() => rejectMutation.mutate()}
                     disabled={rejectMutation.isPending || !resolutionNote.trim()}
                     className="bg-red-500 hover:bg-red-600 disabled:opacity-50 text-white px-6 py-2.5 rounded-xl text-sm font-bold shadow-lg shadow-red-200 flex items-center gap-2 transition-all"
                   >
                     {rejectMutation.isPending ? <Loader2 className="animate-spin" size={18}/> : <X size={18} />}
                     Từ chối tranh chấp
                   </button>
                   <button 
                     onClick={() => resolveMutation.mutate()}
                     disabled={resolveMutation.isPending || !resolutionNote.trim()}
                     className="bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white px-6 py-2.5 rounded-xl text-sm font-bold shadow-lg shadow-indigo-200 flex items-center gap-2 transition-all"
                   >
                     {resolveMutation.isPending ? <Loader2 className="animate-spin" size={18}/> : <Gavel size={18} />}
                     Ký Phán Quyết
                   </button>
                 </div>
               )}
            </div>
          </div>
        </div>
      )}

      {/* CONTRACT PREVIEW MODAL */}
      {previewContract && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl w-full max-w-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
            <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50">
              <div>
                <h3 className="text-xl font-bold text-slate-900 flex items-center gap-2">
                  <FileText className="text-indigo-600" />
                  Nội dung Hợp đồng
                </h3>
                <p className="text-xs text-slate-500 mt-1 font-medium">Hợp đồng phòng: {previewContract.roomName}</p>
              </div>
              <button 
                onClick={() => setPreviewContract(null)}
                className="p-2 hover:bg-slate-200 rounded-full transition-colors text-slate-400"
              >
                <X size={20} />
              </button>
            </div>

            <div className="p-6 overflow-y-auto flex-1 space-y-6 text-sm text-slate-800">
               <div className="grid grid-cols-2 gap-4 bg-slate-50 p-4 rounded-xl border">
                  <div>
                    <p className="text-xs text-slate-500 font-semibold mb-1">Giá thuê / tháng</p>
                    <p className="font-bold text-lg text-indigo-700">{previewContract.actualPrice?.toLocaleString()} VNĐ</p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-500 font-semibold mb-1">Tiền cọc</p>
                    <p className="font-bold text-lg text-amber-600">{previewContract.depositAmount?.toLocaleString()} VNĐ</p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-500 font-semibold mb-1">Ngày bắt đầu</p>
                    <p className="font-semibold">{new Date(previewContract.startDate).toLocaleDateString('vi-VN')}</p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-500 font-semibold mb-1">Ngày kết thúc</p>
                    <p className="font-semibold">{new Date(previewContract.endDate).toLocaleDateString('vi-VN')}</p>
                  </div>
               </div>

               <div>
                 <h4 className="font-bold text-slate-800 mb-2 border-b pb-2">Điều khoản bổ sung / Nội quy</h4>
                 <div className="bg-white border rounded-xl p-4 min-h-[150px] whitespace-pre-wrap leading-relaxed text-gray-700">
                   {(() => {
                     const terms = previewContract.additionalTerms;
                     const modernSplitMarker = "[TENANT_REQUESTS_START]";
                     const landlordHeaderRegex = /---?\s*NỘI QUY MẪU TỪ CHỦ TRỌ\s*---?/g;
                     const tenantHeaderRegex = /---?\s*YÊU CẦU THÊM CỦA KHÁCH THUÊ\s*---?/g;
                     
                     const isModernSplit = terms?.includes(modernSplitMarker);
                     landlordHeaderRegex.lastIndex = 0;
                     tenantHeaderRegex.lastIndex = 0;
                     const isLegacySplit = landlordHeaderRegex.test(terms || "") || tenantHeaderRegex.test(terms || "");
                     
                     const clean = (t: string) => t.replace(modernSplitMarker, "").replace(landlordHeaderRegex, "").replace(tenantHeaderRegex, "").trim();

                     if ((isModernSplit || isLegacySplit) && terms) {
                       const parts = isModernSplit ? terms.split(modernSplitMarker) : terms.split(tenantHeaderRegex);
                       const landlordPart = clean(parts[0]);
                       const tenantPart = clean(parts[1] || "");
                       
                       return (
                         <div className="space-y-4">
                           {landlordPart && (
                             <div>
                               <p className="font-bold text-slate-900 mb-1">Nội quy phòng trọ:</p>
                               <div className="pl-3 border-l-2 border-indigo-200">{landlordPart}</div>
                             </div>
                           )}
                           {tenantPart && (
                             <div>
                               <p className="font-bold text-slate-900 mb-1">Thỏa thuận bổ sung của khách thuê:</p>
                               <div className="pl-3 border-l-2 border-amber-200">{tenantPart}</div>
                             </div>
                           )}
                         </div>
                       );
                     }

                     return clean(terms || "Không có thỏa thuận bổ sung nào khác.");
                   })()}
                 </div>
               </div>
            </div>

            <div className="p-4 bg-slate-50 border-t border-slate-100 flex justify-end shrink-0">
               <button 
                 onClick={() => setPreviewContract(null)}
                 className="px-6 py-2 rounded-xl text-sm font-bold bg-slate-200 text-slate-700 hover:bg-slate-300 transition-colors"
               >
                 Quay lại phán quyết
               </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

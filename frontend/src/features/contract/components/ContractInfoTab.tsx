import React, { useState } from 'react';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import StatusBadge from '@/components/shared/StatusBadge';
import { FileText, MapPin, Calendar, Users, User, Trash2, Clock, CheckCircle2, XCircle, PenTool, Sparkles, AlertTriangle, LogOut, TrendingUp, CheckCircle, Bot, Check, ShieldCheck, MessageSquare, AlertCircle, Blocks, Loader2, QrCode, Star, Download } from 'lucide-react';
import { cn } from '@/utils/cn';
import ContractDisputePanel from '@/features/contract/components/ContractDisputePanel';
import ActiveDisputePanel from '@/features/contract/components/ActiveDisputePanel';
import AdminDisputeResolutionPanel from '@/features/contract/components/AdminDisputeResolutionPanel';
import BlockchainLifecycleTimeline from '@/features/contract/components/BlockchainLifecycleTimeline';
import { renderMarkdown } from '@/utils/format';
import { useSystemConfig } from '@/context/SystemConfigContext';
import { getBlockchainRuntimeConfig } from '@/config/blockchainConfig';
import { useNavigate } from 'react-router-dom';

interface ContractInfoTabProps {
  contract: any;
  user: any;
  onRefresh: () => void;
  changeRequests: any[];
  // Các handlers giữ nguyên từ Phase 1, pass as props for now
  handleConsentSettlement: () => void;
  handleExecuteSettlement: () => void;
  handleWithdrawFunds: () => void;
  handleAnalyzeChangeRequest: (req: any) => void;
  handleRejectRequest: (id: number) => void;
  handleCounterPropose: (req: any) => void;
  handleApproveRequest: (id: number) => void;
  handleUpdateResidentStatus: (id: number, status: string) => void;
  handleRequestRemoval: (member: any) => void;
  isConsenting: boolean;
  isExecuting: boolean;
  isWithdrawing: boolean;
  isAnalyzingRequest: boolean;
  isApprovingRequest: number | null;
  isUpdatingResident: boolean;
  requestAnalysisResult: string | null;
  withdrawableBalance: number;
  handleAnalyzeTerms: () => void;
  isAnalyzing: boolean;
  analysisResult: string | null;
  setIsSignModalOpen: (open: boolean) => void;
  setIsApproveModalOpen: (open: boolean) => void;
  setIsRejectModalOpen: (open: boolean) => void;
  setIsRefundConfirmOpen: (open: boolean) => void;
  setIsRequestModalOpen: (open: boolean) => void;
  setIsReviewModalOpen: (open: boolean) => void;
  setChangeForm: (form: any) => void;
  handleDownloadPDF: () => void;
  handleConfirmWeb3Deposit: () => void;
  handleOpenDepositQrModal: () => void;
  isConfirmingDeposit: boolean;
  isLoadingQr: boolean;
  isDownloading: boolean;
  isConfirmingRefund: boolean;
  isApproving: boolean;
}

export default function ContractInfoTab({
  contract, user, onRefresh,
  handleConsentSettlement, handleExecuteSettlement, handleWithdrawFunds,
  handleAnalyzeChangeRequest, handleRejectRequest, handleCounterPropose,
  handleApproveRequest, handleUpdateResidentStatus, handleRequestRemoval,
  isConsenting, isExecuting, isWithdrawing, isAnalyzingRequest,
  isApprovingRequest, isUpdatingResident, requestAnalysisResult, withdrawableBalance,
  handleAnalyzeTerms, isAnalyzing, analysisResult,
  setIsSignModalOpen, setIsApproveModalOpen, setIsRejectModalOpen,
  setIsRefundConfirmOpen, setIsRequestModalOpen, setIsReviewModalOpen,
  setChangeForm, handleDownloadPDF, handleConfirmWeb3Deposit,
  handleOpenDepositQrModal, isConfirmingDeposit, isLoadingQr,
  isDownloading, isConfirmingRefund, isApproving, changeRequests
}: ContractInfoTabProps) {
  const { config } = useSystemConfig();
  const runtimeBlockchainConfig = getBlockchainRuntimeConfig(config);
  const navigate = useNavigate();
  const id = contract?.id;
  const prefix = user?.role === 'ADMIN' ? '/admin' : user?.role === 'LANDLORD' ? '/landlord' : '/tenant';
  const members = contract?.members || [];
  const residentRequests = contract?.residentRequests || [];
  const pendingRequest = changeRequests.find((r: any) => r.status === 'PENDING');

  const isLandlord = user?.role === 'LANDLORD';
  const isMeSigned = isLandlord ? contract?.isLandlordSigned : contract?.isTenantSigned;
  const isPartnerSigned = isLandlord ? contract?.isTenantSigned : contract?.isLandlordSigned;

  return (
    <>
        <div className="grid md:grid-cols-3 gap-6 animate-in fade-in zoom-in-95 duration-200">
          <div className="md:col-span-2 space-y-6">

            {contract.status === 'ACTIVE' && (
              <ContractDisputePanel contractId={Number(id)} onSuccess={() => onRefresh()} />
            )}
            
            {contract.status === 'DISPUTE' && user?.role !== 'ADMIN' && (
              <ActiveDisputePanel contractId={Number(id)} />
            )}

            {user?.role === 'ADMIN' && contract.status === 'DISPUTE' && (
              <AdminDisputeResolutionPanel contractId={Number(id)} onSuccess={() => onRefresh()} />
            )}

            {/* QUYẾT TOÁN ON-CHAIN - VỊ TRÍ MỚI (TOP) */}
            {contract.smartContractAddress && 
             contract.status !== 'PENDING_SIGNATURE' && 
             contract.status !== 'AWAITING_DEPOSIT' && 
             contract.status !== 'CANCELLED' && (
              <div className="bg-gradient-to-r from-indigo-50 to-blue-50 border-2 border-indigo-200 rounded-2xl p-6 shadow-md mb-6 animate-in fade-in slide-in-from-top-4 duration-500">
                <h3 className="text-xl font-black text-indigo-900 mb-4 flex items-center gap-2">
                  <LogOut className="h-6 w-6 text-indigo-600" /> Quyết toán & Trả phòng (Web3)
                </h3>
                {(contract.status === 'ACTIVE' || ((contract.status === 'TERMINATED_EARLY' || contract.status === 'EXPIRED') && withdrawableBalance <= 0)) ? (
                  <div className="space-y-4">
                    {/* Info banner for early termination that needs on-chain settlement */}
                    {(contract.status === 'TERMINATED_EARLY' || contract.status === 'EXPIRED') && (
                      <div className="relative overflow-hidden rounded-xl border border-amber-200/60 bg-gradient-to-br from-amber-50 via-white to-orange-50 p-4 shadow-md">
                        <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-amber-400 via-orange-400 to-amber-400" />
                        <div className="flex items-start gap-3 mt-1">
                          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-amber-500 to-orange-500 shadow-sm">
                            <AlertTriangle className="h-4 w-4 text-white" />
                          </div>
                          <div>
                            <p className="text-sm font-bold text-amber-900">Cần quyết toán trên Blockchain</p>
                            <p className="mt-1 text-xs leading-relaxed text-amber-700">
                              Hợp đồng đã được chấm dứt trên hệ thống, nhưng tiền cọc vẫn nằm trong Smart Contract.
                              Vui lòng hoàn tất quy trình quyết toán bên dưới để rút tiền về ví.
                            </p>
                          </div>
                        </div>
                      </div>
                    )}

                    {contract.isProposalActive ? (
                      <div className="bg-white rounded-xl p-5 border border-indigo-200 shadow-sm">
                        <div className="flex justify-between items-start mb-4">
                           <div>
                              <p className="text-[11px] text-gray-500 font-bold uppercase tracking-wider mb-1">Số tiền đề xuất khấu trừ</p>
                              <p className="text-2xl font-black text-rose-600">{contract.currentDeductionAmount ? Math.round((contract.currentDeductionAmount / 1e18) * config.vndEthRate).toLocaleString() : 0}đ</p>
                           </div>
                           <StatusBadge label={contract.isEarlyTerminationProposal ? 'Kết thúc sớm' : 'Đúng hạn'} tone="warning" className="px-3 py-1" />
                        </div>
                        
                        <div className="grid grid-cols-2 gap-3 mb-5">
                           <div className={cn("p-3 rounded-xl text-center border-2", contract.hasLandlordConsented ? "bg-green-50 border-green-200 text-green-700 shadow-inner" : "bg-muted/40 border-gray-100 text-gray-400")}>
                              <p className="text-[10px] font-bold uppercase mb-1">Chủ trọ</p>
                              <p className="text-sm font-black flex items-center justify-center gap-1">
                                {contract.hasLandlordConsented ? <><CheckCircle2 className="w-4 h-4"/> Đã ký</> : '⏳ Đang chờ'}
                              </p>
                           </div>
                           <div className={cn("p-3 rounded-xl text-center border-2", contract.hasTenantConsented ? "bg-green-50 border-green-200 text-green-700 shadow-inner" : "bg-muted/40 border-gray-100 text-gray-400")}>
                              <p className="text-[10px] font-bold uppercase mb-1">Khách thuê</p>
                              <p className="text-sm font-black flex items-center justify-center gap-1">
                                {contract.hasTenantConsented ? <><CheckCircle2 className="w-4 h-4"/> Đã ký</> : '⏳ Đang chờ'}
                              </p>
                           </div>
                        </div>

                        {user?.role === 'TENANT' && !contract.hasTenantConsented && (
                          <Button className="w-full bg-green-600 hover:bg-green-700 h-12 text-lg shadow-lg shadow-green-200" onClick={handleConsentSettlement} isLoading={isConsenting}>
                            ✍️ Tôi đồng ý Quyết toán này
                          </Button>
                        )}

                        {contract.hasLandlordConsented && contract.hasTenantConsented && (
                          <Button className="w-full bg-indigo-600 hover:bg-indigo-700 h-12 text-lg shadow-lg shadow-indigo-200" onClick={handleExecuteSettlement} isLoading={isExecuting}>
                            🚀 Thực thi Kết thúc Hợp đồng
                          </Button>
                        )}
                      </div>
                    ) : (
                      user?.role === 'LANDLORD' && (
                        <Button className="w-full bg-indigo-600 hover:bg-indigo-700 h-12 text-lg shadow-lg shadow-indigo-200 transition-transform hover:scale-[1.02]" onClick={() => {
                          navigate(`${prefix}/contracts/${contract.id}/settle`);
                        }}>
                          💸 Bắt đầu Quyết toán & Trả phòng (Flow mới)
                        </Button>
                      )
                    )}
                    {user?.role === 'TENANT' && !contract.isProposalActive && (
                      <div className="bg-indigo-100/50 p-4 rounded-xl border border-indigo-100 text-center">
                         <p className="text-sm text-indigo-800 font-medium flex items-center justify-center gap-2">
                           <Clock className="w-4 h-4 animate-spin-slow" /> Đang chờ Chủ trọ đề xuất quyết toán tiền cọc...
                         </p>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className="p-5 bg-green-50 border-2 border-green-200 rounded-xl shadow-inner">
                      <p className="text-sm text-green-800 font-bold flex items-center gap-2">
                         <CheckCircle className="w-5 h-5 text-green-600" /> Hợp đồng đã kết thúc an toàn trên Blockchain.
                      </p>
                    </div>
                    <Button variant="outline" className="w-full border-indigo-300 text-indigo-700 hover:bg-indigo-50 h-12 text-lg font-bold shadow-sm" onClick={handleWithdrawFunds} isLoading={isWithdrawing}>
                      💰 Rút tiền từ Contract về ví MetaMask
                    </Button>
                  </div>
                )}
              </div>
            )}

            {pendingRequest && (
              <div className="bg-white border-2 border-orange-200 rounded-2xl overflow-hidden shadow-md animate-in fade-in slide-in-from-top-4 duration-500">
                <div className="flex flex-wrap items-start justify-between gap-2 border-b border-orange-100 bg-orange-50 px-4 py-3 sm:items-center sm:px-5">
                   <div className="flex min-w-0 items-center gap-2">
                      <div className="w-8 h-8 rounded-full bg-orange-200 flex items-center justify-center">
                         <PenTool className="w-4 h-4 text-orange-700" />
                      </div>
                      <h4 className="font-bold text-orange-900">Đề xuất thay đổi đang chờ</h4>
                   </div>
                   <StatusBadge label="Cần xử lý" tone="warning" className="animate-pulse" />
                </div>
                
                <div className="p-5 space-y-4">
                    <div className="flex gap-4">
                       <div className="flex-1 space-y-3">
                          <div className="grid grid-cols-2 gap-4">
                             <div className="space-y-1">
                                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Loại thay đổi</p>
                                <p className="text-sm font-black text-gray-700">{pendingRequest.type}</p>
                             </div>
                             <div className="space-y-1">
                                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Người đề xuất</p>
                                <p className="text-sm font-black text-primary">{pendingRequest.requestedByRole === 'LANDLORD' ? 'Chủ trọ' : 'Khách thuê'}</p>
                             </div>
                          </div>
                          
                          <div className="bg-muted/40 p-3 rounded-xl border border-gray-100">
                             <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">Lý do đưa ra</p>
                             <p className="text-sm italic text-gray-600 leading-relaxed">“{pendingRequest.reason}”</p>
                          </div>
                       </div>
                       
                       {user?.role !== pendingRequest.requestedByRole && (
                          <div className="shrink-0 flex flex-col justify-center border-l pl-4">
                             <Button
                                size="sm"
                                className="bg-gradient-to-br from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white shadow-lg shadow-purple-200 border-none h-auto py-3 px-4 flex-col gap-1 rounded-xl"
                                onClick={() => handleAnalyzeChangeRequest(pendingRequest)}
                                isLoading={isAnalyzingRequest}
                             >
                                <Sparkles className="w-5 h-5" />
                                <span className="text-[10px] font-bold">AI PHÂN TÍCH</span>
                             </Button>
                          </div>
                       )}
                    </div>

                    {requestAnalysisResult && (
                      <div className="p-4 bg-purple-50/50 border border-purple-100 rounded-xl animate-in zoom-in-95 duration-300">
                        <div className="flex items-center gap-2 mb-2">
                           <Bot className="h-4 w-4 text-purple-600" />
                           <h4 className="text-xs font-bold text-purple-800 uppercase tracking-widest">Nhận định từ AI Advisor</h4>
                        </div>
                        <div
                          className="text-sm text-purple-900 leading-relaxed"
                          dangerouslySetInnerHTML={renderMarkdown(requestAnalysisResult)}
                        />
                      </div>
                    )}

                    <div className="grid grid-cols-2 gap-4">
                      <div className="group">
                        <div className="flex items-center gap-2 mb-2">
                           <XCircle className="w-3 h-3 text-rose-400" />
                           <span className="text-[10px] font-bold text-gray-400 uppercase">Giá trị cũ</span>
                        </div>
                        <div className="p-3 rounded-xl border border-rose-100 bg-rose-50/30 line-through text-gray-400 text-sm whitespace-pre-wrap min-h-[60px]">
                           {pendingRequest.oldValue || "Chưa có nội dung"}
                        </div>
                      </div>
                      
                      <div className="group">
                        <div className="flex items-center gap-2 mb-2">
                           <CheckCircle2 className="w-3 h-3 text-green-500" />
                           <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Giá trị đề xuất</span>
                        </div>
                        <div className="p-3 rounded-xl border-2 border-green-200 bg-green-50/20 text-green-900 font-bold text-sm whitespace-pre-wrap min-h-[60px] shadow-sm ring-4 ring-green-500/5">
                           {pendingRequest.newValue}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center justify-end gap-3 pt-2">
                      {user?.role !== pendingRequest.requestedByRole ? (
                        <>
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            onClick={() => handleRejectRequest(pendingRequest.id)} 
                            className="text-rose-500 hover:text-rose-600 hover:bg-rose-50 font-bold"
                            disabled={isApprovingRequest !== null}
                          >
                            <XCircle className="w-4 h-4 mr-2" /> Từ chối
                          </Button>
                          <Button 
                            variant="outline" 
                            size="sm" 
                            onClick={() => handleCounterPropose(pendingRequest)} 
                            className="text-indigo-600 border-indigo-200 hover:bg-indigo-50 font-bold"
                            disabled={isApprovingRequest !== null}
                          >
                            <PenTool className="w-4 h-4 mr-2" /> Đề xuất lại
                          </Button>
                          <Button 
                            size="sm" 
                            onClick={() => handleApproveRequest(pendingRequest.id)} 
                            className="bg-green-600 hover:bg-green-700 shadow-md shadow-green-100 font-bold px-6"
                            isLoading={isApprovingRequest === pendingRequest.id}
                            disabled={isApprovingRequest !== null}
                          >
                            <Check className="w-4 h-4 mr-2" /> Chấp nhận & Cập nhật
                          </Button>
                        </>
                      ) : (
                        <div className="w-full bg-orange-100/50 p-2 text-center rounded-lg border border-orange-200">
                           <p className="text-[11px] text-orange-700 font-bold flex items-center justify-center gap-2">
                              <Clock className="w-3 h-3 animate-spin duration-1000" />
                              Yêu cầu của bạn đang chờ phản hồi từ đối tác...
                           </p>
                        </div>
                      )}
                    </div>
                </div>
              </div>
            )}

            <div className="bg-white rounded-2xl border shadow-sm p-6">
              <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
                <FileText className="h-5 w-5 text-primary" /> Thông tin cơ bản
              </h3>
              <div className="grid sm:grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-gray-500 mb-1">Khu trọ / Địa chỉ</p>
                  <p className="font-semibold flex items-start gap-1">
                    <MapPin className="w-4 h-4 mt-0.5 text-gray-400 shrink-0" />
                    {contract.propertyAddress || "Đang cập nhật..."}
                  </p>
                </div>
                <div>
                  <p className="text-gray-500 mb-1">Thời hạn thuê</p>
                  <p className="font-semibold flex items-center gap-1">
                    <Calendar className="w-4 h-4 text-gray-400" />
                    {contract.startDate} - {contract.endDate || "Chưa xác định"}
                  </p>
                </div>
                <div>
                  <p className="text-gray-500 mb-1">Người thuê</p>
                  <p className="font-semibold">{contract.tenantName || "Đang cập nhật..."}</p>
                </div>
                <div>
                  <p className="text-gray-500 mb-1">Đại diện cho thuê</p>
                  <p className="font-semibold">{contract.landlordName || "Đang cập nhật..."}</p>
                </div>
                <div>
                  <p className="text-gray-500 mb-1">Giá thuê</p>
                  <p className="font-bold text-primary">
                    {contract.actualPrice ? `${contract.actualPrice.toLocaleString()}đ` : "Đang cập nhật..."}
                    <span className="text-gray-400 font-normal"> /tháng</span>
                  </p>
                </div>
                <div>
                  <p className="text-gray-500 mb-1">Tiền cọc</p>
                  <div className="flex items-center gap-2">
                    <p className="font-bold text-gray-800">
                      {contract.depositAmount ? `${contract.depositAmount.toLocaleString()}đ` : "—"}
                    </p>
                    {contract.depositStatus && (
                      <StatusBadge
                        label={contract.depositStatus === 'REFUNDED' ? 'Đã hoàn cọc' :
                          contract.depositStatus === 'PENALIZED' ? 'Bị giữ cọc' :
                            contract.depositStatus === 'DEPOSITED' ? 'Đã đặt cọc' :
                              'Chưa đặt cọc'}
                        tone={contract.depositStatus === 'REFUNDED' ? 'success' :
                          contract.depositStatus === 'PENALIZED' ? 'danger' :
                            contract.depositStatus === 'DEPOSITED' ? 'info' :
                              'neutral'}
                        className="text-[10px]"
                      />
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* ────── QUẢN LÝ THÀNH VIÊN (DÀNH CHO CHỦ NHÀ / LANDLORD ONLY) ────── */}
            {user?.role === 'LANDLORD' && (
              <div className="bg-white rounded-2xl border shadow-sm overflow-hidden mb-6">
                <div className="bg-muted/40/50 px-6 py-4 border-b flex items-center justify-between">
                  <h3 className="text-lg font-bold flex items-center gap-2 text-gray-800">
                    <Users className="h-5 w-5 text-primary" /> Thành viên cùng phòng
                  </h3>
                  <span className="text-xs bg-primary/10 text-primary px-2.5 py-1 rounded-full font-bold">
                    {members.length + 1} thành viên
                  </span>
                </div>

                <div className="divide-y divide-gray-100">
                  {/* Đại diện: Tenant đứng tên hợp đồng */}
                  <div className="p-5 flex items-center justify-between bg-blue-50/20">
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center border border-blue-200 shadow-sm">
                        <User className="h-5 w-5 text-blue-600" />
                      </div>
                      <div>
                        <p className="font-bold text-gray-900">{contract.tenantName}</p>
                        <p className="text-[11px] text-gray-500 font-medium">Người đứng tên hợp đồng (Đại diện)</p>
                      </div>
                    </div>
                    <span className="text-[10px] font-bold text-blue-600 uppercase bg-blue-50 px-2.5 py-1 rounded-full border border-blue-200">Chủ phòng</span>
                  </div>

                  {/* Các thành viên khác đã được duyệt */}
                  {members.map(member => (
                    <div key={member.id} className="p-5 flex items-center justify-between hover:bg-muted/40/30 transition-colors">
                      <div className="flex items-center gap-4">
                        <img
                          src={member.avatarUrl || `https://api.dicebear.com/7.x/avataaars/svg?seed=${member.id}`}
                          className="w-10 h-10 rounded-full border border-gray-200 bg-white p-0.5 shadow-sm"
                          alt=""
                        />
                        <div>
                          <p className="font-bold text-gray-900">{member.fullName}</p>
                          <p className="text-[11px] text-gray-400">Tham gia: {new Date(member.joinedDate).toLocaleDateString('vi-VN')}</p>
                        </div>
                      </div>
                      <div className="flex flex-col items-end gap-2">
                        <div className="flex flex-col items-end">
                          <p className="text-[9px] text-gray-400 font-bold uppercase tracking-wider mb-0.5">Uy tín</p>
                          <span className="text-xs font-black text-green-600 bg-green-50 px-2 py-0.5 rounded border border-green-200">
                            {member.reputationScore}
                          </span>
                        </div>
                        {(user?.role === 'LANDLORD' || (user?.role === 'TENANT' && user?.id === contract.tenantId)) && contract.status === 'ACTIVE' && (
                           <Button 
                             variant="outline" 
                             size="sm" 
                             className="h-7 text-[10px] text-rose-500 hover:text-rose-600 hover:bg-rose-50 border-rose-200"
                             onClick={() => handleRequestRemoval(member)}
                             disabled={isUpdatingResident}
                           >
                             <Trash2 className="w-3 h-3 mr-1" /> {user?.role === 'LANDLORD' ? 'Xóa thành viên' : 'Yêu cầu xóa'}
                           </Button>
                         )}
                      </div>
                    </div>
                  ))}

                  {/* YÊU CẦU ĐANG CHỜ PHÊ DUYỆT (Lọc: ADD: PENDING/ACCEPTED, REMOVE: PENDING/ACCEPTED) */}
                  {residentRequests.filter(r => 
                      (r.type === 'ADD' && (r.status === 'PENDING' || r.status === 'ACCEPTED')) || 
                      (r.type === 'REMOVE' && (r.status === 'PENDING' || r.status === 'ACCEPTED'))
                    ).map(req => (
<div key={req.id} className="p-5 bg-amber-50/40 border-l-4 border-l-amber-500 relative">
                      <div className="flex items-center justify-between mb-4 flex-wrap gap-4">
                        <div className="flex items-center gap-4">
                          <div className="relative">
                            <img
                              src={req.inviteeAvatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=invitee-${req.id}`}
                              className="w-12 h-12 rounded-full border-2 border-amber-200 shadow-sm p-0.5 bg-white"
                              alt=""
                            />
                            <div className="absolute -bottom-1 -right-1 bg-amber-500 text-white rounded-full p-1 border border-white shadow-sm">
                              <Clock className="w-2 h-2" />
                            </div>
                          </div>
                          <div>
                            <p className="font-bold text-gray-900 flex items-center gap-2 flex-wrap">
                              {req.inviteeName}
                              <StatusBadge
                                label={req.type === 'REMOVE' ? 'Xóa bỏ' : 'Thêm mới'}
                                tone={req.type === 'REMOVE' ? 'danger' : 'info'}
                                className="text-[10px] font-black uppercase tracking-tighter"
                              />
                              <StatusBadge label={`Uy tín: ${req.inviteeReputationScore}`} tone="danger" className="text-[10px] font-black" />
                              {req.inviteeKycStatus === 'VERIFIED' ? (
                                <StatusBadge label="Đã xác minh" tone="success" className="text-[10px] font-black" />
                              ) : (
                                <StatusBadge label="Chưa xác minh" tone="neutral" className="text-[10px] font-black" />
                              )}

                              {/* TRẠNG THÁI 3 BƯỚC (BƯỚC 2: XÁC NHẬN) */}
                              {req.type === 'ADD' && req.status === 'PENDING' && (
                                <StatusBadge label="CHỜ KHÁCH XÁC NHẬN" tone="warning" className="text-[10px] font-black animate-pulse" />
                              )}
                              {req.type === 'ADD' && req.status === 'ACCEPTED' && (
                                <StatusBadge label="SẴN SÀNG DUYỆT" tone="success" className="text-[10px] font-black shadow-sm" />
                              )}
                              {req.type === 'REMOVE' && req.status === 'PENDING' && (
                                <StatusBadge label="CHỜ THÀNH VIÊN XÁC NHẬN RỜI ĐI" tone="danger" className="text-[10px] font-black animate-pulse" />
                              )}
                              {req.type === 'REMOVE' && req.status === 'ACCEPTED' && (
                                <StatusBadge label="SẴN SÀNG DUYỆT XÓA" tone="warning" className="text-[10px] font-black shadow-sm" />
                              )}
                            </p>
                            <div className="space-y-1 mt-1">
                              <p className="text-xs text-blue-600 font-medium flex items-center gap-1">
                                <span className="text-gray-400 font-normal">Email:</span> {req.inviteeEmail}
                              </p>
                              {req.inviteePhone && (
                                <p className="text-xs text-gray-600 font-medium flex items-center gap-1">
                                  <span className="text-gray-400 font-normal">SĐT:</span> {req.inviteePhone}
                                </p>
                              )}
                              {req.inviteeCurrentAddress && (
                                <p className="text-[11px] text-gray-500 flex items-center gap-1">
                                  <MapPin className="w-3 h-3 text-gray-300" /> {req.inviteeCurrentAddress}
                                </p>
                              )}
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 ml-auto">
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-8 text-red-500 border-red-200 hover:bg-red-50 text-xs font-bold"
                            onClick={() => handleUpdateResidentStatus(req.id, 'REJECTED')}
                            disabled={isUpdatingResident}
                          >Từ chối</Button>
                          <Button 
                             size="sm" 
                             className={cn(
                                "h-8 text-xs font-bold shadow-sm transition-all",
                                req.status === 'PENDING' 
                                  ? "bg-gray-200 text-gray-400 cursor-not-allowed" 
                                  : "bg-green-600 hover:bg-green-700 text-white"
                              )}
                              onClick={() => handleUpdateResidentStatus(req.id, 'APPROVED')}
                              isLoading={isUpdatingResident}
                              disabled={isUpdatingResident || req.status === 'PENDING'}
                           >
                             {req.status === 'PENDING' ? (req.type === 'ADD' ? 'Chờ khách' : 'Chờ xác nhận') : 'Phê duyệt'}
                           </Button>
                        </div>
                      </div>
                      {req.message && (
                        <div className="bg-white/80 p-3 rounded-xl border border-amber-200/50 italic text-xs text-gray-600 shadow-inner mb-3">
                          “{req.message}”
                        </div>
                      )}
                      <p className="text-[10px] text-gray-400 font-medium">
                        Người mời: <span className="font-bold text-gray-600">{req.requesterName}</span>
                        <span className="mx-2">•</span>
                        {new Date(req.createdAt).toLocaleDateString('vi-VN')}
                      </p>
                    </div>
                  ))}

                  {members.length === 0 && residentRequests.filter(r => 
                      (r.type === 'ADD' && (r.status === 'PENDING' || r.status === 'ACCEPTED')) || 
                      (r.type === 'REMOVE' && (r.status === 'PENDING' || r.status === 'ACCEPTED'))
                    ).length === 0 && (
                    <div className="p-8 text-center bg-muted/40/30">
                      <Users className="w-8 h-8 text-gray-200 mx-auto mb-2" />
                      <p className="text-xs text-gray-400 italic">Hiện tại chưa có thành viên nào khác trong phòng.</p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* ────── LỊCH SỬ THƯƠNG LƯỢNG (TIMELINE) ────── */}
            {changeRequests.length > 0 && (
              <div className="bg-white rounded-2xl border shadow-sm p-6 mb-6">
                <h3 className="text-lg font-bold mb-6 flex items-center gap-2">
                  <Clock className="h-5 w-5 text-indigo-500" /> Lịch sử thương lượng điều khoản
                </h3>
                <div className="relative pl-8 space-y-8 before:absolute before:inset-0 before:left-[11px] before:w-0.5 before:bg-gray-100 before:content-['']">
                  {changeRequests.map((req) => (
                    <div key={req.id} className="relative group">
                      {/* Dot */}
                      <div className={cn(
                        "absolute -left-[27px] top-1 w-4 h-4 rounded-full border-2 bg-white transition-all shadow-sm z-10",
                        req.status === 'ACCEPTED' ? "border-green-500 bg-green-50" : 
                        req.status === 'REJECTED' ? "border-rose-400 bg-rose-50" : "border-amber-400 bg-amber-50"
                      )} />
                      
                      <div className="bg-muted/40/50 rounded-2xl p-4 border border-gray-100/80 group-hover:bg-white group-hover:shadow-md transition-all">
                        <div className="flex justify-between items-start mb-2">
                          <div className="flex items-center gap-2">
                            <span className="text-[10px] font-black uppercase bg-gray-200 text-gray-600 px-2 py-0.5 rounded">
                              {req.type}
                            </span>
                            <span className="text-[11px] text-gray-400">
                              {new Date(req.requestDate).toLocaleString('vi-VN')}
                            </span>
                          </div>
                          <StatusBadge 
                            label={req.status === 'ACCEPTED' ? 'Đã áp dụng' : req.status === 'REJECTED' ? 'Bị từ chối' : 'Chờ phản hồi'}
                            tone={req.status === 'ACCEPTED' ? 'success' : req.status === 'REJECTED' ? 'danger' : 'warning'}
                            className="text-[10px]"
                          />
                        </div>

                        {req.status === 'PENDING' && req.expiryDate && (
                          <div className="flex items-center gap-2 mb-3">
                            <span className="text-[10px] bg-amber-50 text-amber-700 border border-amber-200 px-2 py-0.5 rounded-full font-bold flex items-center gap-1">
                              <Clock className="w-3 h-3" /> Hết hạn: {new Date(req.expiryDate).toLocaleString('vi-VN')}
                            </span>
                            <span className="text-[9px] text-rose-500 font-bold italic animate-pulse">
                              (Quá hạn sẽ bị trừ 5 điểm uy tín)
                            </span>
                          </div>
                        )}
                        
                        <p className="text-xs mb-3">
                          <span className="font-bold text-primary">{req.requestedByRole === 'LANDLORD' ? 'Chủ trọ' : 'Khách thuê'}</span> đã đề xuất thay đổi điều khoản.
                        </p>
                        
                        <div className="bg-white p-3 rounded-xl border border-gray-100 text-xs text-gray-600 leading-relaxed italic mb-3">
                           Lý do: “{req.reason}”
                        </div>
                        
                        <div className="flex gap-2">
                           <div className="flex-1 p-2 bg-rose-50/30 rounded border border-rose-50 text-[11px] line-through text-gray-400">
                              {req.oldValue || "Trống"}
                           </div>
                           <div className="w-4 flex items-center justify-center text-gray-300">→</div>
                           <div className="flex-1 p-2 bg-green-50/30 rounded border border-green-50 text-[11px] font-bold text-green-800">
                              {req.newValue}
                           </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {contract.additionalTerms && (() => {
              const terms = contract.additionalTerms;
              
              const modernSplitMarker = "[TENANT_REQUESTS_START]";
              const landlordHeaderRegex = /---?\s*NỘI QUY MẪU TỪ CHỦ TRỌ\s*---?/g;
              const tenantHeaderRegex = /---?\s*YÊU CẦU THÊM CỦA KHÁCH THUÊ\s*---?/g;
              
              const isModernSplit = terms.includes(modernSplitMarker);
              const isLegacySplit = landlordHeaderRegex.test(terms) || tenantHeaderRegex.test(terms);
              const hasSplit = isModernSplit || isLegacySplit;

              const cleanText = (text: string) => {
                if (!text) return "";
                return text
                  .replace(modernSplitMarker, "")
                  .replace(landlordHeaderRegex, "")
                  .replace(tenantHeaderRegex, "")
                  .trim();
              };

              let landlordTerms = terms;
              let tenantRequests = "";

              if (isModernSplit) {
                const parts = terms.split(modernSplitMarker);
                landlordTerms = cleanText(parts[0]);
                tenantRequests = cleanText(parts[1] || "");
              } else if (isLegacySplit) {
                const parts = terms.split(tenantHeaderRegex);
                landlordTerms = cleanText(parts[0]);
                tenantRequests = cleanText(parts[1] || "");
              }

              return (
                <div className="bg-white rounded-2xl border shadow-sm relative overflow-hidden">
                  <div className="flex justify-between items-center bg-muted/40 px-6 py-4 border-b">
                    <h3 className="text-lg font-bold flex items-center gap-2 text-gray-800">
                      <AlertCircle className="h-5 w-5 text-gray-500" /> Thỏa thuận & Nội quy
                    </h3>
                    <Button
                      size="sm"
                      className="bg-purple-600 hover:bg-purple-700 text-white shadow-md shadow-purple-500/30"
                      onClick={handleAnalyzeTerms}
                      isLoading={isAnalyzing}
                    >
                      <Sparkles className="h-4 w-4 mr-2" /> AI Phân tích Rủi ro
                    </Button>
                  </div>

                  <div className="p-6">
                    {hasSplit ? (
                      <div className="grid md:grid-cols-2 gap-6">
                        <div className="bg-blue-50/50 rounded-xl p-5 border border-blue-100 shadow-sm">
                          <h4 className="font-bold text-blue-800 flex items-center gap-2 mb-3">
                            <ShieldCheck className="w-4 h-4 text-blue-600" /> Nội quy phòng trọ
                          </h4>
                          <div className="text-sm text-blue-950 leading-relaxed whitespace-pre-wrap">
                            {landlordTerms || "Không có nội quy đặc biệt."}
                          </div>
                        </div>
                        <div className="bg-amber-50/50 rounded-xl p-5 border border-amber-100 shadow-sm">
                          <h4 className="font-bold text-amber-800 flex items-center gap-2 mb-3">
                            <MessageSquare className="w-4 h-4 text-amber-600" /> Yêu cầu từ khách thuê
                          </h4>
                          <div className="text-sm text-amber-950 leading-relaxed whitespace-pre-wrap">
                            {tenantRequests || "Không có yêu cầu thêm."}
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="text-sm text-gray-800 whitespace-pre-wrap leading-relaxed bg-muted/40/50 p-5 rounded-xl border border-gray-100">
                        {contract.additionalTerms}
                      </div>
                    )}

                    {/* KHUNG HIỂN THỊ KẾT QUẢ CỦA AI */}
                    {analysisResult && (
                      <div className="mt-6 p-5 bg-gradient-to-br from-purple-50 to-indigo-50 border border-purple-200 rounded-xl shadow-inner animate-in fade-in zoom-in-95">
                        <h4 className="font-bold text-purple-900 mb-3 flex items-center gap-2">
                          <Bot className="h-5 w-5 text-purple-600" /> Luật sư AI Đánh giá:
                        </h4>
                        <div
                          className="text-sm text-purple-950 leading-relaxed"
                          dangerouslySetInnerHTML={renderMarkdown(analysisResult)}
                        />
                      </div>
                    )}
                  </div>
                </div>
              );
            })()}

            {/* ═══ PHỤ LỤC HỢP ĐỒNG (Addendums) ═══ */}
            {changeRequests.filter(r => r.status === 'ACCEPTED').length > 0 && (
              <div className="bg-gradient-to-br from-amber-50 to-orange-50 rounded-2xl border border-amber-200 shadow-sm p-6">
                <h3 className="text-md font-bold mb-4 flex items-center gap-2 text-amber-900">
                  📝 Phụ lục Hợp đồng ({changeRequests.filter(r => r.status === 'ACCEPTED').length})
                </h3>
                <p className="text-xs text-amber-700 mb-4 -mt-2">
                  Các thay đổi đã được cả 2 bên đồng ý và áp dụng chính thức vào hợp đồng.
                </p>
                <div className="space-y-3">
                  {changeRequests
                    .filter(r => r.status === 'ACCEPTED')
                    .map((req, idx) => {
                      const typeLabels: Record<string, { label: string; color: string }> = {
                        'RENT_INCREASE': { label: 'Điều chỉnh Giá thuê', color: 'bg-orange-100 text-orange-800 border-orange-300' },
                        'EXTENSION': { label: 'Gia hạn Hợp đồng', color: 'bg-blue-100 text-blue-800 border-blue-300' },
                        'TERMINATION': { label: 'Chấm dứt sớm', color: 'bg-red-100 text-red-800 border-red-300' },
                        'CHANGE_TERMS': { label: 'Sửa Nội quy', color: 'bg-green-100 text-green-800 border-green-300' },
                        'CHANGE_SIGN_METHOD': { label: 'Đổi cách ký', color: 'bg-purple-100 text-purple-800 border-purple-300' },
                      };
                      const typeInfo = typeLabels[req.type] || { label: req.type, color: 'bg-gray-100 text-gray-800 border-gray-300' };

                      return (
                        <div key={req.id} className="bg-white rounded-xl p-4 border border-amber-200/70 shadow-sm">
                          <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center gap-2">
                              <span className="font-black text-amber-600 text-sm">Phụ lục #{idx + 1}</span>
                              <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold border ${typeInfo.color}`}>
                                {typeInfo.label}
                              </span>
                            </div>
                            <span className="text-[10px] text-gray-400">
                              {new Date(req.requestDate).toLocaleDateString('vi-VN')}
                            </span>
                          </div>
                          <div className="grid grid-cols-2 gap-2 text-xs">
                            <div className="bg-muted/40 p-2 rounded-lg">
                              <p className="text-[10px] text-gray-400 font-bold uppercase mb-0.5">Giá trị cũ</p>
                              <p className="text-gray-600 line-through">{req.type === 'RENT_INCREASE' ? Number(req.oldValue).toLocaleString('vi-VN') + 'đ' : req.oldValue || '—'}</p>
                            </div>
                            <div className="bg-emerald-50 p-2 rounded-lg">
                              <p className="text-[10px] text-emerald-500 font-bold uppercase mb-0.5">Giá trị mới</p>
                              <p className="text-emerald-700 font-bold">{req.type === 'RENT_INCREASE' ? Number(req.newValue).toLocaleString('vi-VN') + 'đ' : req.newValue}</p>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                </div>
              </div>
            )}


            {contract.smartContractAddress && (
              <div className="bg-indigo-50 border border-indigo-100 rounded-2xl p-6">
                <h3 className="text-lg font-bold text-indigo-900 mb-4 flex items-center gap-2">
                  <Blocks className="h-5 w-5 text-indigo-600" /> Dữ liệu Web3 (Smart Contract)
                </h3>
                <div className="space-y-3">
                  <div className="flex justify-between items-center text-sm border-b border-indigo-200/50 pb-2">
                    <span className="text-indigo-700">Contract Address</span>
                    <a href={`${runtimeBlockchainConfig.explorerUrl}/address/${contract.smartContractAddress}`} target="_blank" rel="noreferrer" className="font-mono text-indigo-900 hover:underline text-xs">
                      {contract.smartContractAddress.substring(0, 10)}...{contract.smartContractAddress.substring(38)}
                    </a>
                  </div>
                  
                  {/* Block quyết toán đã được di chuyển lên trên */}
                </div>
              </div>
            )}


            {/* ═══ HOÀN CỌC (Deposit Refund) ═══ */}
            {contract && (contract.status === 'EXPIRED' || contract.status === 'TERMINATED_EARLY') && contract.depositStatus !== 'REFUNDED' && user?.role === 'LANDLORD' && (
              <div className="bg-gradient-to-br from-rose-50 to-pink-50 rounded-2xl border border-rose-200 shadow-sm p-6">
                <h3 className="text-md font-bold mb-3 flex items-center gap-2 text-rose-900">
                  💸 Hoàn cọc cho Khách thuê
                </h3>
                <p className="text-xs text-rose-700 mb-4">
                  Hợp đồng đã kết thúc. Vui lòng hoàn cọc <strong>{contract.depositAmount?.toLocaleString('vi-VN')}đ</strong> cho khách thuê theo thông tin bên dưới.
                </p>

                {contract.signMethod === 'BLOCKCHAIN' ? (
                  <div className="bg-white rounded-xl p-4 border border-rose-200/70 space-y-2">
                    <p className="text-[10px] text-gray-400 font-bold uppercase">Ví Blockchain của Khách thuê</p>
                    <p className="font-mono text-sm text-indigo-700 break-all">{contract.tenantWalletAddress || 'Chưa cập nhật'}</p>
                    <p className="text-xs text-gray-500 mt-2">Chuyển ETH tương ứng từ ví cá nhân của bạn tới địa chỉ trên.</p>
                  </div>
                ) : (
                  <div className="bg-white rounded-xl p-4 border border-rose-200/70 space-y-3">
                    <p className="text-[10px] text-gray-400 font-bold uppercase">Thông tin ngân hàng Khách thuê</p>
                    <div className="grid grid-cols-2 gap-3 text-sm">
                      <div>
                        <p className="text-gray-400 text-xs">Ngân hàng</p>
                        <p className="font-bold text-gray-800">{contract.tenantBankName || 'Chưa cập nhật'}</p>
                      </div>
                      <div>
                        <p className="text-gray-400 text-xs">Số tài khoản</p>
                        <p className="font-bold text-gray-800 font-mono">{contract.tenantBankAccountNumber || '—'}</p>
                      </div>
                      <div>
                        <p className="text-gray-400 text-xs">Chủ tài khoản</p>
                        <p className="font-bold text-gray-800">{contract.tenantBankAccountHolder || '—'}</p>
                      </div>
                      <div>
                        <p className="text-gray-400 text-xs">SĐT</p>
                        <p className="font-bold text-gray-800">{contract.tenantPhone || '—'}</p>
                      </div>
                    </div>
                    {contract.tenantBankQrUrl && (
                      <div className="text-center mt-3">
                        <p className="text-[10px] text-gray-400 font-bold uppercase mb-2">Mã QR chuyển khoản</p>
                        <img src={contract.tenantBankQrUrl} alt="QR Banking" className="mx-auto max-w-[200px] rounded-lg border" />
                      </div>
                    )}
                  </div>
                )}

                <Button
                  className="w-full mt-4 bg-rose-600 hover:bg-rose-700"
                  onClick={() => setIsRefundConfirmOpen(true)}
                  isLoading={isConfirmingRefund}
                >
                  💸 Xác nhận đã hoàn cọc
                </Button>
              </div>
            )}

            {/* Khách thuê thấy trạng thái hoàn cọc */}
            {contract && (contract.status === 'EXPIRED' || contract.status === 'TERMINATED_EARLY') && user?.role === 'TENANT' && (
              <div className={`rounded-2xl border shadow-sm p-6 ${contract.depositStatus === 'REFUNDED' ? 'bg-green-50 border-green-200' :
                  contract.depositStatus === 'PENALIZED' ? 'bg-red-50 border-red-200' :
                    'bg-muted/40 border-gray-200'
                }`}>
                <h3 className="text-md font-bold mb-2 flex items-center gap-2">
                  💰 Trạng thái Tiền cọc
                </h3>
                {contract.depositStatus === 'REFUNDED' ? (
                  <p className="text-green-700 flex items-center gap-2"><CheckCircle2 className="h-5 w-5" /> Chủ trọ đã xác nhận hoàn cọc <strong>{contract.depositAmount?.toLocaleString('vi-VN')}đ</strong></p>
                ) : contract.depositStatus === 'PENALIZED' ? (
                  <p className="text-red-700 flex items-center gap-2"><XCircle className="h-5 w-5" /> Tiền cọc <strong>{contract.depositAmount?.toLocaleString('vi-VN')}đ</strong> đã bị giữ lại do chấm dứt hợp đồng sớm. Chờ Chủ trọ xác nhận hoàn cọc nếu có thỏa thuận khác.</p>
                ) : (
                  <p className="text-gray-600">Đang chờ xử lý từ Chủ trọ...</p>
                )}
              </div>
            )}

          </div>

          <div className="space-y-6">
            <div className="bg-white rounded-2xl border shadow-sm p-6 text-center">
              <h4 className="font-bold text-gray-900 mb-6">Trạng thái Hợp đồng</h4>

              {contract.status === 'CANCELLED' ? (
                <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-red-100 mb-4 ring-4 ring-red-50">
                  <XCircle className="h-10 w-10 text-red-600" />
                </div>
              ) : contract.status === 'ACTIVE' ? (
                <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-green-100 mb-4 ring-4 ring-green-50">
                  <CheckCircle className="h-10 w-10 text-green-600" />
                </div>
              ) : (
                <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-orange-100 mb-4 ring-4 ring-orange-50">
                  <PenTool className="h-10 w-10 text-orange-600" />
                </div>
              )}

              <p className="font-bold text-lg mb-1">
                {contract.status === 'ACTIVE' ? 'Đã có hiệu lực' :
                  (contract.status === 'AWAITING_DEPOSIT' || (contract.isLandlordSigned && contract.isTenantSigned && contract.status === 'PENDING_SIGNATURE')) ? 'Chờ nạp tiền cọc' : 
                  (contract.status === 'CANCELLED' || contract.status === 'EXPIRED') ? (
                    <span className="text-red-600">Đã bị từ chối/hủy/Hết hạn</span>
                  ) : contract.status === 'TERMINATED_EARLY' ? (
                    <span className="text-orange-600">Đã kết thúc sớm</span>
                  ) : 'Đang chờ ký xác nhận'}
              </p>

              {contract.status === 'CANCELLED' && contract.cancelReason && (
                <div className="mt-4 p-3 bg-red-50 border border-red-100 rounded-xl text-left">
                  <p className="text-[10px] text-red-400 font-bold uppercase mb-1 flex items-center gap-1">
                    <AlertCircle className="w-3 h-3" /> Lý do từ chối:
                  </p>
                  <p className="text-sm text-red-700 italic">“{contract.cancelReason}”</p>
                </div>
              )}

              {contract.status !== 'ACTIVE' && (
                <div className="mt-6 space-y-3">
                  {contract.status !== 'PENDING_APPROVAL' && (
                    <div className="flex flex-col gap-2 text-sm text-left bg-muted/40/50 p-4 rounded-xl border border-gray-100 mb-4">
                      <p className="font-bold text-gray-800 mb-1">Tiến độ ký kết:</p>
                      <div className="flex items-center justify-between">
                        <span className={contract.isLandlordSigned ? 'text-green-700 font-medium' : 'text-gray-500'}>1. Chủ nhà</span>
                        {contract.isLandlordSigned ? <CheckCircle2 className="w-4 h-4 text-green-500" /> : <Clock className="w-4 h-4 text-gray-400" />}
                      </div>
                      <div className="flex items-center justify-between">
                        <span className={contract.isTenantSigned ? 'text-green-700 font-medium' : 'text-gray-500'}>2. Khách thuê</span>
                        {contract.isTenantSigned ? <CheckCircle2 className="w-4 h-4 text-green-500" /> : <Clock className="w-4 h-4 text-gray-400" />}
                      </div>
                    </div>
                  )}

                  {contract.status === 'PENDING_APPROVAL' && user?.role === 'LANDLORD' ? (
                    <div className="space-y-3">
                      <Button
                        className="w-full gap-2 h-11 bg-indigo-600 hover:bg-indigo-700 text-white shadow-md shadow-indigo-500/20"
                        onClick={() => setIsApproveModalOpen(true)}
                        isLoading={isApproving}
                      >
                        <CheckCircle2 className="h-4 w-4" /> Phê duyệt người thuê này
                      </Button>
                      <Button
                        variant="outline"
                        className="w-full gap-2 h-11 text-red-600 border-red-200 hover:bg-red-50 hover:text-red-700"
                        onClick={() => setIsRejectModalOpen(true)}
                      >
                        <XCircle className="h-4 w-4" /> Từ chối yêu cầu
                      </Button>
                    </div>
                  ) : !isMeSigned && contract.status === 'PENDING_SIGNATURE' ? (
                    <div className="space-y-3">
                      <Button
                        className="w-full gap-2 h-11 shadow-md shadow-blue-500/20"
                        onClick={() => setIsSignModalOpen(true)}
                        disabled={!!pendingRequest}
                      >
                        <PenTool className="h-4 w-4" /> Ký xác nhận
                      </Button>
                      
                      {user?.role === 'LANDLORD' && (
                        <Button
                          variant="outline"
                          className="w-full gap-2 h-11 text-red-600 border-red-200 hover:bg-red-50 hover:text-red-700"
                          onClick={() => setIsRejectModalOpen(true)}
                        >
                          <XCircle className="h-4 w-4" /> Từ chối yêu cầu
                        </Button>
                      )}
                    </div>
                  ) : (
                    !isPartnerSigned && contract.status === 'PENDING_SIGNATURE' && (
                      <div className="flex items-center justify-center gap-2 p-3 bg-blue-50 border border-blue-200 text-blue-700 text-sm font-semibold rounded-lg">
                        <Loader2 className="w-4 h-4 animate-spin" /> Đang chờ đối tác ký...
                      </div>
                    )
                  )}

                  {contract.status === 'AWAITING_DEPOSIT' && (
                    <div className="mt-4 p-4 bg-orange-50 border border-orange-200 rounded-xl space-y-4">
                      <p className="text-sm text-orange-800 font-medium">
                        {user?.role === 'TENANT'
                          ? "Mọi người đã ký xong! Vui lòng thực hiện nạp cọc để hợp đồng có hiệu lực."
                          : "Mọi người đã ký xong! Đang chờ khách thuê nạp cọc để kích hoạt hợp đồng."}
                      </p>

                      {/* HIỂN THỊ THỜI HẠN 24H VÀ CẢNH BÁO PHẠT */}
                      <div className="bg-white/60 p-3 rounded-lg border border-orange-200 text-[11px] space-y-2">
                        <div className="flex items-center gap-2 text-orange-900 font-bold">
                          <Clock className="w-3 h-3" /> THỜI HẠN NẠP CỌC: 24 GIỜ
                        </div>
                        <p className="text-gray-600 leading-tight">
                          Sau 24h kể từ khi ký ({contract.signDate ? new Date(new Date(contract.signDate).getTime() + 24*60*60*1000).toLocaleString('vi-VN') : '—'}), nếu không nạp cọc, hợp đồng sẽ <strong>tự động bị hủy</strong>.
                        </p>
                        {user?.role === 'TENANT' && (
                          <p className="text-red-600 font-bold flex items-start gap-1">
                            <AlertCircle className="w-3 h-3 shrink-0 mt-0.5" /> 
                            Lưu ý: Bạn sẽ bị trừ 10 điểm uy tín nếu để hợp đồng quá hạn nạp cọc.
                          </p>
                        )}
                      </div>

                      {user?.role === 'TENANT' && contract.signMethod === 'BLOCKCHAIN' && (
                        <Button
                          className="w-full gap-2 bg-orange-600 hover:bg-orange-700 h-11 shadow-lg shadow-orange-200"
                          onClick={handleConfirmWeb3Deposit}
                          isLoading={isConfirmingDeposit}
                        >
                          <Blocks className="w-4 h-4" /> Nạp cọc Web3 ngay
                        </Button>
                      )}

                      {user?.role === 'TENANT' && contract.signMethod === 'TRADITIONAL' && (
                        <div className="flex flex-col gap-3">
                          <Button
                            className="w-full gap-2 bg-blue-600 hover:bg-blue-700 h-11 shadow-lg shadow-blue-200"
                            onClick={handleOpenDepositQrModal}
                            isLoading={isLoadingQr}
                          >
                            <QrCode className="w-4 h-4" /> Thanh toán Cọc (Mã VietQR)
                          </Button>
                        </div>
                      )}
                    </div>
                  )}

                  {!pendingRequest && !isMeSigned && (
                    <Button
                      variant="outline"
                      className="w-full h-11 border-orange-500 text-orange-600 hover:bg-orange-50"
                      onClick={() => {
                        setChangeForm(prev => ({ ...prev, type: 'CHANGE_TERMS', newValue: '' }));
                        setIsRequestModalOpen(true);
                      }}
                    >
                      <MessageSquare className="h-4 w-4 mr-2" /> Đề xuất chỉnh sửa
                    </Button>
                  )}
                </div>
              )}

              {contract.status === 'ACTIVE' && (
                <div className="mt-6 space-y-3">
                  {!pendingRequest && !changeRequests.some(r => r.type === 'TERMINATION' && r.status === 'ACCEPTED') && (
                    <Button
                      variant="outline"
                      className="w-full h-11 border-orange-500 text-orange-600 hover:bg-orange-50"
                      onClick={() => {
                        setChangeForm(prev => ({ ...prev, type: user?.role === 'TENANT' ? 'TERMINATION' : 'EXTENSION', newValue: '' }));
                        setIsRequestModalOpen(true);
                      }}
                    >
                      <MessageSquare className="h-4 w-4 mr-2" /> {user?.role === 'TENANT' ? 'Đề xuất Trả phòng / Cập nhật' : 'Đề xuất Gia hạn / Cập nhật HĐ'}
                    </Button>
                  )}
                  {user?.role === 'TENANT' && (
                    <Button
                      className="w-full gap-2 h-11 bg-yellow-500 hover:bg-yellow-600 text-white shadow-md shadow-yellow-200"
                      onClick={() => setIsReviewModalOpen(true)}
                    >
                      <Star className="h-4 w-4 fill-white" /> Viết Đánh Giá
                    </Button>
                  )}
                </div>
              )}
            </div>

            <Button
              variant="outline"
              className="w-full justify-start gap-3 h-12 bg-white"
              onClick={handleDownloadPDF}
              isLoading={isDownloading}
            >
              <Download className="w-4 h-4 text-gray-500" /> Tải bản PDF
            </Button>

            {/* ────── HỒ SƠ NGƯỜI THUÊ (DÀNH CHO CHỦ NHÀ) ────── */}
            {user?.role === 'LANDLORD' && (contract.status === 'PENDING_SIGNATURE' || contract.status === 'PENDING_APPROVAL') && (
              <div className="bg-white rounded-2xl border-2 border-indigo-100 shadow-sm overflow-hidden animate-in fade-in slide-in-from-right-4 duration-500">
                <div className="p-4 bg-indigo-50 border-b border-indigo-100">
                  <h4 className="font-bold text-indigo-900 flex items-center gap-2">
                    <User className="w-4 h-4" /> Hồ sơ Đối tác gửi yêu cầu
                  </h4>
                </div>
                <div className="p-5 space-y-4">
                   <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-full bg-gray-200 flex items-center justify-center text-gray-500 font-bold text-lg border-2 border-white shadow-sm overflow-hidden">
                        {contract.tenantName?.charAt(0)}
                      </div>
                      <div className="flex-1">
                        <h5 className="font-bold text-gray-900 leading-tight">{contract.tenantName}</h5>
                        <p className="text-[11px] text-gray-400 font-medium">Khách hàng tiềm năng</p>
                      </div>
                      <div className="text-right">
                         <div className={cn(
                           "text-xl font-black",
                           (contract.tenantReputationScore ?? 0) >= 80 ? "text-green-500" :
                           (contract.tenantReputationScore ?? 0) >= 50 ? "text-amber-500" : "text-rose-500"
                         )}>
                           {contract.tenantReputationScore ?? 0}
                         </div>
                         <p className="text-[9px] uppercase font-bold text-gray-400">Uy tín</p>
                      </div>
                   </div>

                   <div className="grid grid-cols-2 gap-3 pb-2">
                      <div className="p-3 rounded-xl bg-muted/40 border border-gray-100">
                         <p className="text-[10px] text-gray-400 font-bold uppercase mb-1">Định danh KYC</p>
                         <div className="flex items-center gap-1.5">
                            {contract.tenantKycStatus === 'VERIFIED' ? (
                               <>
                                 <CheckCircle className="w-3 h-3 text-green-500" />
                                 <span className="text-xs font-bold text-green-700">Đã xác thực</span>
                               </>
                            ) : (
                               <>
                                 <AlertCircle className="w-3 h-3 text-amber-500" />
                                 <span className="text-xs font-bold text-amber-700">Chưa xác thực</span>
                               </>
                            )}
                         </div>
                      </div>
                      <div className="p-3 rounded-xl bg-muted/40 border border-gray-100">
                        <p className="text-[10px] text-gray-400 font-bold uppercase mb-1">Mức độ tin cậy</p>
                        <div className="flex items-center gap-1.5">
                           {(contract.tenantReputationScore ?? 0) >= 80 ? (
                              <>
                                <CheckCircle2 className="w-3 h-3 text-green-500" /> 
                                <span className="text-xs font-bold text-green-700">Rất cao</span>
                              </>
                           ) : (contract.tenantReputationScore ?? 0) >= 50 ? (
                              <>
                                <TrendingUp className="w-3 h-3 text-indigo-500" /> 
                                <span className="text-xs font-bold text-indigo-700">Trung bình</span>
                              </>
                           ) : (
                              <>
                                <AlertCircle className="w-3 h-3 text-rose-500" /> 
                                <span className="text-xs font-bold text-rose-700">Thấp</span>
                              </>
                           )}
                        </div>
                      </div>
                   </div>

                     </div>
                  </div>
              )}
          </div>
        </div>
    </>
  );
}

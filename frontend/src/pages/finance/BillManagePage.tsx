import { useState, useEffect } from 'react';
import { 
  Receipt, Zap, Droplets, CheckCircle2, AlertCircle, 
  Clock, Search, Plus, FileText, ChevronLeft, ChevronRight, 
  Blocks, Loader2, X, Calendar, Printer
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { toast } from 'sonner';
import { billApi } from '@/api/billApi';

interface ContractBilling {
  id: number;
  roomName: string;
  tenantName: string;
  actualPrice: number;
  elecPrice: number;
  waterPrice: number;
  internetPrice: number;
  billStatus: string; 
  oldElecIndex: number;
  oldWaterIndex: number;
  totalAmount?: number;
  deadline?: string;
  paymentMethod?: string;
}

export default function BillManagePage() {
  const [currentMonth, setCurrentMonth] = useState(new Date().getMonth() + 1);
  const [currentYear, setCurrentYear] = useState(new Date().getFullYear());
  
  const [contracts, setContracts] = useState<ContractBilling[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // State cho Tìm kiếm
  const [searchTerm, setSearchTerm] = useState('');

  // State quản lý Modal Chốt điện nước (Tạo Hóa Đơn)
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedContract, setSelectedContract] = useState<ContractBilling | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // State quản lý Modal Xem Chi tiết (Biên Lai)
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [viewingContract, setViewingContract] = useState<ContractBilling | null>(null);

  const [formData, setFormData] = useState({
    newElecIndex: '',
    newWaterIndex: '',
  });

  const fetchBillingStatus = async () => {
    try {
      setIsLoading(true);
      const res = await billApi.getBillingStatus(currentMonth, currentYear);
      setContracts((res as any).data || res);
    } catch (error) {
      toast.error("Không thể tải trạng thái hóa đơn của tháng này!");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchBillingStatus();
  }, [currentMonth, currentYear]);

  const handlePrevMonth = () => {
    if (currentMonth === 1) { setCurrentMonth(12); setCurrentYear(y => y - 1); } 
    else { setCurrentMonth(m => m - 1); }
  };

  const handleNextMonth = () => {
    if (currentMonth === 12) { setCurrentMonth(1); setCurrentYear(y => y + 1); } 
    else { setCurrentMonth(m => m + 1); }
  };

  const openBillingModal = (contract: ContractBilling) => {
    setSelectedContract(contract);
    setFormData({ newElecIndex: '', newWaterIndex: '' });
    setIsModalOpen(true);
  };

  const openDetailModal = (contract: ContractBilling) => {
    setViewingContract(contract);
    setIsDetailModalOpen(true);
  };

  const handleGenerateBill = async () => {
    if (!selectedContract) return;
    
    if (!formData.newElecIndex || !formData.newWaterIndex) {
      toast.warning("Vui lòng nhập đầy đủ chỉ số điện và nước mới!");
      return;
    }
    if (Number(formData.newElecIndex) < selectedContract.oldElecIndex || Number(formData.newWaterIndex) < selectedContract.oldWaterIndex) {
      toast.error("Chỉ số mới không được nhỏ hơn chỉ số cũ!");
      return;
    }

    try {
      setIsSubmitting(true);
      
      await billApi.createBill({
        contractId: selectedContract.id,
        month: currentMonth,
        year: currentYear,
        oldElecIndex: selectedContract.oldElecIndex,
        newElecIndex: Number(formData.newElecIndex),
        oldWaterIndex: selectedContract.oldWaterIndex,
        newWaterIndex: Number(formData.newWaterIndex),
      });

      toast.success(`Đã xuất hóa đơn phòng ${selectedContract.roomName} thành công!`);
      setIsModalOpen(false);
      fetchBillingStatus();
      
    } catch (error: any) {
      toast.error(error.response?.data?.message || "Lỗi tạo hóa đơn. Vui lòng kiểm tra lại hệ thống!");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Logic Tìm kiếm
  const filteredContracts = contracts.filter(c => 
    c.roomName.toLowerCase().includes(searchTerm.toLowerCase()) || 
    c.tenantName.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const paidAmount = contracts.filter(c => c.billStatus === 'PAID').reduce((sum, c) => sum + (c.totalAmount || 0), 0);
  const unpaidAmount = contracts.filter(c => c.billStatus === 'UNPAID').reduce((sum, c) => sum + (c.totalAmount || 0), 0);
  const lateAmount = contracts.filter(c => c.billStatus === 'LATE').reduce((sum, c) => sum + (c.totalAmount || 0), 0);
  const unbilledCount = contracts.filter(c => c.billStatus === 'UNBILLED').length;

  return (
    <div className="space-y-6 pb-20">
      {/* HEADER */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-xl border shadow-sm">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Receipt className="h-6 w-6 text-primary" /> Quản lý thu chi
          </h1>
          <p className="text-sm text-gray-500 mt-1">Chốt chỉ số điện nước và quản lý thanh toán hàng tháng.</p>
        </div>

        <div className="flex items-center bg-gray-50 rounded-lg p-1 border">
          <Button variant="ghost" size="icon" onClick={handlePrevMonth}><ChevronLeft className="h-5 w-5 text-gray-600" /></Button>
          <div className="px-4 font-bold text-lg text-primary min-w-[120px] text-center">
            Tháng {currentMonth}/{currentYear}
          </div>
          <Button variant="ghost" size="icon" onClick={handleNextMonth}><ChevronRight className="h-5 w-5 text-gray-600" /></Button>
        </div>
      </div>

      {/* THỐNG KÊ */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <StatCard title="Đã thu (PAID)" value={`${paidAmount.toLocaleString()}đ`} color="text-green-600" bg="bg-green-50" />
        <StatCard title="Chờ đóng (UNPAID)" value={`${unpaidAmount.toLocaleString()}đ`} color="text-yellow-600" bg="bg-yellow-50" />
        <StatCard title="Quá hạn (LATE)" value={`${lateAmount.toLocaleString()}đ`} color="text-red-600" bg="bg-red-50" />
        <StatCard title="Chưa chốt sổ" value={`${unbilledCount} Phòng`} color="text-gray-600" bg="bg-gray-100" />
      </div>

      {/* DANH SÁCH */}
      <div className="bg-white rounded-xl border shadow-sm overflow-hidden">
        <div className="p-4 border-b flex justify-between items-center bg-gray-50">
          <h3 className="font-bold text-gray-800">Tình trạng thanh toán tháng {currentMonth}</h3>
          
          <div className="relative w-full max-w-xs">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input 
              className="pl-9 h-9 text-sm" 
              placeholder="Tìm tên phòng, người thuê..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>
        
        <div className="overflow-x-auto min-h-[300px]">
          {isLoading ? (
            <div className="flex justify-center items-center h-40">
               <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : filteredContracts.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-40 text-gray-500">
                <Receipt className="h-8 w-8 mb-2 opacity-20" />
                <p>{searchTerm ? "Không tìm thấy phòng phù hợp với từ khóa." : "Không có hợp đồng nào đang hiệu lực trong tháng này."}</p>
            </div>
          ) : (
            <table className="w-full text-sm text-left">
              <thead className="text-xs text-gray-500 uppercase bg-gray-100/50">
                <tr>
                  <th className="px-6 py-4 font-semibold">Phòng</th>
                  <th className="px-6 py-4 font-semibold">Người thuê</th>
                  <th className="px-6 py-4 font-semibold text-right">Tổng tiền (VNĐ)</th>
                  <th className="px-6 py-4 font-semibold text-center">Trạng thái</th>
                  <th className="px-6 py-4 font-semibold text-right">Thao tác</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {filteredContracts.map((contract) => (
                  <tr key={contract.id} className="hover:bg-gray-50/50 transition-colors">
                    <td className="px-6 py-4 font-bold text-gray-900">{contract.roomName}</td>
                    <td className="px-6 py-4 text-gray-600">{contract.tenantName}</td>
                    <td className="px-6 py-4 text-right font-bold text-gray-900">
                      {contract.totalAmount ? contract.totalAmount.toLocaleString() + 'đ' : '---'}
                    </td>
                    <td className="px-6 py-4 text-center">
                      {contract.billStatus === 'UNBILLED' && <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium bg-gray-100 text-gray-600"><EditIcon /> Chưa chốt</span>}
                      {contract.billStatus === 'UNPAID' && <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-bold bg-yellow-100 text-yellow-700"><Clock className="h-3.5 w-3.5" /> Chờ thu</span>}
                      {contract.billStatus === 'PAID' && (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-bold bg-green-100 text-green-700">
                          {contract.paymentMethod === 'BLOCKCHAIN' ? <Blocks className="h-3.5 w-3.5" /> : <CheckCircle2 className="h-3.5 w-3.5" />} 
                          Đã thanh toán
                        </span>
                      )}
                      {contract.billStatus === 'LATE' && <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-bold bg-red-100 text-red-700"><AlertCircle className="h-3.5 w-3.5" /> Quá hạn</span>}
                    </td>
                    <td className="px-6 py-4 text-right">
                      {contract.billStatus === 'UNBILLED' ? (
                        <Button size="sm" onClick={() => openBillingModal(contract)} className="bg-primary/10 text-primary hover:bg-primary hover:text-white transition-colors">
                          <Plus className="h-4 w-4 mr-1" /> Chốt sổ ngay
                        </Button>
                      ) : (
                        <Button size="sm" variant="outline" className="text-gray-600 hover:text-primary hover:bg-primary/5" onClick={() => openDetailModal(contract)}>
                          <FileText className="h-4 w-4 mr-1" /> Chi tiết
                        </Button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* --- MODAL CHỐT SỔ ĐIỆN NƯỚC (TẠO HÓA ĐƠN) --- */}
      {isModalOpen && selectedContract && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 animate-in fade-in">
          <div className="bg-white rounded-xl w-full max-w-lg overflow-hidden shadow-2xl animate-in zoom-in-95">
            <div className="px-6 py-4 border-b bg-gray-50 flex justify-between items-center">
              <div>
                <h2 className="text-lg font-bold">Phòng {selectedContract.roomName} - {selectedContract.tenantName}</h2>
                <p className="text-xs text-gray-500 mt-1">Kỳ hóa đơn: Tháng {currentMonth}/{currentYear}</p>
              </div>
              <div className="text-right">
                <p className="text-xs text-gray-500">Tiền phòng cố định</p>
                <p className="font-bold text-blue-600">{selectedContract.actualPrice.toLocaleString()}đ</p>
              </div>
            </div>
            
            <div className="p-6 space-y-6">
              <div className="bg-orange-50/50 p-4 rounded-xl border border-orange-100">
                <div className="flex justify-between items-center mb-3 text-orange-600 font-bold">
                  <span className="flex items-center gap-2"><Zap className="h-5 w-5" /> Chỉ số Điện</span>
                  <span className="text-xs font-normal text-orange-800 bg-orange-100 px-2 py-1 rounded">{(selectedContract.elecPrice || 0).toLocaleString()}đ/kWh</span>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs text-gray-500">Số cũ</label>
                    <Input disabled value={selectedContract.oldElecIndex || 0} className="bg-gray-100 font-mono mt-1 text-gray-500" />
                  </div>
                  <div>
                    <label className="text-xs font-bold text-gray-900">Số mới *</label>
                    <Input type="number" autoFocus className="border-orange-300 focus-visible:ring-orange-400 font-mono mt-1" value={formData.newElecIndex} onChange={e => setFormData({...formData, newElecIndex: e.target.value})} />
                  </div>
                </div>
              </div>

              <div className="bg-blue-50/50 p-4 rounded-xl border border-blue-100">
                <div className="flex justify-between items-center mb-3 text-blue-600 font-bold">
                  <span className="flex items-center gap-2"><Droplets className="h-5 w-5" /> Chỉ số Nước</span>
                  <span className="text-xs font-normal text-blue-800 bg-blue-100 px-2 py-1 rounded">{(selectedContract.waterPrice || 0).toLocaleString()}đ/khối</span>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs text-gray-500">Số cũ</label>
                    <Input disabled value={selectedContract.oldWaterIndex || 0} className="bg-gray-100 font-mono mt-1 text-gray-500" />
                  </div>
                  <div>
                    <label className="text-xs font-bold text-gray-900">Số mới *</label>
                    <Input type="number" className="border-blue-300 focus-visible:ring-blue-400 font-mono mt-1" value={formData.newWaterIndex} onChange={e => setFormData({...formData, newWaterIndex: e.target.value})} />
                  </div>
                </div>
              </div>
            </div>

            <div className="px-6 py-4 border-t bg-gray-50 flex justify-end gap-3">
              <Button variant="ghost" onClick={() => setIsModalOpen(false)} disabled={isSubmitting}>Hủy</Button>
              <Button onClick={handleGenerateBill} isLoading={isSubmitting}>Phát hành Hóa đơn</Button>
            </div>
          </div>
        </div>
      )}

      {/* ✅ MODAL CHI TIẾT HÓA ĐƠN (BIÊN LAI CHUYÊN NGHIỆP) */}
      {isDetailModalOpen && viewingContract && (
         <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 animate-in fade-in">
           <div className="bg-white w-full max-w-md overflow-hidden shadow-2xl animate-in zoom-in-95 relative" style={{ borderRadius: '12px', clipPath: 'polygon(0 0, 100% 0, 100% 100%, 0 100%)' }}>
              
              {/* Nút Đóng */}
              <button onClick={() => setIsDetailModalOpen(false)} className="absolute top-4 right-4 text-gray-400 hover:text-gray-800 bg-white/80 rounded-full p-1 z-10">
                <X className="h-5 w-5" />
              </button>

              {/* Phần Header Biên Lai */}
              <div className="bg-gray-50 px-6 pt-8 pb-4 text-center border-b border-dashed border-gray-300">
                 <div className="bg-primary/10 w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-2">
                    <Receipt className="h-6 w-6 text-primary" />
                 </div>
                 <h2 className="text-xl font-bold text-gray-900 uppercase tracking-wide">Hóa Đơn Tiền Nhà</h2>
                 <p className="text-sm font-medium text-gray-500 mt-1">Phòng {viewingContract.roomName} • Tháng {currentMonth}/{currentYear}</p>
                 
                 <div className="mt-3">
                   {viewingContract.billStatus === 'UNPAID' && <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-yellow-100 text-yellow-700"><Clock className="h-3.5 w-3.5" /> Chờ thanh toán</span>}
                   {viewingContract.billStatus === 'PAID' && <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-green-100 text-green-700"><CheckCircle2 className="h-3.5 w-3.5" /> Đã thanh toán</span>}
                   {viewingContract.billStatus === 'LATE' && <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-red-100 text-red-700"><AlertCircle className="h-3.5 w-3.5" /> Quá hạn thanh toán</span>}
                 </div>
              </div>

              {/* Phần Chi tiết (Bóc tách từng khoản) */}
              <div className="p-6 space-y-5 bg-white">
                 
                 {/* Thông tin người thuê */}
                 <div className="flex justify-between items-end border-b pb-3">
                    <div>
                        <p className="text-xs text-gray-500 uppercase font-semibold">Khách hàng</p>
                        <p className="font-bold text-gray-900 text-base">{viewingContract.tenantName}</p>
                    </div>
                    {viewingContract.deadline && (
                    <div className="text-right">
                        <p className="text-xs text-gray-500 uppercase font-semibold">Hạn thanh toán</p>
                        <p className="font-bold text-red-600 text-sm">{new Date(viewingContract.deadline).toLocaleDateString('vi-VN')}</p>
                    </div>
                    )}
                 </div>

                 {/* Các khoản phí */}
                 <div className="space-y-3">
                     {/* 1. Tiền phòng */}
                     <div className="flex justify-between items-center text-sm">
                        <span className="font-medium text-gray-700">1. Tiền thuê phòng</span>
                        <span className="font-semibold text-gray-900">{viewingContract.actualPrice?.toLocaleString()}đ</span>
                     </div>

                     {/* 2. Tiền điện */}
                     <div className="flex justify-between items-start text-sm">
                        <div>
                            <span className="font-medium text-gray-700 block">2. Tiền điện</span>
                            <span className="text-xs text-gray-400">Đơn giá: {viewingContract.elecPrice?.toLocaleString()}đ/kWh</span>
                        </div>
                        <span className="font-semibold text-gray-900">
                            {viewingContract.totalAmount ? 'Theo đồng hồ' : '---'}
                        </span>
                     </div>

                     {/* 3. Tiền nước */}
                     <div className="flex justify-between items-start text-sm">
                        <div>
                            <span className="font-medium text-gray-700 block">3. Tiền nước</span>
                            <span className="text-xs text-gray-400">Đơn giá: {viewingContract.waterPrice?.toLocaleString()}đ/khối</span>
                        </div>
                        <span className="font-semibold text-gray-900">
                            {viewingContract.totalAmount ? 'Theo đồng hồ' : '---'}
                        </span>
                     </div>

                     {/* 4. Internet / Dịch vụ */}
                     <div className="flex justify-between items-center text-sm">
                        <span className="font-medium text-gray-700">4. Phí Dịch vụ (Internet, Rác...)</span>
                        <span className="font-semibold text-gray-900">{viewingContract.internetPrice?.toLocaleString()}đ</span>
                     </div>
                 </div>
                 
                 {/* Divider răng cưa */}
                 <div className="relative flex items-center py-2">
                    <div className="flex-grow border-t-2 border-dashed border-gray-200"></div>
                 </div>

                 {/* Tổng tiền */}
                 <div className="flex justify-between items-end">
                    <div>
                        <span className="font-bold text-gray-900 text-lg uppercase">Tổng cộng</span>
                        {viewingContract.paymentMethod === 'BLOCKCHAIN' && (
                            <p className="text-xs font-bold text-blue-600 flex items-center gap-1 mt-1"><Blocks className="h-3 w-3" /> Paid via SmartContract</p>
                        )}
                    </div>
                    <span className="font-black text-3xl text-primary">{(viewingContract.totalAmount || viewingContract.actualPrice).toLocaleString()}đ</span>
                 </div>
              </div>

              {/* Răng cưa đáy biên lai (CSS trick) */}
              <div className="h-4 bg-white" style={{ backgroundImage: 'radial-gradient(circle at 10px 10px, transparent 12px, #f9fafb 13px)', backgroundSize: '20px 20px', backgroundPosition: 'bottom' }}></div>
              <div className="bg-gray-50 p-4 text-center">
                  <Button className="w-full" variant="outline" onClick={() => window.print()}>
                      <Printer className="h-4 w-4 mr-2" /> In Biên Lai
                  </Button>
              </div>
           </div>
         </div>
      )}
    </div>
  );
}

const StatCard = ({ title, value, color, bg }: any) => (
  <div className={`${bg} rounded-xl p-4 border border-black/5`}>
    <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">{title}</p>
    <p className={`text-2xl font-black ${color}`}>{value}</p>
  </div>
);

const EditIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 20h9"/>
    <path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z"/>
  </svg>
);
import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { 
  Receipt, Zap, Droplets, CheckCircle2, AlertCircle, 
  Clock, Search, FileText, ChevronLeft, ChevronRight, 
  Blocks, Loader2, X, Calendar, Printer, Camera, Filter, ArrowUpDown
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { PageHeader } from '@/components/ui/PageHeader';
import { EmptyState } from '@/components/ui/EmptyState';
import { Skeleton } from '@/components/ui/Skeleton';
import StatusBadge from '@/components/shared/StatusBadge';
import { toast } from 'sonner';
import { billApi } from '@/api/billApi';
import { propertyApi } from '@/api/propertyApi';
import type { ContractBilling } from '@/types/index';

const formatCurrency = (amount: number) => amount.toLocaleString('vi-VN') + 'đ';
const formatDate = (dateString?: string) => {
  if (!dateString) return 'Chưa cập nhật';
  const date = new Date(dateString);
  return date.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' });
};

export default function BillManagePage() {
  const [currentMonth, setCurrentMonth] = useState(new Date().getMonth() + 1);
  const [currentYear, setCurrentYear] = useState(new Date().getFullYear());
  const [contracts, setContracts] = useState<ContractBilling[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // --- FILTER & SORT STATES ---
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('ALL');
  const [sortBy, setSortBy] = useState('ROOM_ASC');

  // Modals state
  const [selectedContract, setSelectedContract] = useState<ContractBilling | null>(null);
  const [isChotSoModalOpen, setIsChotSoModalOpen] = useState(false);
  
  const [viewingContract, setViewingContract] = useState<ContractBilling | null>(null);
  const [isReceiptModalOpen, setIsReceiptModalOpen] = useState(false);

  // Form states cho Chốt sổ
  const [newElec, setNewElec] = useState<string>('');
  const [newWater, setNewWater] = useState<string>('');
  const [additionalFee, setAdditionalFee] = useState<string>('');
  const [discountAmount, setDiscountAmount] = useState<string>('');
  const [note, setNote] = useState('');
  
  // Trạng thái cho nút xác nhận thu tiền
  const [isConfirmingPayment, setIsConfirmingPayment] = useState<number | null>(null);
  const [deadlineDate, setDeadlineDate] = useState(''); 

  // State quản lý ảnh
  const [meterFiles, setMeterFiles] = useState<{ elec: File | null, water: File | null }>({ elec: null, water: null });
  const [meterPreviews, setMeterPreviews] = useState<{ elec: string, water: string }>({ elec: '', water: '' });

  // States tính toán Real-time
  const [previewTotal, setPreviewTotal] = useState<number>(0);
  const [isMeterReset, setIsMeterReset] = useState<boolean>(false);

  // States cho Thực Thu Popup
  const [paymentModalOpen, setPaymentModalOpen] = useState(false);
  const [selectedBillForPayment, setSelectedBillForPayment] = useState<ContractBilling | null>(null);
  const [actualPaidDate, setActualPaidDate] = useState<string>(new Date().toISOString().slice(0, 16));

  const fetchBillingStatus = async () => {
    setIsLoading(true);
    try {
      const res = await billApi.getBillingStatus(currentMonth, currentYear);
      if (res.data) setContracts(res.data);
    } catch (error) {
      toast.error('Không thể tải dữ liệu hóa đơn.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleConfirmPaymentClick = (contract: ContractBilling) => {
    setSelectedBillForPayment(contract);
    setActualPaidDate(new Date().toISOString().slice(0, 16));
    setPaymentModalOpen(true);
  };

  const executeConfirmPayment = async () => {
    if (!selectedBillForPayment || !selectedBillForPayment.billId) {
      toast.error("Không tìm thấy mã hóa đơn!");
      return;
    }
    const contract = selectedBillForPayment;
    setIsConfirmingPayment(contract.billId!);
    try {
      await billApi.landlordConfirmPayment(contract.billId!, actualPaidDate);
      toast.success("Đã xác nhận thu tiền thành công!");
      
      // Cập nhật state ngay lập tức
      setContracts(contracts.map(c => 
        c.billId === contract.billId ? { ...c, billStatus: 'PAID' } : c
      ));
      setPaymentModalOpen(false);
      setSelectedBillForPayment(null);
    } catch (error: any) {
      toast.error(error.response?.data?.message || "Lỗi khi xác nhận thanh toán");
    } finally {
      setIsConfirmingPayment(null);
    }
  };

  useEffect(() => { fetchBillingStatus(); }, [currentMonth, currentYear]);

  // Logic Tính Tiền Real-time
  useEffect(() => {
    if (!selectedContract) return;

    let elecUsed = 0;
    let waterUsed = 0;
    
    if (isMeterReset && Number(newElec) < selectedContract.oldElecIndex) {
      elecUsed = (10000 - selectedContract.oldElecIndex) + Number(newElec);
    } else {
      elecUsed = Math.max(0, Number(newElec) - selectedContract.oldElecIndex);
    }

    if (isMeterReset && Number(newWater) < selectedContract.oldWaterIndex) {
      waterUsed = (1000 - selectedContract.oldWaterIndex) + Number(newWater);
    } else {
      waterUsed = Math.max(0, Number(newWater) - selectedContract.oldWaterIndex);
    }
    
    const elecCost = elecUsed * selectedContract.elecPrice;
    const waterCost = waterUsed * selectedContract.waterPrice;
    const roomCost = selectedContract.actualPrice;
    const internetCost = selectedContract.internetPrice || 0;
    
    const extra = Number(additionalFee) || 0;
    const discount = Number(discountAmount) || 0;

    const total = roomCost + elecCost + waterCost + internetCost + extra - discount;
    setPreviewTotal(Math.max(0, total)); 
  }, [newElec, newWater, additionalFee, discountAmount, selectedContract, isMeterReset]);


  const handlePrevMonth = () => {
    if (currentMonth === 1) { setCurrentMonth(12); setCurrentYear(prev => prev - 1); } 
    else { setCurrentMonth(prev => prev - 1); }
  };

  const handleNextMonth = () => {
    const now = new Date();
    if (currentYear > now.getFullYear() || (currentYear === now.getFullYear() && currentMonth >= now.getMonth() + 1)) {
        return; 
    }
    if (currentMonth === 12) { setCurrentMonth(1); setCurrentYear(prev => prev + 1); } 
    else { setCurrentMonth(prev => prev + 1); }
  };

  const openChotSoModal = (contract: ContractBilling) => {
    setSelectedContract(contract);
    setNewElec(''); setNewWater('');
    setAdditionalFee(''); setDiscountAmount(''); setNote('');
    setIsMeterReset(false);
    setMeterFiles({ elec: null, water: null });
    setMeterPreviews({ elec: '', water: '' });
    
    const now = new Date();
    const nextMonth = currentMonth === 12 ? 1 : currentMonth + 1;
    const nextMonthYear = currentMonth === 12 ? currentYear + 1 : currentYear;
    let defaultDeadline = new Date(nextMonthYear, nextMonth - 1, 5, 23, 59, 59);

    // Nếu mùng 5 tháng sau đã qua, dời deadline thành 5 ngày kể từ "Hôm nay"
    if (defaultDeadline < now) {
      defaultDeadline = new Date(now.getTime() + 5 * 24 * 60 * 60 * 1000);
    }
    
    // Offset local timezone
    defaultDeadline.setMinutes(defaultDeadline.getMinutes() - defaultDeadline.getTimezoneOffset());
    setDeadlineDate(defaultDeadline.toISOString().slice(0, 16));
    
    setIsChotSoModalOpen(true);
  };

  const openReceiptModal = (contract: ContractBilling) => {
    setViewingContract(contract);
    setIsReceiptModalOpen(true);
  };

  const handleMeterFileChange = (type: 'elec' | 'water', e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setMeterFiles(prev => ({ ...prev, [type]: file }));
      setMeterPreviews(prev => ({ ...prev, [type]: URL.createObjectURL(file) }));
    }
  };

  const handleChotSo = async () => {
    if (!selectedContract) return;
    const nElec = Number(newElec);
    const nWater = Number(newWater);

    if (!isMeterReset && nElec < selectedContract.oldElecIndex) return toast.error('Số điện mới không được nhỏ hơn số cũ!');
    if (!isMeterReset && nWater < selectedContract.oldWaterIndex) return toast.error('Số nước mới không được nhỏ hơn số cũ!');

    setIsSubmitting(true);
    try {
      let uploadedElecUrl = undefined;
      let uploadedWaterUrl = undefined;
      
      if (meterFiles.elec || meterFiles.water) {
         try {
             const filesToUpload = [];
             if (meterFiles.elec) filesToUpload.push(meterFiles.elec);
             if (meterFiles.water) filesToUpload.push(meterFiles.water);
             
             const uploadRes = await propertyApi.uploadImages(filesToUpload);
             if (uploadRes.data && uploadRes.data.length > 0) {
                 if (meterFiles.elec && meterFiles.water) {
                     uploadedElecUrl = uploadRes.data[0];
                     uploadedWaterUrl = uploadRes.data[1];
                 } else if (meterFiles.elec) {
                     uploadedElecUrl = uploadRes.data[0];
                 } else {
                     uploadedWaterUrl = uploadRes.data[0];
                 }
             }
         } catch(e) {
             toast.error('Lỗi tải ảnh minh chứng. Hóa đơn vẫn được chốt với nội dung gốc.');
         }
      }

      await billApi.createBill({
        contractId: selectedContract.id,
        month: currentMonth,
        year: currentYear,
        oldElecIndex: selectedContract.oldElecIndex,
        newElecIndex: nElec,
        oldWaterIndex: selectedContract.oldWaterIndex,
        newWaterIndex: nWater,
        deadline: deadlineDate || undefined,
        additionalFee: Number(additionalFee) || 0,
        discountAmount: Number(discountAmount) || 0,
        note: note,
        elecMeterImageUrl: uploadedElecUrl,
        waterMeterImageUrl: uploadedWaterUrl,
        isMeterReset: isMeterReset,
      });

      toast.success('Chốt sổ thành công!');
      setIsChotSoModalOpen(false);
      fetchBillingStatus();
    } catch (error) {
      toast.error('Chốt sổ thất bại!');
    } finally {
      setIsSubmitting(false);
    }
  };

  // --- XỬ LÝ LỌC & SẮP XẾP ---
  let processedContracts = contracts.filter(c => 
    (
      c.roomName.toLowerCase().includes(searchTerm.toLowerCase()) || 
      c.tenantName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.id.toString() === searchTerm ||
      searchTerm === `#${c.id}`
    ) &&
    (filterStatus === 'ALL' || c.billStatus === filterStatus)
  );

  processedContracts.sort((a, b) => {
    if (sortBy === 'ROOM_ASC') return a.roomName.localeCompare(b.roomName);
    if (sortBy === 'ROOM_DESC') return b.roomName.localeCompare(a.roomName);
    
    const getPrice = (contract: ContractBilling) => contract.totalAmount || contract.actualPrice;
    if (sortBy === 'PRICE_DESC') return getPrice(b) - getPrice(a);
    if (sortBy === 'PRICE_ASC') return getPrice(a) - getPrice(b);
    return 0;
  });

  return (
    <div className="mx-auto max-w-7xl space-y-6 pb-10">
      <PageHeader
        title="Quản lý thu tiền"
        description="Chốt điện nước, tạo hóa đơn và xác nhận thanh toán theo tháng."
        actions={
          <div className="flex items-center gap-2 rounded-xl border border-border/80 bg-card p-1.5 shadow-soft">
          <Button variant="outline" size="icon" onClick={handlePrevMonth}><ChevronLeft className="h-4 w-4" /></Button>
          
          <div className="relative flex items-center gap-2 font-semibold min-w-[130px] justify-center cursor-pointer hover:text-primary transition-colors group">
            <Calendar className="h-4 w-4 text-primary group-hover:scale-110 transition-transform" />
            <span>Tháng {currentMonth} / {currentYear}</span>
            {/* Native Month Picker ẩn đè lên */}
            <input 
              type="month" 
              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
              value={`${currentYear}-${String(currentMonth).padStart(2, '0')}`}
              onChange={(e) => {
                if(e.target.value) {
                  const [y, m] = e.target.value.split('-');
                  setCurrentYear(parseInt(y, 10));
                  setCurrentMonth(parseInt(m, 10));
                }
              }}
            />
          </div>

          <Button variant="outline" size="icon" onClick={handleNextMonth}><ChevronRight className="h-4 w-4" /></Button>
          </div>
        }
      />

      <div className="section-card flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:p-4">
        <div className="relative min-w-0 flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground" />
          <Input 
            placeholder="Tìm theo tên phòng, người thuê hoặc ID hợp đồng…" 
            className="h-11 pl-10"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        
        <div className="flex w-full flex-col gap-3 sm:w-auto sm:flex-row sm:flex-nowrap">
          <div className="relative w-full min-w-0 sm:w-48">
             <Filter className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
             <select
                className="select-native w-full pl-9"
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                aria-label="Lọc theo trạng thái"
             >
                <option value="ALL">Tất cả trạng thái</option>
                <option value="UNBILLED">Chưa chốt sổ</option>
                <option value="PENDING">Chờ thanh toán</option>
                <option value="PAID">Đã thu tiền</option>
                <option value="LATE">Trễ hạn</option>
             </select>
          </div>

          <div className="relative w-full min-w-0 sm:w-56">
             <ArrowUpDown className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
             <select
                className="select-native w-full pl-9"
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                aria-label="Sắp xếp"
             >
                <option value="ROOM_ASC">Sắp xếp: Phòng (A-Z)</option>
                <option value="ROOM_DESC">Sắp xếp: Phòng (Z-A)</option>
                <option value="PRICE_DESC">Sắp xếp: Tiền (Cao xuống Thấp)</option>
                <option value="PRICE_ASC">Sắp xếp: Tiền (Thấp lên Cao)</option>
             </select>
          </div>
        </div>
      </div>

      {isLoading ? (
         <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
           {[1, 2, 3, 4, 5, 6].map((i) => (
             <Skeleton key={i} className="h-[220px] rounded-2xl" />
           ))}
         </div>
      ) : processedContracts.length === 0 ? (
        <EmptyState
          icon={FileText}
          title="Không có hợp đồng phù hợp"
          description="Thử đổi tháng, từ khóa tìm kiếm hoặc bộ lọc trạng thái."
        />
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 md:gap-5 lg:grid-cols-3">
          {processedContracts.map(contract => (
            <div key={contract.id} className="flex flex-col overflow-hidden rounded-2xl border border-border/80 bg-card shadow-soft transition-all duration-200 hover:border-primary/20 hover:shadow-card">
              <div className="flex items-start justify-between border-b border-border/60 p-5">
                <div className="min-w-0">
                  <h3 className="truncate text-lg font-bold text-foreground">Phòng {contract.roomName}</h3>
                  <p className="truncate text-sm text-muted-foreground">{contract.tenantName}</p>
                  <Link to="/landlord/contracts" className="text-[10px] font-mono text-primary bg-primary/5 px-1.5 py-0.5 rounded mt-1 inline-block border border-primary/10 hover:bg-primary/10 transition-colors">
                    Hợp đồng #{contract.id}
                  </Link>
                </div>
                {contract.billStatus === 'UNBILLED' && <StatusBadge label="Chưa chốt" tone="danger" />}
                {contract.billStatus === 'PENDING' && <StatusBadge label="Chờ đóng" tone="warning" />}
                {contract.billStatus === 'PAID' && <StatusBadge label="Đã thu" tone="success" />}
                {contract.billStatus === 'LATE' && <StatusBadge label="Trễ hạn" tone="danger" />}
              </div>

              <div className="flex flex-1 flex-col justify-between space-y-4 p-5">
                <div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Giá thuê</span>
                    <span className="font-semibold tabular-nums text-foreground">{formatCurrency(contract.actualPrice)}</span>
                  </div>
                  {contract.totalAmount && (
                    <div className="mt-2 flex justify-between border-t border-dashed border-border/60 pt-2 text-sm">
                      <span className="text-muted-foreground">Tổng cộng</span>
                      <span className="text-base font-bold tabular-nums text-primary">{formatCurrency(contract.totalAmount)}</span>
                    </div>
                  )}
                </div>
                
                <div className="pt-4 flex gap-2 mt-auto">
                  {contract.billStatus === 'UNBILLED' ? (
                    <Button className="w-full bg-primary" onClick={() => openChotSoModal(contract)}>
                      <Receipt className="h-4 w-4 mr-2" /> Chốt Sổ Ngay
                    </Button>
                  ) : contract.billStatus === 'PENDING' ? (
                    <div className="flex w-full gap-2">
                      <Button className="flex-1" variant="outline" onClick={() => openReceiptModal(contract)} title="Xem Biên Lai">
                        <FileText className="h-4 w-4" /> 
                      </Button>
                      <Button 
                        className="flex-[3] bg-orange-500 hover:bg-orange-600 text-white" 
                        onClick={() => handleConfirmPaymentClick(contract)}
                        isLoading={isConfirmingPayment === contract.billId}
                      >
                        <CheckCircle2 className="h-4 w-4 mr-1" /> Thực Thu
                      </Button>
                    </div>
                  ) : (
                    <Button className="w-full" variant="outline" onClick={() => openReceiptModal(contract)}>
                      <FileText className="h-4 w-4 mr-2" /> Xem Biên Lai
                    </Button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* --- MODAL CHỐT SỔ --- */}
      {isChotSoModalOpen && selectedContract && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-md p-4 overflow-y-auto animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl w-full max-w-2xl overflow-hidden shadow-2xl my-8 animate-in zoom-in-95">
            <div className="p-5 border-b flex justify-between items-center bg-muted/40">
              <h2 className="text-lg font-bold flex items-center gap-2">
                <Receipt className="h-5 w-5 text-primary" />
                Chốt Sổ Tháng {currentMonth} - Phòng {selectedContract.roomName}
              </h2>
              <button onClick={() => setIsChotSoModalOpen(false)} className="text-gray-400 hover:text-gray-600">
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="flex flex-col md:flex-row">
                <div className="p-6 flex-1 space-y-5 border-r border-gray-100">
                    <div className="flex items-center justify-between border-b border-gray-100 pb-3 mb-2">
                        <h3 className="text-sm font-semibold text-gray-800">Thông số tiêu thụ</h3>
                        <label className="flex items-center gap-2 cursor-pointer group tooltip" title="Tích vào khi đồng hồ chạy hết mức và quay về 0">
                            <input 
                                type="checkbox" 
                                checked={isMeterReset} 
                                onChange={(e) => setIsMeterReset(e.target.checked)}
                                className="w-4 h-4 rounded border-gray-300 text-primary focus:ring-primary"
                            />
                            <span className="text-sm text-orange-600 font-medium group-hover:text-orange-700 transition-colors">Đồng hồ quay vòng</span>
                        </label>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        {/* Nhập điện */}
                        <div className="space-y-2">
                            <label className="text-sm font-semibold flex items-center justify-between text-yellow-600">
                                <span className="flex items-center gap-1"><Zap className="h-4 w-4" /> Điện</span>
                                <span className="text-xs text-gray-500 font-normal">{formatCurrency(selectedContract.elecPrice)}/kWh</span>
                            </label>
                            <div className="p-3 bg-yellow-50 rounded-lg border border-yellow-100">
                                <p className="text-xs text-gray-500 mb-2">Số cũ: <span className="font-bold text-gray-800">{selectedContract.oldElecIndex}</span></p>
                                <Input type="number" placeholder="Số mới" value={newElec} onChange={(e) => setNewElec(e.target.value)} className="bg-white" />
                                
                                <div className="mt-3 border-2 border-dashed border-yellow-300 rounded-lg p-2 flex flex-col items-center justify-center h-24 bg-white hover:bg-yellow-50/50 transition-colors relative group overflow-hidden cursor-pointer">
                                  {meterPreviews.elec ? (
                                    <img src={meterPreviews.elec} alt="Điện" className="h-full w-full object-cover rounded" />
                                  ) : (
                                    <div className="text-center text-yellow-600/60">
                                      <Camera className="h-5 w-5 mx-auto mb-1" />
                                      <span className="text-[10px] font-medium">Chụp công tơ điện</span>
                                    </div>
                                  )}
                                  <input type="file" accept="image/*" className="absolute inset-0 opacity-0 cursor-pointer" onChange={(e) => handleMeterFileChange('elec', e)} />
                                </div>
                            </div>
                        </div>

                        {/* Nhập nước */}
                        <div className="space-y-2">
                            <label className="text-sm font-semibold flex items-center justify-between text-blue-600">
                                <span className="flex items-center gap-1"><Droplets className="h-4 w-4" /> Nước</span>
                                <span className="text-xs text-gray-500 font-normal">{formatCurrency(selectedContract.waterPrice)}/m³</span>
                            </label>
                            <div className="p-3 bg-blue-50 rounded-lg border border-blue-100">
                                <p className="text-xs text-gray-500 mb-2">Số cũ: <span className="font-bold text-gray-800">{selectedContract.oldWaterIndex}</span></p>
                                <Input type="number" placeholder="Số mới" value={newWater} onChange={(e) => setNewWater(e.target.value)} className="bg-white" />
                                
                                <div className="mt-3 border-2 border-dashed border-blue-300 rounded-lg p-2 flex flex-col items-center justify-center h-24 bg-white hover:bg-blue-50/50 transition-colors relative group overflow-hidden cursor-pointer">
                                  {meterPreviews.water ? (
                                    <img src={meterPreviews.water} alt="Nước" className="h-full w-full object-cover rounded" />
                                  ) : (
                                    <div className="text-center text-blue-600/60">
                                      <Camera className="h-5 w-5 mx-auto mb-1" />
                                      <span className="text-[10px] font-medium">Chụp công tơ nước</span>
                                    </div>
                                  )}
                                  <input type="file" accept="image/*" className="absolute inset-0 opacity-0 cursor-pointer" onChange={(e) => handleMeterFileChange('water', e)} />
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4 pt-2 border-t border-gray-100">
                        <div className="space-y-1">
                            <label className="text-sm text-gray-600">Phụ phí phát sinh (VNĐ)</label>
                            <Input type="number" placeholder="VD: 50000" value={additionalFee} onChange={(e) => setAdditionalFee(e.target.value)} />
                        </div>
                        <div className="space-y-1">
                            <label className="text-sm text-gray-600">Giảm trừ (VNĐ)</label>
                            <Input type="number" placeholder="VD: 100000" value={discountAmount} onChange={(e) => setDiscountAmount(e.target.value)} />
                        </div>
                    </div>

                    <div className="space-y-1">
                        <label className="text-sm text-gray-600">Ghi chú (Lý do phụ phí/giảm trừ)</label>
                        <Input placeholder="VD: Tiền rác 50k, giảm 100k tiền nước do mất nước" value={note} onChange={(e) => setNote(e.target.value)} />
                    </div>
                </div>

                <div className="p-6 md:w-80 bg-muted/40 flex flex-col justify-between">
                    <div>
                        <div className="bg-orange-50 border border-orange-200 p-3 rounded-lg mb-5 shadow-sm">
                            <label className="text-xs font-bold text-orange-800 uppercase flex items-center gap-1.5 mb-2">
                                <Clock className="h-3.5 w-3.5" /> Hạn Chót Nộp Tiền
                            </label>
                            <Input
                                type="datetime-local"
                                value={deadlineDate}
                                onChange={(e) => setDeadlineDate(e.target.value)}
                                className={`w-full bg-white font-medium text-sm border-orange-200 focus-visible:ring-orange-500 hover:border-orange-300 transition-colors ${new Date(deadlineDate) < new Date() ? 'text-red-600 border-red-300 focus-visible:ring-red-500' : 'text-gray-900'}`}
                            />
                            {new Date(deadlineDate) < new Date() && (
                                <p className="text-xs text-red-600 mt-1.5 font-medium flex items-center gap-1">
                                    <AlertCircle className="h-3 w-3" /> Không thể lùi về quá khứ
                                </p>
                            )}
                        </div>

                        <h3 className="text-sm font-bold text-gray-800 uppercase mb-4 border-b pb-2">Tạm tính</h3>
                        <div className="space-y-3 text-sm">
                            <div className="flex justify-between">
                                <span className="text-gray-500">Tiền phòng:</span>
                                <span>{formatCurrency(selectedContract.actualPrice)}</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-gray-500">Tiền điện ({
                                    isMeterReset && Number(newElec) < selectedContract.oldElecIndex
                                    ? (10000 - selectedContract.oldElecIndex) + Number(newElec)
                                    : Math.max(0, Number(newElec) - selectedContract.oldElecIndex)
                                } kí):</span>
                                <span>{formatCurrency(
                                    (isMeterReset && Number(newElec) < selectedContract.oldElecIndex
                                    ? (10000 - selectedContract.oldElecIndex) + Number(newElec)
                                    : Math.max(0, Number(newElec) - selectedContract.oldElecIndex)) * selectedContract.elecPrice
                                )}</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-gray-500">Tiền nước ({
                                    isMeterReset && Number(newWater) < selectedContract.oldWaterIndex
                                    ? (1000 - selectedContract.oldWaterIndex) + Number(newWater)
                                    : Math.max(0, Number(newWater) - selectedContract.oldWaterIndex)
                                } khối):</span>
                                <span>{formatCurrency(
                                    (isMeterReset && Number(newWater) < selectedContract.oldWaterIndex
                                    ? (1000 - selectedContract.oldWaterIndex) + Number(newWater)
                                    : Math.max(0, Number(newWater) - selectedContract.oldWaterIndex)) * selectedContract.waterPrice
                                )}</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-gray-500">Mạng / Dịch vụ:</span>
                                <span>{formatCurrency(selectedContract.internetPrice || 0)}</span>
                            </div>
                            {Number(additionalFee) > 0 && (
                                <div className="flex justify-between text-red-600">
                                    <span>Phụ phí:</span>
                                    <span>+{formatCurrency(Number(additionalFee))}</span>
                                </div>
                            )}
                            {Number(discountAmount) > 0 && (
                                <div className="flex justify-between text-green-600">
                                    <span>Giảm trừ:</span>
                                    <span>-{formatCurrency(Number(discountAmount))}</span>
                                </div>
                            )}
                        </div>
                    </div>

                    <div className="mt-6 pt-4 border-t border-dashed border-gray-300">
                        <p className="text-xs text-gray-500 mb-1">Tổng cộng dự kiến</p>
                        <p className="text-3xl font-black text-primary">{formatCurrency(previewTotal)}</p>
                        
                        <Button 
                            className="w-full mt-4" 
                            onClick={handleChotSo} 
                            disabled={!newElec || !newWater || isSubmitting || new Date(deadlineDate) < new Date()}
                        >
                            {isSubmitting ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <CheckCircle2 className="h-4 w-4 mr-2" />}
                            {isSubmitting ? 'Đang tải minh chứng...' : 'Phát Hành Hóa Đơn'}
                        </Button>
                    </div>
                </div>
            </div>
          </div>
        </div>
      )}

      {/* --- MODAL BIÊN LAI --- */}
      {isReceiptModalOpen && viewingContract && (
         <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-md p-4 overflow-y-auto animate-in fade-in duration-200">
           <div className="bg-white w-full max-w-md overflow-hidden shadow-2xl relative my-8 animate-in zoom-in-95">
              <button onClick={() => setIsReceiptModalOpen(false)} className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 z-10 bg-white/50 rounded-full p-1">
                 <X className="h-5 w-5" />
              </button>
              
              <div className="p-8 pb-4 text-center bg-muted/40 border-b border-gray-200">
                 <div className="w-14 h-14 bg-white border border-gray-200 rounded-full flex items-center justify-center mx-auto mb-4 shadow-sm">
                    <Receipt className="h-7 w-7 text-primary" />
                 </div>
                 <h2 className="text-2xl font-black uppercase tracking-widest text-gray-900">Biên Lai Tiền Nhà</h2>
                 <p className="text-gray-500 mt-1 font-medium">Tháng {currentMonth} / {currentYear}</p>
                 
                 <div className="mt-4 inline-flex items-center justify-center">
                   {viewingContract.billStatus === 'PAID' ? (
                    <StatusBadge label="ĐÃ THANH TOÁN" tone="success" className="text-sm font-bold" />
                   ) : viewingContract.billStatus === 'LATE' ? (
                    <StatusBadge label="TRỄ HẠN" tone="danger" className="text-sm font-bold" />
                   ) : (
                    <StatusBadge label="CHỜ THANH TOÁN" tone="warning" className="text-sm font-bold" />
                   )}
                 </div>
              </div>

              <div className="px-8 py-5 text-sm space-y-2 text-gray-700">
                  <div className="flex justify-between"><span className="text-gray-500">Phòng:</span><span className="font-bold text-gray-900">{viewingContract.roomName}</span></div>
                  <div className="flex justify-between"><span className="text-gray-500">Khách thuê:</span><span className="font-bold text-gray-900">{viewingContract.tenantName}</span></div>
                  {viewingContract.deadline && (
                      <div className="flex justify-between"><span className="text-gray-500">Hạn thanh toán:</span><span className={viewingContract.billStatus === 'LATE' ? 'font-bold text-red-600' : 'font-bold text-gray-900'}>{formatDate(viewingContract.deadline)}</span></div>
                  )}
              </div>

              <div className="px-8 py-5 space-y-4 border-t border-dashed border-gray-300 bg-white">
                 <div className="flex justify-between text-sm">
                    <span className="font-medium text-gray-800">Tiền phòng</span>
                    <span className="font-semibold">{formatCurrency(viewingContract.actualPrice)}</span>
                 </div>
                 
                 <div className="flex justify-between text-sm">
                    <span className="font-medium text-gray-800">Internet & WiFi</span>
                    <span className="font-semibold">{formatCurrency(viewingContract.internetPrice || 0)}</span>
                 </div>
                 
                 <div className="flex justify-between text-sm">
                    <div className="flex flex-col">
                        <span className="font-medium text-gray-800">Tiền điện</span>
                        <span className="text-xs text-gray-500">
                          {viewingContract.oldElecIndex} ➔ {viewingContract.newElecIndex} 
                          ({(() => { const o = viewingContract.oldElecIndex; const n = viewingContract.newElecIndex || 0; return n >= o ? n - o : (10000 - o) + n; })()} kWh x {formatCurrency(viewingContract.elecPrice).replace('đ','')})
                        </span>
                    </div>
                    <span className="font-semibold mt-1">
                        {formatCurrency((() => { const o = viewingContract.oldElecIndex; const n = viewingContract.newElecIndex || 0; const used = n >= o ? n - o : (10000 - o) + n; return used * viewingContract.elecPrice; })())}
                    </span>
                 </div>

                 <div className="flex justify-between text-sm">
                    <div className="flex flex-col">
                        <span className="font-medium text-gray-800">Tiền nước</span>
                        <span className="text-xs text-gray-500">
                          {viewingContract.oldWaterIndex} ➔ {viewingContract.newWaterIndex} 
                          ({(() => { const o = viewingContract.oldWaterIndex; const n = viewingContract.newWaterIndex || 0; return n >= o ? n - o : (1000 - o) + n; })()} m³ x {formatCurrency(viewingContract.waterPrice).replace('đ','')})
                        </span>
                    </div>
                    <span className="font-semibold mt-1">
                        {formatCurrency((() => { const o = viewingContract.oldWaterIndex; const n = viewingContract.newWaterIndex || 0; const used = n >= o ? n - o : (1000 - o) + n; return used * viewingContract.waterPrice; })())}
                    </span>
                 </div>

                 {(viewingContract.elecMeterImageUrl || viewingContract.waterMeterImageUrl) && (
                     <div className="pt-2 flex gap-3">
                        {viewingContract.elecMeterImageUrl && (
                            <div className="flex-1 bg-muted/40 border border-gray-100 rounded p-1 text-center group cursor-pointer overflow-hidden">
                                <a href={viewingContract.elecMeterImageUrl} target="_blank" rel="noopener noreferrer">
                                   <img src={viewingContract.elecMeterImageUrl} alt="Đồng hồ điện" className="w-full h-16 object-cover rounded hover:scale-110 transition-transform"/>
                                   <p className="text-[9px] font-bold text-gray-500 uppercase mt-1">Chỉ số Điện</p>
                                </a>
                            </div>
                        )}
                        {viewingContract.waterMeterImageUrl && (
                            <div className="flex-1 bg-muted/40 border border-gray-100 rounded p-1 text-center group cursor-pointer overflow-hidden">
                                <a href={viewingContract.waterMeterImageUrl} target="_blank" rel="noopener noreferrer">
                                   <img src={viewingContract.waterMeterImageUrl} alt="Đồng hồ nước" className="w-full h-16 object-cover rounded hover:scale-110 transition-transform"/>
                                   <p className="text-[9px] font-bold text-gray-500 uppercase mt-1">Chỉ số Nước</p>
                                </a>
                            </div>
                        )}
                     </div>
                 )}

                 {viewingContract.additionalFee ? (
                    <div className="flex justify-between text-sm text-red-600">
                        <span className="font-medium">Phụ phí phát sinh</span>
                        <span className="font-semibold">+{formatCurrency(viewingContract.additionalFee)}</span>
                    </div>
                 ) : null}

                 {viewingContract.discountAmount ? (
                    <div className="flex justify-between text-sm text-green-600">
                        <span className="font-medium">Giảm trừ</span>
                        <span className="font-semibold">-{formatCurrency(viewingContract.discountAmount)}</span>
                    </div>
                 ) : null}

                 {viewingContract.note && (
                     <div className="p-3 bg-muted/40 rounded text-xs text-gray-600 border border-gray-100 italic">
                         <span className="font-semibold not-italic">Ghi chú: </span>{viewingContract.note}
                     </div>
                 )}
              </div>

              <div className="px-8 py-6 bg-gray-900 text-white">
                 <div className="flex flex-col items-center justify-center">
                    <p className="text-xs text-gray-400 uppercase tracking-widest mb-2">Tổng số tiền cần thanh toán</p>
                    <span className="font-black text-4xl">{formatCurrency(viewingContract.totalAmount || viewingContract.actualPrice)}</span>
                    
                    {viewingContract.paymentMethod === 'BLOCKCHAIN' && (
                       <p className="mt-3 text-xs bg-indigo-500/20 text-indigo-300 px-3 py-1 rounded-full font-semibold flex items-center gap-1 border border-indigo-500/30">
                           <Blocks className="w-3 h-3"/> Đã thanh toán qua Smart Contract
                       </p>
                    )}
                 </div>
              </div>

              <div className="bg-white p-4 flex gap-3">
                  <Button className="w-full flex-1" variant="outline" onClick={() => setIsReceiptModalOpen(false)}>
                      Đóng
                  </Button>
                  <Button className="w-full flex-1 bg-primary text-white" onClick={() => window.print()}>
                      <Printer className="h-4 w-4 mr-2" /> In / Tải PDF
                  </Button>
              </div>
           </div>
         </div>
      )}
      {/* --- MODAL THỰC THU --- */}
      {paymentModalOpen && selectedBillForPayment && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 backdrop-blur-md p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl w-full max-w-sm overflow-hidden shadow-2xl animate-in zoom-in-95">
            <div className="p-5 border-b text-center bg-orange-50">
              <div className="w-12 h-12 bg-white rounded-full flex items-center justify-center mx-auto mb-3 shadow-sm text-orange-500 border border-orange-100">
                <CheckCircle2 className="h-6 w-6" />
              </div>
              <h2 className="text-lg font-bold text-gray-900">Xác nhận Thực Thu</h2>
            </div>
            <div className="p-6 space-y-4">
              <p className="text-sm text-gray-600 text-center">
                Xác nhận đã thu tiền phòng <strong>{selectedBillForPayment.roomName}</strong>?<br/>
                Tổng: <strong className="text-primary text-base">{formatCurrency(selectedBillForPayment.totalAmount || selectedBillForPayment.actualPrice)}</strong>
              </p>
              <div className="space-y-1.5">
                <label className="text-sm font-semibold text-gray-800">Ngày nhận tiền thực tế</label>
                <p className="text-xs text-gray-500 mb-1">Mốc thời gian này sẽ được dùng để chấm điểm uy tín nộp tiền của khách.</p>
                <Input 
                  type="datetime-local" 
                  value={actualPaidDate} 
                  onChange={(e) => setActualPaidDate(e.target.value)}
                  className={`w-full ${new Date(actualPaidDate) > new Date() ? 'border-red-300 text-red-600 focus-visible:ring-red-500' : ''}`}
                />
                {new Date(actualPaidDate) > new Date() && (
                  <p className="text-xs text-red-500 mt-1 flex items-center gap-1">
                    <AlertCircle className="h-3 w-3" /> Không được chọn ngày ở Tương Lai
                  </p>
                )}
              </div>
            </div>
            <div className="p-4 bg-muted/40 flex gap-3 border-t">
              <Button className="flex-1" variant="outline" onClick={() => setPaymentModalOpen(false)}>Hủy</Button>
              <Button 
                className="flex-1 bg-orange-500 hover:bg-orange-600 text-white" 
                onClick={executeConfirmPayment}
                disabled={!actualPaidDate || new Date(actualPaidDate) > new Date()}
                isLoading={isConfirmingPayment === selectedBillForPayment.billId}
              >
                Xác nhận
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
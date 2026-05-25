import { useEffect, useState } from "react";
import { 
  Search, Filter, ArrowUpDown, FileText, Loader2, X
} from "lucide-react";
import { contractApi } from "@/api/contractApi";
import type { Contract } from "@/types";
import ContractItem from "./ContractItem";
import { toast } from "sonner";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";

export default function ContractList() {
  const [contracts, setContracts] = useState<Contract[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // --- FILTER & SORT STATES ---
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('ALL');
  const [sortBy, setSortBy] = useState('NEWEST');

  useEffect(() => {
    const fetchContracts = async () => {
      try {
        setIsLoading(true);
        const res = await contractApi.getMyContracts();
        const data = (res as any).data || res;
        setContracts(Array.isArray(data) ? data : []);
      } catch (error) {
        toast.error("Không thể tải danh sách hợp đồng");
      } finally {
        setIsLoading(false);
      }
    };
    fetchContracts();
  }, []);

  // --- LOGIC XỬ LÝ DỮ LIỆU ---
  let processedContracts = contracts.filter(c => {
    const roomName = c.roomName || "";
    const matchSearch = roomName.toLowerCase().includes(searchTerm.toLowerCase());
    const matchStatus = filterStatus === 'ALL' || c.status === filterStatus;
    return matchSearch && matchStatus;
  });

  processedContracts.sort((a, b) => {
    if (sortBy === 'NEWEST') return new Date(b.startDate).getTime() - new Date(a.startDate).getTime();
    if (sortBy === 'OLDEST') return new Date(a.startDate).getTime() - new Date(b.startDate).getTime();
    
    const priceA = a.actualPrice || 0;
    const priceB = b.actualPrice || 0;
    
    if (sortBy === 'PRICE_DESC') return priceB - priceA;
    if (sortBy === 'PRICE_ASC') return priceA - priceB;
    return 0;
  });

  const summary = {
    total: contracts.length,
    active: contracts.filter(c => c.status === 'ACTIVE').length,
    pending: contracts.filter(c => c.status === 'PENDING_SIGNATURE' || c.status === 'PENDING_APPROVAL').length,
    ended: contracts.filter(c => c.status === 'EXPIRED' || c.status === 'TERMINATED_EARLY').length,
  };

  const activeFilterChips = [
    searchTerm ? { key: 'search', label: `Từ khóa: ${searchTerm}`, clear: () => setSearchTerm('') } : null,
    filterStatus !== 'ALL' ? { key: 'status', label: `Trạng thái: ${filterStatus}`, clear: () => setFilterStatus('ALL') } : null,
    sortBy !== 'NEWEST' ? { key: 'sort', label: `Sắp xếp: ${sortBy}`, clear: () => setSortBy('NEWEST') } : null,
  ].filter(Boolean) as { key: string; label: string; clear: () => void }[];

  const resetFilters = () => {
    setSearchTerm('');
    setFilterStatus('ALL');
    setSortBy('NEWEST');
  };

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-24 bg-slate-50/50 rounded-2xl border border-dashed border-slate-200">
        <Loader2 className="h-8 w-8 animate-spin text-indigo-600" />
        <span className="text-slate-500 font-medium text-sm mt-3">Đang tải danh sách hợp đồng...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">


      {/* Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-slate-200/60 shadow-sm transition-all hover:shadow-md">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Tổng hợp đồng</p>
              <p className="text-2xl font-bold text-slate-900 mt-2">{summary.total}</p>
            </div>
            <div className="p-2.5 bg-slate-50 rounded-xl text-slate-700">
              <FileText className="h-5 w-5" />
            </div>
          </div>
        </div>
        
        <div className="bg-white p-5 rounded-2xl border border-slate-200/60 shadow-sm transition-all hover:shadow-md">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-green-600">Đang hiệu lực</p>
              <p className="text-2xl font-bold text-green-700 mt-2">{summary.active}</p>
            </div>
            <div className="p-2.5 bg-green-50 rounded-xl text-green-700">
              <FileText className="h-5 w-5" />
            </div>
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200/60 shadow-sm transition-all hover:shadow-md">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-amber-600">Chờ ký</p>
              <p className="text-2xl font-bold text-amber-700 mt-2">{summary.pending}</p>
            </div>
            <div className="p-2.5 bg-amber-50 rounded-xl text-amber-700">
              <FileText className="h-5 w-5" />
            </div>
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200/60 shadow-sm transition-all hover:shadow-md">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Kết thúc / Hủy</p>
              <p className="text-2xl font-bold text-slate-700 mt-2">{summary.ended}</p>
            </div>
            <div className="p-2.5 bg-slate-50 rounded-xl text-slate-700">
              <FileText className="h-5 w-5" />
            </div>
          </div>
        </div>
      </div>

      {/* Toolbar Section */}
      <div className="flex flex-col md:flex-row justify-between items-stretch md:items-center gap-3 bg-white p-4 rounded-2xl border border-slate-200/60 shadow-sm">
        <div className="relative flex-1">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <Input 
            placeholder="Tìm theo tên phòng..." 
            className="pl-10 bg-slate-50/60 border-slate-200 h-11 w-full focus-visible:ring-indigo-500 rounded-xl text-sm"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative">
            <Filter className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <select 
              className="pl-10 pr-9 h-11 rounded-xl border border-slate-200 bg-white text-sm outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-500 cursor-pointer text-slate-700 font-medium"
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
            >
              <option value="ALL">Tất cả trạng thái</option>
              <option value="PENDING_APPROVAL">Chờ chọn</option>
              <option value="PENDING_SIGNATURE">Chờ ký tên</option>
              <option value="AWAITING_DEPOSIT">Chờ thanh toán</option>
              <option value="ACTIVE">Đang hiệu lực</option>
              <option value="EXPIRED">Đã hết hạn</option>
              <option value="TERMINATED_EARLY">Chấm dứt trước hạn</option>
              <option value="CANCELLED">Đã hủy</option>
            </select>
          </div>

          <div className="relative">
            <ArrowUpDown className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <select 
              className="pl-10 pr-9 h-11 rounded-xl border border-slate-200 bg-white text-sm outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-500 cursor-pointer text-slate-700 font-medium"
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
            >
              <option value="NEWEST">Mới nhất</option>
              <option value="OLDEST">Cũ nhất</option>
              <option value="PRICE_DESC">Giá: Cao - Thấp</option>
              <option value="PRICE_ASC">Giá: Thấp - Cao</option>
            </select>
          </div>
        </div>
      </div>

      {/* Filter Chips */}
      {activeFilterChips.length > 0 && (
        <div className="flex flex-wrap items-center gap-2 bg-slate-50/80 p-3.5 rounded-xl border border-dashed border-slate-200">
          {activeFilterChips.map(chip => (
            <span
              key={chip.key}
              onClick={chip.clear}
              className="inline-flex items-center gap-1.5 rounded-full border border-indigo-200/60 bg-indigo-50/40 px-3 py-1 text-xs font-medium text-indigo-700 cursor-pointer hover:bg-indigo-100 transition-colors"
            >
              {chip.label}
              <X className="h-3.5 w-3.5 text-indigo-500 hover:text-indigo-700" />
            </span>
          ))}
          <Button 
            variant="ghost" 
            size="sm" 
            className="h-7 text-xs text-slate-500 hover:text-slate-900 hover:bg-slate-200/50" 
            onClick={resetFilters}
          >
            Xóa bộ lọc
          </Button>
        </div>
      )}

      {/* Contract Items List Section */}
      <div className="space-y-3">
        {processedContracts.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 border-2 border-dashed border-slate-200 rounded-2xl bg-white shadow-sm">
            <div className="p-4 bg-slate-50 rounded-2xl text-slate-300 mb-4 animate-pulse">
              <FileText className="h-10 w-10" />
            </div>
            <h3 className="text-lg font-semibold text-slate-900">
              {contracts.length === 0 ? "Bạn chưa có hợp đồng nào" : "Không tìm thấy hợp đồng phù hợp"}
            </h3>
            <p className="text-sm text-slate-500 mt-1 max-w-xs text-center">
              {contracts.length === 0 ? "Hợp đồng mới sẽ xuất hiện tại đây khi được tạo." : "Hãy thử thay đổi từ khóa hoặc trạng thái lọc để tìm kiếm."}
            </p>
            {contracts.length > 0 && (
              <Button 
                variant="outline" 
                className="mt-5 rounded-xl border-slate-200 hover:bg-slate-50 text-xs px-4 py-2 h-9" 
                onClick={resetFilters}
              >
                Đặt lại bộ lọc
              </Button>
            )}
          </div>
        ) : (
          processedContracts.map((contract) => (
            <ContractItem key={contract.id} data={contract} />
          ))
        )}
      </div>
    </div>
  );
}
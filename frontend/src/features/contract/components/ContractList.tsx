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
    pending: contracts.filter(c => c.status === 'PENDING_SIGNATURE').length,
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
      <div className="flex justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="section-card p-3">
          <p className="text-xs text-muted-foreground">Tổng hợp đồng</p>
          <p className="text-xl font-bold text-foreground mt-1">{summary.total}</p>
        </div>
        <div className="section-card p-3">
          <p className="text-xs text-muted-foreground">Đang hiệu lực</p>
          <p className="text-xl font-bold text-green-700 mt-1">{summary.active}</p>
        </div>
        <div className="section-card p-3">
          <p className="text-xs text-muted-foreground">Chờ ký</p>
          <p className="text-xl font-bold text-amber-700 mt-1">{summary.pending}</p>
        </div>
        <div className="section-card p-3">
          <p className="text-xs text-muted-foreground">Kết thúc / Hủy</p>
          <p className="text-xl font-bold text-gray-700 mt-1">{summary.ended}</p>
        </div>
      </div>

      {/* --- THANH CÔNG CỤ (TOOLBAR) --- */}
      <div className="flex flex-col md:flex-row gap-4 bg-white p-4 rounded-xl border border-gray-200 shadow-sm">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input 
            placeholder="Tìm theo tên phòng..." 
            className="pl-10 bg-gray-50/50 border-gray-200"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        
        <div className="flex gap-3">
          <div className="relative">
            <Filter className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <select 
              className="pl-9 pr-8 h-10 rounded-md border border-gray-200 bg-white text-sm outline-none focus:ring-2 focus:ring-primary cursor-pointer"
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
            >
              <option value="ALL">Tất cả trạng thái</option>
              <option value="ACTIVE">Đang hiệu lực</option>
              <option value="PENDING_SIGNATURE">Chờ ký tên</option>
              <option value="EXPIRED">Đã hết hạn</option>
              <option value="TERMINATED_EARLY">Đã hủy</option>
            </select>
          </div>

          <div className="relative">
            <ArrowUpDown className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <select 
              className="pl-9 pr-8 h-10 rounded-md border border-gray-200 bg-white text-sm outline-none focus:ring-2 focus:ring-primary cursor-pointer"
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

      {activeFilterChips.length > 0 && (
        <div className="flex flex-wrap items-center gap-2">
          {activeFilterChips.map(chip => (
            <button
              key={chip.key}
              onClick={chip.clear}
              className="inline-flex items-center gap-1 rounded-full border bg-secondary px-3 py-1 text-xs font-medium hover:bg-secondary/70"
            >
              {chip.label}
              <X className="h-3 w-3" />
            </button>
          ))}
          <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={resetFilters}>Xóa bộ lọc</Button>
        </div>
      )}

      {/* --- DANH SÁCH DẠNG HÀNG (LIST VIEW) --- */}
      <div className="space-y-3">
        {processedContracts.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 border-2 border-dashed border-gray-200 rounded-xl bg-gray-50/50">
            <FileText className="h-10 w-10 text-gray-300 mb-2" />
            <h3 className="text-lg font-medium text-gray-900">
              {contracts.length === 0 ? "Bạn chưa có hợp đồng nào" : "Không tìm thấy hợp đồng phù hợp"}
            </h3>
            <p className="text-sm text-gray-500 mt-1">
              {contracts.length === 0 ? "Hợp đồng mới sẽ xuất hiện tại đây khi được tạo." : "Hãy thử đổi từ khóa hoặc trạng thái lọc."}
            </p>
            {contracts.length > 0 && (
              <Button variant="outline" className="mt-3" onClick={resetFilters}>Đặt lại bộ lọc</Button>
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
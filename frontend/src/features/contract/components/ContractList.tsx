import { useEffect, useState } from "react";
import { 
  Search, Filter, ArrowUpDown, FileText, Loader2 
} from "lucide-react";
import { contractApi } from "@/api/contractApi";
import type { Contract } from "@/types";
import ContractItem from "./ContractItem";
import { toast } from "sonner";
import { Input } from "@/components/ui/Input";

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

  if (isLoading) {
    return (
      <div className="flex justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
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

      {/* --- DANH SÁCH DẠNG HÀNG (LIST VIEW) --- */}
      <div className="space-y-3">
        {processedContracts.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 border-2 border-dashed border-gray-200 rounded-xl bg-gray-50/50">
            <FileText className="h-10 w-10 text-gray-300 mb-2" />
            <h3 className="text-lg font-medium text-gray-900">Không tìm thấy hợp đồng nào</h3>
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
import { useEffect, useState, useMemo } from "react";
import { 
  History, 
  MapPin, 
  Calendar, 
  User, 
  ChevronRight, 
  ExternalLink,
  Clock,
  ShieldCheck,
  Building2,
  Loader2,
  Search,
  Filter,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
  ArrowRight
} from "lucide-react";
import { contractApi } from "@/api/contractApi";
import type { Contract } from "@/types";
import { toast } from "sonner";
import { Link } from "react-router-dom";
import { cn } from "@/utils/cn";
import { format } from "date-fns";
import { vi } from "date-fns/locale";
import { Input } from "@/components/ui/Input";

type TabType = 'ONGOING' | 'PAST';

export default function RentalHistoryPage() {
  const [history, setHistory] = useState<Contract[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<TabType>('ONGOING');
  
  // Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [filterYear, setFilterYear] = useState<string>('ALL');

  useEffect(() => {
    const fetchHistory = async () => {
      try {
        setIsLoading(true);
        const res = await contractApi.getRentalHistory();
        const data = (res as any).data || res;
        setHistory(Array.isArray(data) ? data : []);
      } catch (error) {
        toast.error("Không thể tải lịch sử thuê phòng");
      } finally {
        setIsLoading(false);
      }
    };
    fetchHistory();
  }, []);

  // --- LOGIC: Stats ---
  const stats = useMemo(() => {
    const total = history.length;
    const active = history.filter(c => c.status === 'ACTIVE').length;
    const asMember = history.filter(c => c.userRole === 'THÀNH VIÊN').length;
    return { total, active, asMember };
  }, [history]);

  // --- LOGIC: Filtering & Grouping ---
  const filteredList = useMemo(() => {
    return history.filter(item => {
      // Search filter
      const matchesSearch = item.roomName?.toLowerCase().includes(searchTerm.toLowerCase()) || 
                            item.propertyAddress?.toLowerCase().includes(searchTerm.toLowerCase());
      
      // Year filter
      const year = new Date(item.startDate).getFullYear().toString();
      const matchesYear = filterYear === 'ALL' || year === filterYear;
      
      // Tab filter
      const isOngoing = item.status === 'ACTIVE' || item.status === 'PENDING_SIGNATURE';
      const matchesTab = activeTab === 'ONGOING' ? isOngoing : !isOngoing;

      return matchesSearch && matchesYear && matchesTab;
    });
  }, [history, searchTerm, filterYear, activeTab]);

  const years = useMemo(() => {
    const allYears = history.map(item => new Date(item.startDate).getFullYear().toString());
    return ['ALL', ...Array.from(new Set(allYears)).sort((a, b) => b.localeCompare(a))];
  }, [history]);

  const getStatusConfig = (status: string) => {
    switch (status) {
      case 'ACTIVE':
        return { label: 'Đang hiệu lực', color: 'bg-green-50 text-green-700 border-green-200', icon: CheckCircle2 };
      case 'EXPIRED':
        return { label: 'Đã hết hạn', color: 'bg-gray-100 text-gray-600 border-gray-200', icon: Clock };
      case 'TERMINATED_EARLY':
        return { label: 'Kết thúc sớm', color: 'bg-amber-50 text-amber-700 border-amber-200', icon: AlertCircle };
       case 'PENDING_SIGNATURE':
        return { label: 'Chờ ký tên', color: 'bg-blue-50 text-blue-700 border-blue-200', icon: HelpCircle };
      default:
        return { label: status, color: 'bg-gray-100 text-gray-700 border-gray-200', icon: HelpCircle };
    }
  };

  const getRoleConfig = (role: string) => {
    if (role === 'CHỦ PHÒNG') {
      return { label: 'Chủ hợp đồng', color: 'text-indigo-600 bg-indigo-50 border-indigo-100' };
    }
    return { label: 'Người ở ghép', color: 'text-teal-600 bg-teal-50 border-teal-100' };
  };

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[500px]">
        <div className="relative">
          <Loader2 className="h-12 w-12 animate-spin text-primary" />
          <History className="h-5 w-5 text-primary/50 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" />
        </div>
        <p className="mt-4 text-gray-500 font-medium animate-pulse">Đang chuẩn bị hành trình của bạn...</p>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto space-y-8 pb-20 animate-in fade-in duration-700">
      {/* 1. HEADER & INTRO */}
      <div className="relative overflow-hidden bg-gradient-to-br from-primary/5 via-transparent to-transparent p-8 rounded-3xl border border-primary/10">
        <div className="relative z-10 flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-primary font-semibold text-sm uppercase tracking-wider">
              <History className="h-4 w-4" />
              <span>Rental Journey</span>
            </div>
            <h1 className="text-4xl font-extrabold text-gray-900 tracking-tight">Lịch sử thuê phòng của tôi</h1>
            <p className="text-gray-500 max-w-xl text-lg leading-relaxed">
              Dòng thời gian ghi dấu những nơi bạn đã từng gắn bó. Quản lý minh bạch, lưu trữ trọn đời.
            </p>
          </div>
          
          <div className="flex gap-4">
             <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm min-w-[120px]">
                <div className="text-xs font-medium text-gray-400 uppercase mb-1">Tổng cộng</div>
                <div className="text-2xl font-bold text-gray-900">{stats.total}</div>
             </div>
             <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm min-w-[120px]">
                <div className="text-xs font-medium text-gray-400 uppercase mb-1">Đang ở</div>
                <div className="text-2xl font-bold text-primary">{stats.active}</div>
             </div>
          </div>
        </div>
      </div>

      {/* 2. FILTERS & TABS */}
      <div className="flex flex-col lg:flex-row gap-6 sticky top-0 z-30 pt-2 bg-gray-50/80 backdrop-blur-md">
        {/* TABS */}
        <div className="inline-flex p-1 bg-gray-200/50 rounded-xl">
          <button
            onClick={() => setActiveTab('ONGOING')}
            className={cn(
              "px-6 py-2.5 rounded-lg text-sm font-bold transition-all duration-200",
              activeTab === 'ONGOING' 
                ? "bg-white text-gray-900 shadow-sm" 
                : "text-gray-500 hover:text-gray-700"
            )}
          >
            Đang cư trú ({history.filter(c => c.status === 'ACTIVE' || c.status === 'PENDING_SIGNATURE').length})
          </button>
          <button
            onClick={() => setActiveTab('PAST')}
            className={cn(
                  "px-6 py-2.5 rounded-lg text-sm font-bold transition-all duration-200",
                  activeTab === 'PAST' 
                    ? "bg-white text-gray-900 shadow-sm" 
                    : "text-gray-500 hover:text-gray-700"
                )}
          >
            Lịch sử cũ ({history.filter(c => c.status !== 'ACTIVE' && c.status !== 'PENDING_SIGNATURE').length})
          </button>
        </div>

        {/* SEARCH & FILTER */}
        <div className="flex-1 flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input 
              placeholder="Tìm theo tên phòng, địa chỉ..." 
              className="pl-10 h-11 bg-white border-transparent shadow-sm focus:border-primary"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <div className="relative min-w-[140px]">
            <Filter className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
            <select
              className="w-full h-11 pl-10 pr-4 bg-white border border-transparent rounded-lg text-sm font-medium shadow-sm focus:ring-2 focus:ring-primary outline-none appearance-none cursor-pointer"
              value={filterYear}
              onChange={(e) => setFilterYear(e.target.value)}
            >
              <option value="ALL">Tất cả năm</option>
              {years.filter(y => y !== 'ALL').map(y => (
                <option key={y} value={y}>Năm {y}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* 3. LIST CONTENT */}
      <div className="space-y-6">
        {filteredList.length === 0 ? (
          <div className="bg-white border-2 border-dashed border-gray-200 rounded-3xl py-24 flex flex-col items-center justify-center text-center px-6">
            <div className="h-24 w-24 bg-gray-50 rounded-full flex items-center justify-center mb-6 relative">
              <Building2 className="h-10 w-10 text-gray-300" />
              <Search className="h-5 w-5 text-gray-400 absolute bottom-0 right-0" />
            </div>
            <h3 className="text-xl font-bold text-gray-900 mb-2">Không tìm thấy kết quả nào</h3>
            <p className="text-gray-500 max-w-sm">
              Thử thay đổi từ khóa tìm kiếm hoặc chuyển bộ lọc về mặc định để thấy lời giải nhé.
            </p>
            {searchTerm || filterYear !== 'ALL' ? (
              <button 
                onClick={() => {setSearchTerm(''); setFilterYear('ALL');}}
                className="mt-6 text-primary font-bold hover:underline"
              >
                Xóa tất cả bộ lọc
              </button>
            ) : (
                <Link to="/properties" className="mt-8 bg-primary text-white px-8 py-3 rounded-xl font-bold shadow-lg shadow-primary/20 hover:scale-105 transition-transform flex items-center gap-2">
                    Bắt đầu hành trình mới <ArrowRight className="h-5 w-5" />
                </Link>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-6">
            {filteredList.map((item) => {
              const statusCfg = getStatusConfig(item.status);
              const roleCfg = getRoleConfig(item.userRole || 'MEMBER');
              const StatusIcon = statusCfg.icon;

              return (
                <div 
                  key={item.id}
                  className="group relative bg-white border border-gray-100 rounded-2xl shadow-sm hover:shadow-xl hover:border-primary/20 transition-all duration-300 overflow-hidden"
                >
                  <div className="flex flex-col lg:flex-row divide-y lg:divide-y-0 lg:divide-x divide-gray-100">
                    
                    {/* INFO SECTION */}
                    <div className="flex-1 p-6 md:p-8 space-y-6">
                      <div className="flex justify-between items-start">
                        <div className="space-y-3">
                          <div className="flex items-center gap-2">
                             <span className={cn("inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border", statusCfg.color)}>
                               <StatusIcon className="h-3 w-3" />
                               {statusCfg.label}
                             </span>
                             <span className={cn("inline-flex items-center px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border", roleCfg.color)}>
                               {roleCfg.label}
                             </span>
                          </div>
                          <h3 className="text-2xl font-black text-gray-900 group-hover:text-primary transition-colors">
                            Phòng {item.roomName}
                          </h3>
                        </div>
                        <div className="bg-gray-50 px-3 py-1 rounded-md text-[10px] font-bold text-gray-400">ID: #{item.id}</div>
                      </div>

                      <div className="flex items-start gap-2 text-gray-500 bg-gray-50/50 p-3 rounded-xl">
                        <MapPin className="h-4 w-4 mt-1 text-primary/60 shrink-0" />
                        <span className="text-sm font-medium leading-relaxed">{item.propertyAddress}</span>
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div className="flex items-center gap-3">
                            <div className="h-10 w-10 rounded-full bg-indigo-50 flex items-center justify-center shrink-0">
                                <Calendar className="h-5 w-5 text-indigo-500" />
                            </div>
                            <div>
                                <div className="text-[10px] font-black text-gray-400 uppercase tracking-tighter">Bắt đầu</div>
                                <div className="text-sm font-bold text-gray-700">{format(new Date(item.startDate), 'dd MMM, yyyy', { locale: vi })}</div>
                            </div>
                        </div>
                        <div className="flex items-center gap-3">
                            <div className="h-10 w-10 rounded-full bg-orange-50 flex items-center justify-center shrink-0">
                                <Clock className="h-5 w-5 text-orange-500" />
                            </div>
                            <div>
                                <div className="text-[10px] font-black text-gray-400 uppercase tracking-tighter">Kết thúc</div>
                                <div className="text-sm font-bold text-gray-700">
                                    {item.endDate ? format(new Date(item.endDate), 'dd MMM, yyyy', { locale: vi }) : 'Dài hạn'}
                                </div>
                            </div>
                        </div>
                      </div>
                    </div>

                    {/* ACTION SECTION */}
                    <div className="w-full lg:w-72 bg-gray-50/30 p-6 md:p-8 flex flex-col justify-between gap-6">
                        <div className="space-y-4">
                            <div>
                                <div className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Giá thuê (tháng)</div>
                                <div className="text-2xl font-black text-gray-900 leading-none">
                                    {new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(item.actualPrice || 0)}
                                </div>
                            </div>
                            <div className="pt-4 border-t border-gray-100">
                                <div className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">Đại diện chủ trọ</div>
                                <div className="flex items-center gap-2">
                                    <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-xs uppercase">
                                        {item.landlordName?.charAt(0)}
                                    </div>
                                    <span className="text-sm font-bold text-gray-700 truncate">{item.landlordName}</span>
                                </div>
                            </div>
                        </div>

                        <Link 
                            to={`/contracts/${item.id}`}
                            className="w-full flex items-center justify-center gap-2 py-3 bg-white border border-gray-200 text-gray-700 rounded-xl font-bold text-sm shadow-sm hover:bg-primary hover:text-white hover:border-primary transition-all duration-300 transform group-hover:translate-x-1"
                        >
                            Xem chi tiết <ArrowRight className="h-4 w-4" />
                        </Link>
                    </div>

                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* 4. FOOTER NOTE */}
      <div className="bg-gradient-to-r from-primary/5 to-transparent p-6 rounded-3xl border border-primary/10 flex items-start gap-4">
        <div className="p-3 bg-white rounded-2xl shadow-sm border border-primary/5">
            <ShieldCheck className="h-6 w-6 text-primary" />
        </div>
        <div className="space-y-1">
            <h4 className="font-bold text-gray-900">Tính năng Nhật ký Thuê phòng 2.0</h4>
            <p className="text-gray-500 text-sm leading-relaxed max-w-3xl">
                Thông tin lưu trú của bạn được hệ thống SmartRental bảo vệ và lưu trữ không thời hạn. 
                Bạn có thể trích xuất các thông tin này làm bằng chứng uy tín cho việc thuê các căn hộ cao cấp hơn trong tương lai.
            </p>
        </div>
      </div>
    </div>
  );
}

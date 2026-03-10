import { useNavigate } from "react-router-dom";
import { 
  MapPin, Calendar, CheckCircle2, AlertCircle, 
  Clock, XCircle, ChevronRight, FileText, Banknote
} from "lucide-react";
import type { Contract } from "@/types";

interface ContractItemProps {
  data: Contract;
}

export default function ContractItem({ data }: ContractItemProps) {
  const navigate = useNavigate();

  const formatPrice = (price: number) => 
    new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(price);

  const formatDate = (dateStr: string) => 
    dateStr ? new Date(dateStr).toLocaleDateString('vi-VN') : 'Chưa xác định';

  const renderStatus = (status: string) => {
    switch (status) {
      case 'ACTIVE':
        return <span className="bg-green-100 text-green-700 px-4 py-1.5 rounded-full text-xs font-bold border border-green-200">Hiệu lực</span>;
      case 'PENDING_SIGNATURE':
        return <span className="bg-orange-100 text-orange-700 px-4 py-1.5 rounded-full text-xs font-bold border border-orange-200">Chờ ký</span>;
      case 'EXPIRED':
        return <span className="bg-gray-100 text-gray-700 px-4 py-1.5 rounded-full text-xs font-bold border border-gray-200">Hết hạn</span>;
      default:
        return <span className="bg-red-100 text-red-700 px-4 py-1.5 rounded-full text-xs font-bold border border-red-200">Đã hủy</span>;
    }
  };

  return (
    <div 
      className="group bg-white rounded-2xl border border-gray-200 p-6 hover:shadow-xl hover:border-primary/40 transition-all cursor-pointer relative overflow-hidden"
      onClick={() => navigate(`/contracts/${data.id}`)}
    >
      {/* Hiệu ứng màu nền nhẹ khi hover */}
      <div className="absolute inset-0 bg-gradient-to-r from-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />

      <div className="flex flex-col md:flex-row md:items-center gap-6 relative z-10">
        {/* Khối 1: Icon & Thông tin định danh (Cao hơn) */}
        <div className="flex items-center gap-5 md:w-1/4">
          <div className="h-16 w-16 rounded-2xl bg-primary/10 flex items-center justify-center text-primary shrink-0 group-hover:bg-primary group-hover:text-white transition-all duration-300 shadow-sm">
            <FileText className="h-8 w-8" />
          </div>
          <div className="min-w-0 space-y-1">
            <h3 className="text-lg font-extrabold text-gray-900 truncate leading-tight group-hover:text-primary transition-colors">
              {data.roomName || `Phòng #${data.roomId}`}
            </h3>
            <p className="text-[11px] text-gray-400 font-mono tracking-tighter bg-gray-100 w-fit px-2 py-0.5 rounded">
              MÃ: {data.code || `#${data.id}`}
            </p>
          </div>
        </div>

        {/* Khối 2: Địa chỉ & Thời gian (Dãn dòng hơn) */}
        <div className="flex flex-col gap-2.5 md:w-1/3 text-sm text-gray-600">
          <div className="flex items-start gap-2.5">
            <MapPin className="h-4 w-4 text-primary mt-0.5 shrink-0" />
            <span className="line-clamp-2 leading-relaxed font-medium">
              {data.propertyAddress || "Địa chỉ đang cập nhật..."}
            </span>
          </div>
          <div className="flex items-center gap-2.5">
            <Calendar className="h-4 w-4 text-gray-400 shrink-0" />
            <span className="font-medium italic text-gray-500">
              {formatDate(data.startDate)} — {formatDate(data.endDate)}
            </span>
          </div>
        </div>

        {/* Khối 3: Giá thuê (To và rõ ràng) */}
        <div className="md:w-1/6 flex flex-col justify-center">
          <div className="flex items-center gap-1.5 text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">
            <Banknote className="w-3 h-3" />
            <span>Giá thuê tháng</span>
          </div>
          <p className="text-2xl font-black text-primary tracking-tight">
            {formatPrice(data.actualPrice || 0)}
          </p>
        </div>

        {/* Khối 4: Trạng thái & Action */}
        <div className="flex items-center justify-between md:w-1/4 md:justify-end gap-6 border-t md:border-t-0 pt-4 md:pt-0">
          {renderStatus(data.status)}
          <div className="h-10 w-10 rounded-xl border border-gray-200 flex items-center justify-center group-hover:bg-primary group-hover:border-primary group-hover:text-white transition-all shadow-sm">
            <ChevronRight className="h-5 w-5" />
          </div>
        </div>
      </div>
    </div>
  );
}
import { Link } from "react-router-dom";
import { FileText, MapPin, Calendar, CheckCircle2, AlertCircle, Clock, XCircle } from "lucide-react";
import { Button } from "@/components/ui/Button";
import type { Contract } from "@/types";

interface ContractItemProps {
  data: Contract;
}

export default function ContractItem({ data }: ContractItemProps) {
  // Helper format tiền
  const formatPrice = (price: number) => 
    new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(price);

  // Helper format ngày
  const formatDate = (dateStr: string) => 
    dateStr ? new Date(dateStr).toLocaleDateString('vi-VN') : 'Chưa xác định';

  // Helper hiển thị trạng thái (Badge)
  const renderStatus = (status: string) => {
    switch (status) {
      case 'ACTIVE':
        return <span className="bg-green-100 text-green-700 px-2 py-1 rounded-full text-xs font-bold flex items-center gap-1"><CheckCircle2 className="h-3 w-3"/> Đang hiệu lực</span>;
      case 'PENDING_SIGNATURE':
        return <span className="bg-yellow-100 text-yellow-700 px-2 py-1 rounded-full text-xs font-bold flex items-center gap-1"><AlertCircle className="h-3 w-3"/> Chờ ký tên</span>;
      case 'EXPIRED':
        return <span className="bg-gray-100 text-gray-600 px-2 py-1 rounded-full text-xs font-bold flex items-center gap-1"><Clock className="h-3 w-3"/> Đã hết hạn</span>;
      case 'TERMINATED_EARLY':
        return <span className="bg-red-100 text-red-700 px-2 py-1 rounded-full text-xs font-bold flex items-center gap-1"><XCircle className="h-3 w-3"/> Đã hủy</span>;
      default:
        return <span className="bg-gray-100 text-gray-700 px-2 py-1 rounded-full text-xs font-bold">{status}</span>;
    }
  };

  return (
    <div className="group bg-white border rounded-xl p-5 shadow-sm hover:shadow-md transition-all duration-200">
      <div className="flex flex-col md:flex-row justify-between gap-4">
        {/* Thông tin chính */}
        <div className="flex-1 space-y-2">
          <div className="flex items-center gap-2 mb-1">
             <span className="text-xs font-mono text-gray-400">#{data.code || data.id}</span>
             {renderStatus(data.status)}
          </div>
          
          {/* Vì API trả về contract, cần đảm bảo backend trả về roomName/address hoặc bạn phải join bảng. 
              Giả sử backend trả về field roomName (nếu chưa có thì update backend hoặc mapping DTO) */}
          <h3 className="text-lg font-bold text-gray-900 group-hover:text-primary transition-colors">
            {/* Nếu DTO chưa có roomName, tạm thời hardcode hoặc check lại Backend */}
            {(data as any).roomName || "Phòng trọ #" + data.roomId} 
          </h3>
          
          <div className="flex items-center text-sm text-gray-500">
            <MapPin className="h-3.5 w-3.5 mr-1" />
            <span className="line-clamp-1">{(data as any).propertyAddress || "Đang cập nhật địa chỉ..."}</span>
          </div>

          <div className="flex items-center gap-4 text-xs text-gray-500 pt-2">
             <div className="flex items-center gap-1">
               <Calendar className="h-3 w-3"/> 
               {formatDate(data.startDate)} - {formatDate(data.endDate)}
             </div>
          </div>
        </div>

        {/* Giá & Hành động */}
        <div className="flex flex-col justify-between items-end gap-3 min-w-[120px]">
           <div className="text-right">
             <p className="text-sm font-medium text-gray-500">Giá thuê</p>
             <p className="text-lg font-bold text-primary">{formatPrice(data.monthlyPrice)}</p>
           </div>
           
           <Link to={`/contracts/${data.id}`}>
             <Button size="sm" variant="outline" className="w-full">Xem chi tiết</Button>
           </Link>
        </div>
      </div>
    </div>
  );
}
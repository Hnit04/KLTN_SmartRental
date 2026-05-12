import { useNavigate } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { 
  MapPin, Calendar, CheckCircle2, AlertCircle, 
  Clock, XCircle, ChevronRight, FileText, Banknote
} from "lucide-react";
import type { Contract } from "@/types";
import StatusBadge from "@/components/shared/StatusBadge";
import { Button } from "@/components/ui/Button";

interface ContractItemProps {
  data: Contract;
}

export default function ContractItem({ data }: ContractItemProps) {
  const navigate = useNavigate();
  const { user } = useAuth();

  const formatPrice = (price: number) => 
    new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(price);

  const formatDate = (dateStr: string) => 
    dateStr ? new Date(dateStr).toLocaleDateString('vi-VN') : 'Chưa xác định';

  const renderStatus = (status: string) => {
    switch (status) {
      case 'ACTIVE':
        return <StatusBadge label="Hiệu lực" tone="success" className="text-xs font-semibold px-2.5 py-1" />;
        
      case 'PENDING_SIGNATURE':
        return <StatusBadge label="Chờ ký" tone="warning" className="text-xs font-semibold px-2.5 py-1" />;
        
      case 'AWAITING_DEPOSIT':
        return <StatusBadge label="Chờ thanh toán" tone="warning" className="text-xs font-semibold px-2.5 py-1" />;
        
      case 'EXPIRED':
        return <StatusBadge label="Hết hạn" tone="neutral" className="text-xs font-semibold px-2.5 py-1" />;
        
      case 'TERMINATED_EARLY':
        return <StatusBadge label="Chấm dứt trước hạn" tone="danger" className="text-xs font-semibold px-2.5 py-1" />;
        
      case 'CANCELLED':
        return <StatusBadge label="Đã hủy" tone="danger" className="text-xs font-semibold px-2.5 py-1" />;
        
      default:
        return <StatusBadge label="Không xác định" tone="neutral" className="text-xs font-semibold px-2.5 py-1" />;
    }
  };

  const canUseWizard =
    data.status === "PENDING_SIGNATURE" || data.status === "AWAITING_DEPOSIT";
  const prefix = user?.role === "LANDLORD" ? "/landlord" : "/tenant";

  return (
    <div 
      className="group bg-white rounded-2xl border border-slate-200/60 p-5 md:p-6 hover:shadow-[0_8px_30px_rgb(0,0,0,0.04)] hover:border-primary transition-all duration-300 cursor-pointer relative overflow-hidden"
      onClick={() => {
        navigate(`${prefix}/contracts/${data.id}`);
      }}
    >
      {/* Hiệu ứng màu nền nhẹ khi hover */}
      <div className="absolute inset-0 bg-gradient-to-r from-indigo-50/40 via-transparent to-transparent opacity-0 group-hover:opacity-500 transition-opacity duration-300" />

      <div className="flex flex-col md:flex-row md:items-center gap-6 relative z-10">
        {/* Khối 1: Icon & Thông tin định danh */}
        <div className="flex items-center gap-4 md:w-1/4">
          <div className="h-14 w-14 rounded-2xl bg-indigo-50 flex items-center justify-center text-primary shrink-0 transition-all duration-300 shadow-sm">
            <FileText className="h-6 w-6" />
          </div>
          <div className="min-w-0 space-y-1">
            <h3 className="text-base font-bold text-primary truncate transition-colors">
              {data.roomName || `Phòng #${data.roomId}`}
            </h3>
            <span className="inline-block text-[10px] font-mono font-medium tracking-wide bg-slate-100 text-slate-600 px-2 py-0.5 rounded-md">
              MÃ: {data.code || `#${data.id}`}
            </span>
          </div>
        </div>

        {/* Khối 2: Địa chỉ & Thời gian */}
        <div className="flex flex-col gap-2.5 md:w-1/3 text-sm text-slate-600">
          <div className="flex items-start gap-2.5">
            <MapPin className="h-4 w-4 text-indigo-500 mt-0.5 shrink-0" />
            <span className="line-clamp-2 leading-relaxed text-slate-600 font-medium">
              {data.propertyAddress || "Địa chỉ đang cập nhật..."}
            </span>
          </div>
          <div className="flex items-center gap-2.5">
            <Calendar className="h-4 w-4 text-slate-400 shrink-0" />
            <span className="font-medium text-slate-500 text-[13px]">
              {formatDate(data.startDate)} — {formatDate(data.endDate)}
            </span>
          </div>
        </div>

        {/* Khối 3: Giá thuê */}
        <div className="md:w-1/6 flex flex-col justify-center">
          <div className="flex items-center gap-1.5 text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">
            <Banknote className="w-3.5 h-3.5 text-slate-400" />
            <span>Giá thuê tháng</span>
          </div>
          <p className="text-xl font-black text-slate-900 tracking-tight">
            {formatPrice(data.actualPrice || 0)}
          </p>
        </div>

        <div className="flex items-center justify-between md:w-1/4 md:justify-end gap-6 border-t border-slate-100/80 pt-4 md:pt-0 md:border-t-0">
          <div className="flex items-center gap-2">
            {renderStatus(data.status)}
            {canUseWizard && (
              <Button
                type="button"
                size="sm"
                variant="outline"
                className="bg-primary/5 hover:bg-primary/10 border-primary/20 text-primary font-bold"
                onClick={(e) => {
                  e.stopPropagation();
                  navigate(`${prefix}/contracts/${data.id}/sign`);
                }}
              >
                Ký & Thanh toán
              </Button>
            )}

            {(data.status === 'EXPIRED' || data.status === 'TERMINATED_EARLY') && data.depositStatus === 'DEPOSITED' && (
              <Button
                type="button"
                size="sm"
                variant="outline"
                className="bg-amber-50 hover:bg-amber-100 border-amber-200 text-amber-700 font-bold"
                onClick={(e) => {
                  e.stopPropagation();
                  navigate(`${prefix}/contracts/${data.id}/settle`);
                }}
              >
                {user?.role === 'LANDLORD' ? 'Quyết toán ngay' : 'Theo dõi quyết toán'}
              </Button>
            )}
          </div>
          <div className="h-9 w-9 rounded-xl border border-slate-200 bg-white flex items-center justify-center text-slate-600 transition-all duration-300 shadow-sm">
            <ChevronRight className="h-4 w-4" />
          </div>
        </div>
      </div>
    </div>
  );
}

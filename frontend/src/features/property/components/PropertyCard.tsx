// src/components/shared/PropertyCard.tsx
import { useNavigate } from "react-router-dom";
import { MapPin, Zap, Droplets, Wifi } from "lucide-react";
import { Button } from "@/components/ui/Button";
import StatusBadge from "@/components/shared/StatusBadge";
import type { Property } from "@/types/index";

interface PropertyCardProps {
  data: Property;
}

export default function PropertyCard({ data }: PropertyCardProps) {
  const navigate = useNavigate();

  // Hàm format tiền Việt
  const formatPrice = (price: number) => {
    if (!price) return "Liên hệ";
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(price);
  };

  // Lấy ảnh đầu tiên hoặc ảnh placeholder
  const thumbnail = data.images && data.images.length > 0 
    ? data.images[0] 
    : "https://placehold.co/600x400?text=No+Image";

  return (
    <div 
      onClick={() => navigate(`/properties/${data.id}`)}
      className={`group bg-card border rounded-2xl overflow-hidden shadow-sm hover:shadow-lg hover:border-primary/30 transition-[box-shadow,border-color] duration-300 flex flex-col h-full cursor-pointer relative ${data.availableRooms === 0 ? 'opacity-90' : ''}`}
    >
      {/* 1. Hình ảnh & Badge giá */}
      <div className="relative h-48 overflow-hidden bg-gray-100">
        <img 
          src={thumbnail} 
          alt={data.name} 
          loading="lazy"
          className="w-full h-full object-cover will-change-transform group-hover:scale-[1.03] transition-transform duration-500"
        />
        <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent p-3 pt-8">
           <p className="text-white font-bold text-lg">
             {data.minPrice ? formatPrice(data.minPrice) : "Đang cập nhật"} 
             <span className="text-sm font-normal opacity-90"> / tháng</span>
           </p>
        </div>
        
        {/* Badge số phòng trống */}
        <div className="absolute top-3 right-3">
          <StatusBadge
            label={data.availableRooms && data.availableRooms > 0 ? `${data.availableRooms} phòng trống` : "Hết phòng"}
            tone={data.availableRooms && data.availableRooms > 0 ? "success" : "danger"}
            className="text-xs font-bold shadow-sm backdrop-blur-sm"
          />
        </div>
      </div>

      {/* 2. Nội dung text */}
      <div className="p-4 md:p-5 flex flex-col flex-1">
        <h3 className="font-semibold text-lg text-foreground line-clamp-1 group-hover:text-primary transition-colors mb-1">
          {data.name}
        </h3>

        <div className="flex items-start text-muted-foreground text-sm mb-3">
          <MapPin className="h-4 w-4 mr-1 shrink-0 mt-0.5 text-primary" />
          <span className="line-clamp-2">
            {data.address}, {data.district}, {data.city}
          </span>
        </div>

        {/* Thông tin dịch vụ (Điện/Nước/Net) */}
        <div className="grid grid-cols-3 gap-2 mb-4 bg-muted/40 p-2.5 rounded-xl border border-border/60">
          <div className="flex flex-col items-center text-xs text-muted-foreground">
            <Zap className="h-4 w-4 mb-1 text-yellow-500" />
            <span>{data.elecPrice ? `${data.elecPrice / 1000}k/kW` : "Free"}</span>
          </div>
          <div className="flex flex-col items-center text-xs text-muted-foreground">
            <Droplets className="h-4 w-4 mb-1 text-blue-500" />
            <span>{data.waterPrice ? `${data.waterPrice / 1000}k/m3` : "Free"}</span>
          </div>
          <div className="flex flex-col items-center text-xs text-muted-foreground">
            <Wifi className="h-4 w-4 mb-1 text-green-500" />
            <span>{data.internetPrice ? `${data.internetPrice / 1000}k` : "Free"}</span>
          </div>
        </div>

        <div className="mt-auto pt-3 border-t border-border/70 min-h-[52px] flex items-end">
          <Button 
            className="w-full h-10 rounded-xl flex items-center justify-center bg-background text-primary border border-primary/20 hover:bg-primary hover:text-primary-foreground"
            onClick={(e) => {
              e.stopPropagation();
              navigate(`/properties/${data.id}`);
            }}
          >
            Xem danh sách phòng
          </Button>
        </div>
      </div>
    </div>
  );
}
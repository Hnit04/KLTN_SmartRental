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
      className={`group bg-card border rounded-2xl overflow-hidden shadow-sm hover:shadow-lg hover:border-primary/30 hover:-translate-y-1 transition-all duration-300 flex flex-col h-full cursor-pointer relative ${data.availableRooms === 0 ? 'opacity-90' : ''}`}
    >
      {/* 1. Hình ảnh & Badge giá */}
      <div className="relative h-36 overflow-hidden bg-gray-100 sm:h-44 md:h-48">
        <img 
          src={thumbnail} 
          alt={data.name} 
          loading="lazy"
          className="h-full w-full object-cover transition-transform duration-700 will-change-transform group-hover:scale-[1.04]"
        />
        <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/75 to-transparent p-2 pt-6 sm:p-3 sm:pt-8">
           <p className="text-sm font-bold text-white sm:text-lg">
             {data.minPrice ? formatPrice(data.minPrice) : "Đang cập nhật"} 
             <span className="text-xs font-normal opacity-90 sm:text-sm"> / tháng</span>
           </p>
        </div>
        
        {/* Badge số phòng trống — gọn trên mobile */}
        <div className="absolute right-2 top-2 max-w-[58%] sm:right-3 sm:top-3 sm:max-w-[85%]">
          <StatusBadge
            label={
              data.availableRooms && data.availableRooms > 0
                ? `${data.availableRooms} phòng trống`
                : "Hết phòng"
            }
            tone={data.availableRooms && data.availableRooms > 0 ? "success" : "danger"}
            className="block max-w-full truncate text-[11px] font-bold shadow-sm backdrop-blur-sm sm:text-xs"
          />
        </div>
      </div>

      {/* 2. Nội dung text */}
      <div className="flex flex-1 flex-col p-3 sm:p-4 md:p-5">
        <h3 className="mb-1 line-clamp-2 text-base font-semibold text-foreground transition-colors group-hover:text-primary sm:line-clamp-1 sm:text-lg">
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

        <div className="mt-auto flex min-h-[44px] items-end border-t border-border/70 pt-2 sm:min-h-[52px] sm:pt-3">
          <Button 
            className="flex h-9 w-full items-center justify-center rounded-xl border border-primary/20 bg-background text-xs text-primary hover:bg-primary hover:text-primary-foreground hover:shadow-md transition-all duration-200 sm:h-10 sm:text-sm"
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
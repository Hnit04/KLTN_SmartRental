import type { Room } from "@/types/index";
import { Badge } from "@/components/ui/Badge"; // Nếu chưa có Badge, dùng div class rounded
import { CheckCircle, XCircle, Maximize, CreditCard } from "lucide-react";
import { Button } from "@/components/ui/Button";

interface RoomCardProps {
  data: Room;
}

export default function RoomCard({ data }: RoomCardProps) {
  const isAvailable = data.status === "AVAILABLE";

  const formatPrice = (price: number) => 
    new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(price);

  return (
    <div className={`border rounded-lg p-4 transition-all hover:shadow-md bg-white flex flex-col h-full ${!isAvailable ? 'opacity-70 bg-gray-50' : ''}`}>
      {/* Header: Tên phòng & Trạng thái */}
      <div className="flex justify-between items-start mb-3">
        <h4 className="font-bold text-lg text-primary">{data.name}</h4>
        {isAvailable ? (
          <span className="bg-green-100 text-green-700 text-xs px-2 py-1 rounded-full flex items-center gap-1 font-medium">
            <CheckCircle className="h-3 w-3" /> Trống
          </span>
        ) : (
          <span className="bg-gray-200 text-gray-600 text-xs px-2 py-1 rounded-full flex items-center gap-1 font-medium">
            <XCircle className="h-3 w-3" /> Đã thuê
          </span>
        )}
      </div>

      {/* Thông số */}
      <div className="space-y-2 mb-4 flex-1">
        <div className="flex items-center justify-between text-sm">
          <div className="flex items-center text-muted-foreground">
            <CreditCard className="h-4 w-4 mr-2" />
            Giá thuê:
          </div>
          <span className="font-bold text-foreground">{formatPrice(data.price)}</span>
        </div>
        <div className="flex items-center justify-between text-sm">
          <div className="flex items-center text-muted-foreground">
            <Maximize className="h-4 w-4 mr-2" />
            Diện tích:
          </div>
          <span>{data.area} m²</span>
        </div>
      </div>

      {/* Tiện ích (Amenities) */}
      {data.amenities && data.amenities.length > 0 && (
        <div className="flex flex-wrap gap-1 mb-4">
          {data.amenities.map((item, index) => (
            <span key={index} className="text-[10px] bg-secondary px-2 py-1 rounded text-secondary-foreground">
              {item}
            </span>
          ))}
        </div>
      )}

      {/* Nút hành động */}
      <Button 
        className="w-full mt-auto" 
        variant={isAvailable ? "default" : "outline"}
        disabled={!isAvailable}
      >
        {isAvailable ? "Liên hệ thuê ngay" : "Đã hết phòng"}
      </Button>
    </div>
  );
}
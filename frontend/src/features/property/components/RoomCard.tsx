import { useNavigate } from "react-router-dom";
import { 
  CheckCircle, XCircle, Maximize, CreditCard, 
  Image as ImageIcon, FileSignature, ArrowRight 
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import type { Room } from "@/types/index";

interface RoomCardProps {
  data: Room;
}

export default function RoomCard({ data }: RoomCardProps) {
  const navigate = useNavigate();

  // 1. Kiểm tra trạng thái
  const isAvailable = data.status === "AVAILABLE";

  // 2. Format giá tiền
  const formatPrice = (price: number) => 
    new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(price);

  // 3. Xử lý dữ liệu JSON từ Backend (Vì Java lưu dưới dạng String)
  // Cần parse chuỗi JSON thành mảng để sử dụng
  let images: string[] = [];
  let amenities: string[] = [];

  try {
    images = data.images ? (typeof data.images === 'string' ? JSON.parse(data.images) : data.images) : [];
    amenities = data.amenities ? (typeof data.amenities === 'string' ? JSON.parse(data.amenities) : data.amenities) : [];
  } catch (e) {
    console.error("Lỗi parse JSON dữ liệu phòng:", e);
  }

  // Lấy ảnh đầu tiên làm ảnh bìa
  const coverImage = images.length > 0 ? images[0] : null;

  // --- HANDLER ---
  const handleRentNow = () => {
    // Chuyển sang trang tạo hợp đồng, kèm theo ID phòng
    navigate(`/contracts/create?roomId=${data.id}`);
  };

  return (
    <div className={`group border rounded-xl overflow-hidden bg-white flex flex-col h-full transition-all hover:shadow-lg hover:border-primary/50 ${!isAvailable ? 'opacity-80 bg-gray-50' : ''}`}>
      
      {/* --- PHẦN 1: ẢNH PHÒNG (MỚI) --- */}
      <div className="relative h-48 bg-gray-100 overflow-hidden">
        {coverImage ? (
          <img 
            src={coverImage} 
            alt={data.name} 
            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
          />
        ) : (
          <div className="flex flex-col items-center justify-center h-full text-gray-400">
            <ImageIcon className="h-10 w-10 mb-2 opacity-50" />
            <span className="text-xs">Chưa có hình ảnh</span>
          </div>
        )}

        {/* Badge Trạng thái nổi trên ảnh */}
        <div className="absolute top-3 right-3 shadow-sm">
          {isAvailable ? (
            <span className="bg-green-500 text-white text-[10px] font-bold px-2.5 py-1 rounded-full flex items-center gap-1 shadow-sm">
              <CheckCircle className="h-3 w-3" /> CÒN TRỐNG
            </span>
          ) : (
            <span className="bg-gray-500 text-white text-[10px] font-bold px-2.5 py-1 rounded-full flex items-center gap-1 shadow-sm">
              <XCircle className="h-3 w-3" /> ĐÃ THUÊ
            </span>
          )}
        </div>
      </div>

      {/* --- PHẦN 2: NỘI DUNG --- */}
      <div className="p-4 flex-1 flex flex-col">
        <div className="flex justify-between items-start mb-2">
          <h4 className="font-bold text-lg text-gray-900 group-hover:text-primary transition-colors">
            Phòng {data.name}
          </h4>
          <span className="font-bold text-primary text-lg">
            {formatPrice(data.price)}
          </span>
        </div>

        {/* Thông số */}
        <div className="space-y-2 mb-4">
          <div className="flex items-center text-sm text-gray-500">
            <Maximize className="h-4 w-4 mr-2 text-gray-400" />
            <span>Diện tích: <strong>{data.area} m²</strong></span>
          </div>
          {/* Bạn có thể thêm số người tối đa nếu có trong data */}
        </div>

        {/* Tiện ích (Amenities) */}
        {amenities.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mb-4">
            {amenities.slice(0, 3).map((item, index) => (
              <span key={index} className="text-[10px] bg-gray-100 text-gray-600 px-2 py-1 rounded border border-gray-200">
                {item}
              </span>
            ))}
            {amenities.length > 3 && (
              <span className="text-[10px] bg-gray-100 text-gray-500 px-2 py-1 rounded border border-gray-200">
                +{amenities.length - 3}
              </span>
            )}
          </div>
        )}

        {/* --- PHẦN 3: ACTION BUTTONS --- */}
        <div className="mt-auto grid grid-cols-2 gap-2 pt-3 border-t">
            {/* Nút Xem chi tiết (Optional) */}
            <Button 
                variant="outline" 
                size="sm" 
                className="text-xs"
                // Logic mở modal chi tiết phòng nếu cần
                onClick={() => {}} 
            >
                Xem chi tiết
            </Button>

            {/* Nút Thuê ngay */}
            <Button 
                size="sm"
                className={`text-xs gap-1 ${!isAvailable ? 'cursor-not-allowed opacity-70' : ''}`}
                disabled={!isAvailable}
                onClick={handleRentNow}
            >
                {isAvailable ? (
                    <>Thuê ngay <ArrowRight className="h-3 w-3" /></>
                ) : (
                    "Đã hết"
                )}
            </Button>
        </div>
      </div>
    </div>
  );
}
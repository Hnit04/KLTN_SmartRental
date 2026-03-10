import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { 
  CheckCircle, XCircle, Maximize, ArrowRight, 
  Eye, FileSignature, Image as ImageIcon, CalendarClock 
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import type { Room } from "@/types/index";

interface RoomCardProps {
  data: Room;
  onBookAppointment?: () => void;
}

export default function RoomCard({ data, onBookAppointment }: RoomCardProps) {
  const navigate = useNavigate();
  const [isDetailOpen, setIsDetailOpen] = useState(false);

  // 1. Kiểm tra trạng thái phòng
  const isAvailable = data.status === "AVAILABLE";

  // 2. Format giá tiền
  const formatPrice = (price: number) => 
    new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(price);

  // 3. Xử lý parse JSON ảnh và tiện ích
  let images: string[] = [];
  let amenities: string[] = [];

  try {
    images = data.images ? (typeof data.images === 'string' ? JSON.parse(data.images) : data.images) : [];
    amenities = data.amenities ? (typeof data.amenities === 'string' ? JSON.parse(data.amenities) : data.amenities) : [];
  } catch (e) {
    images = []; 
    amenities = [];
  }

  const coverImage = images.length > 0 ? images[0] : null;

  // ✅ KHÔI PHỤC HÀM "THUÊ NGAY"
  const handleRentNow = () => {
    if (!isAvailable) return;
    // Điều hướng sang trang tạo hợp đồng, truyền ID phòng lên URL
    navigate(`/contracts/create?roomId=${data.id}`);
  };

  return (
    <>
      <div className={`group border rounded-xl overflow-hidden bg-white flex flex-col h-full transition-all hover:shadow-lg hover:border-primary/50 ${!isAvailable ? 'opacity-70 bg-gray-50' : ''}`}>
        
        {/* --- ẢNH PHÒNG --- */}
        <div className="relative h-48 bg-gray-100 overflow-hidden cursor-pointer" onClick={() => setIsDetailOpen(true)}>
          {coverImage ? (
            <img 
              src={coverImage} 
              alt={data.name} 
              className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
            />
          ) : (
            <div className="flex flex-col items-center justify-center h-full text-gray-400">
              <ImageIcon className="h-10 w-10 mb-2 opacity-50" />
              <span className="text-xs">Chưa có ảnh</span>
            </div>
          )}

          <div className="absolute top-3 right-3 shadow-sm">
            {isAvailable ? (
              <span className="bg-green-500 text-white text-[10px] font-bold px-2.5 py-1 rounded-full flex items-center gap-1 shadow-sm uppercase tracking-wider">
                <CheckCircle className="h-3 w-3" /> Còn trống
              </span>
            ) : (
              <span className="bg-gray-500 text-white text-[10px] font-bold px-2.5 py-1 rounded-full flex items-center gap-1 shadow-sm uppercase tracking-wider">
                <XCircle className="h-3 w-3" /> Đã thuê
              </span>
            )}
          </div>
        </div>

        {/* --- THÔNG TIN --- */}
        <div className="p-4 flex-1 flex flex-col">
          <div className="flex justify-between items-start mb-2">
            <h4 className="font-bold text-lg text-gray-900 group-hover:text-primary transition-colors truncate pr-2">
              Phòng {data.name}
            </h4>
            <span className="font-bold text-primary text-lg shrink-0">
              {formatPrice(data.price)}
            </span>
          </div>

          <div className="space-y-2 mb-4">
            <div className="flex items-center text-sm text-gray-500">
              <Maximize className="h-4 w-4 mr-2 text-gray-400" />
              <span>Diện tích: <strong>{data.area} m²</strong></span>
            </div>
          </div>

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

          {/* --- NÚT HÀNH ĐỘNG NGOÀI THẺ --- */}
          <div className="mt-auto grid grid-cols-2 gap-2 pt-3 border-t">
              <Button 
                  variant="outline" 
                  size="sm" 
                  className="text-xs h-9 hover:text-primary hover:border-primary/50"
                  onClick={() => setIsDetailOpen(true)}
              >
                  <Eye className="h-3.5 w-3.5 mr-1.5" /> Chi tiết
              </Button>

              <Button 
                  size="sm"
                  className={`text-xs h-9 gap-1 ${!isAvailable ? 'cursor-not-allowed opacity-50' : 'bg-primary hover:bg-primary/90 text-white'}`}
                  disabled={!isAvailable}
                  onClick={(e) => {
                      e.stopPropagation();
                      if (onBookAppointment) onBookAppointment();
                  }}
              >
                  {isAvailable ? (
                      <>Đặt lịch xem <CalendarClock className="h-3.5 w-3.5 ml-0.5" /></>
                  ) : (
                      "Đã hết"
                  )}
              </Button>
          </div>
        </div>
      </div>

      {/* --- MODAL CHI TIẾT PHÒNG --- */}
      {isDetailOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 animate-in fade-in">
             <div className="bg-white rounded-xl w-full max-w-lg overflow-hidden shadow-2xl animate-in zoom-in-95 relative flex flex-col max-h-[90vh]">
                
                <div className="h-56 bg-gray-100 relative shrink-0">
                    {coverImage && <img src={coverImage} className="w-full h-full object-cover" alt="" />}
                    <button onClick={() => setIsDetailOpen(false)} className="absolute top-2 right-2 bg-black/50 text-white p-1 rounded-full hover:bg-black/70">
                        <XCircle className="h-6 w-6" />
                    </button>
                </div>
                
                <div className="p-6 overflow-y-auto">
                    <h2 className="text-2xl font-bold mb-2">Phòng {data.name}</h2>
                    <p className="text-2xl text-primary font-bold mb-4">{formatPrice(data.price)} <span className="text-sm font-normal text-gray-500">/tháng</span></p>
                    
                    <div className="grid grid-cols-2 gap-4 mb-6">
                        <div className="bg-gray-50 p-3 rounded-lg">
                            <span className="text-xs text-gray-500 uppercase font-bold">Diện tích</span>
                            <p className="font-semibold">{data.area} m²</p>
                        </div>
                        <div className="bg-gray-50 p-3 rounded-lg">
                            <span className="text-xs text-gray-500 uppercase font-bold">Trạng thái</span>
                            <p className={`font-semibold ${isAvailable ? 'text-green-600' : 'text-gray-500'}`}>
                                {isAvailable ? "Sẵn sàng đón khách" : "Đang có người thuê"}
                            </p>
                        </div>
                    </div>

                    <div className="mb-6">
                        <h4 className="font-bold mb-2 text-sm uppercase text-gray-500">Tiện nghi phòng</h4>
                        <div className="flex flex-wrap gap-2">
                             {amenities.map((item, i) => (
                                 <span key={i} className="bg-blue-50 text-blue-700 px-3 py-1 rounded-full text-xs font-medium border border-blue-100">
                                     {item}
                                 </span>
                             ))}
                        </div>
                    </div>

                    {/* ✅ CUNG CẤP CẢ 2 LỰA CHỌN TRONG MODAL CHI TIẾT */}
                    <div className="flex flex-col sm:flex-row gap-3 pt-2 border-t">
                        <Button variant="outline" className="w-full sm:w-auto" onClick={() => setIsDetailOpen(false)}>Đóng</Button>
                        
                        <div className="flex flex-1 gap-3">
                            <Button 
                                variant="outline"
                                className="flex-1 border-orange-200 text-orange-700 hover:bg-orange-50" 
                                disabled={!isAvailable} 
                                onClick={() => {
                                    setIsDetailOpen(false); 
                                    if (onBookAppointment) onBookAppointment(); 
                                }}
                            >
                                <CalendarClock className="h-4 w-4 mr-2" /> Đặt lịch
                            </Button>

                            <Button 
                                className="flex-1 bg-primary text-white hover:bg-primary/90 shadow-md" 
                                disabled={!isAvailable} 
                                onClick={handleRentNow}
                            >
                                <FileSignature className="h-4 w-4 mr-2" /> Thuê ngay
                            </Button>
                        </div>
                    </div>
                </div>
             </div>
        </div>
      )}
    </>
  );
}
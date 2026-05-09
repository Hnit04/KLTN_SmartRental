import { useState } from "react";
import { createPortal } from "react-dom";
import { useNavigate } from "react-router-dom";
import { 
  XCircle, Maximize,
  Eye, FileSignature, Image as ImageIcon, CalendarClock, Sparkles, Home, Layers, Sun, ChevronLeft, ChevronRight,
  Wrench, Heart, GitCompareArrows
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import StatusBadge from "@/components/shared/StatusBadge";
import type { Room } from "@/types/index";
import { useFavorites } from "@/hooks/useFavorites";
import { useCompare } from "@/context/CompareContext";
import { useAuth } from "@/context/AuthContext";
import LoginRequiredModal from "@/components/shared/LoginRequiredModal";

interface RoomCardProps {
  data: Room;
  onBookAppointment?: () => void;
}

export default function RoomCard({ data, onBookAppointment }: RoomCardProps) {
  const navigate = useNavigate();
  const { isAuthenticated, user } = useAuth();
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [currImgIndex, setCurrImgIndex] = useState(0);
  const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);

  // Hooks
  const { toggleFavorite, isFavorite } = useFavorites();
  const { addToCompare, isInCompare, compareList } = useCompare();

  const isFav = isFavorite(data.id);
  const isComp = isInCompare(data.id);

  // 1. Kiểm tra trạng thái phòng
  const isAvailable = data.status === "AVAILABLE";
  const isReserved = data.status === "RESERVED";
  const isMaintenance = data.status === "MAINTENANCE";   // ← Thêm

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

  const handlePrevImage = (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    setCurrImgIndex(prev => (prev === 0 ? images.length - 1 : prev - 1));
  };

  const handleNextImage = (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    setCurrImgIndex(prev => (prev === images.length - 1 ? 0 : prev + 1));
  };

  const handleRentNow = () => {
    if (!isAvailable && !data.availableFromDate) return;
    // Điều hướng sang trang tạo hợp đồng, truyền ID phòng lên URL
    navigate(`/tenant/contracts/create?roomId=${data.id}`);
  };

  const mapRoomType = (type?: string) => {
    switch (type) {
      case "STUDIO": return "Phòng Studio";
      case "ONE_BEDROOM": return "1 Phòng Ngủ";
      case "TWO_BEDROOM": return "2 Phòng Ngủ";
      case "SINGLE_ROOM": return "Phòng Đơn";
      case "SHARED_ROOM": return "Phòng Ghép / Ở Chung";
      case "MEZZANINE_ROOM": return "Phòng Có Gác Lửng";
      default: return "";
    }
  };

  return (
    <>
      <div className={`group border rounded-2xl overflow-hidden bg-white flex flex-col h-full transition-all hover:shadow-lg hover:border-primary/50 
        ${(!isAvailable && !data.availableFromDate) || isMaintenance ? 'opacity-75 bg-gray-50' : ''}`}>
        
        {/* --- ẢNH PHÒNG CAROUSEL --- */}
        <div className="relative h-48 bg-gray-100 overflow-hidden cursor-pointer group/carousel" onClick={(e) => { e.preventDefault(); e.stopPropagation(); setIsDetailOpen(true); }}>
          {images.length > 0 ? (
            <img 
              src={images[currImgIndex]} 
              alt={data.name} 
              loading="lazy"
              className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
            />
          ) : (
            <div className="flex flex-col items-center justify-center h-full text-gray-400">
              <ImageIcon className="h-10 w-10 mb-2 opacity-50" />
              <span className="text-xs">Chưa có ảnh</span>
            </div>
          )}

          {/* Mũi tên Carousel */}
          {images.length > 1 && (
             <>
               <button 
                 onClick={handlePrevImage} 
                 className="absolute top-1/2 left-2 -translate-y-1/2 w-7 h-7 bg-white/70 hover:bg-white rounded-full flex items-center justify-center shadow-sm opacity-0 group-hover/carousel:opacity-100 transition-opacity z-20"
               >
                 <ChevronLeft className="h-4 w-4 text-gray-800" />
               </button>
               <button 
                 onClick={handleNextImage} 
                 className="absolute top-1/2 right-2 -translate-y-1/2 w-7 h-7 bg-white/70 hover:bg-white rounded-full flex items-center justify-center shadow-sm opacity-0 group-hover/carousel:opacity-100 transition-opacity z-20"
               >
                 <ChevronRight className="h-4 w-4 text-gray-800" />
               </button>
               {/* Chấm bi */}
               <div className="absolute bottom-2 left-0 right-0 gap-1 flex justify-center z-10 pointer-events-none">
                 {images.map((_, idx) => (
                    <div 
                      key={idx} 
                      className={`h-1.5 rounded-full transition-all duration-300 ${idx === currImgIndex ? 'w-3 bg-white' : 'w-1.5 bg-white/60'}`} 
                    />
                 ))}
               </div>
             </>
          )}

          <div className="absolute top-3 right-3 shadow-sm z-10">
            {isAvailable ? (
              <StatusBadge label="Còn trống" tone="success" className="text-[10px] font-bold uppercase tracking-wider" />
            ) : isReserved ? (
              <StatusBadge label="Giữ chỗ" tone="warning" className="text-[10px] font-bold uppercase tracking-wider" />
            ) : isMaintenance ? (
              <StatusBadge label="Đang bảo trì" tone="warning" className="text-[10px] font-bold uppercase tracking-wider" />
            ) : data.status === 'RENTED' && data.availableFromDate ? (
              <StatusBadge label={`Sắp trống ${new Date(data.availableFromDate).toLocaleDateString('vi-VN')}`} tone="warning" className="text-[10px] font-bold uppercase tracking-wider bg-orange-500 text-white border-none" />
            ) : (
              <StatusBadge label="Đã thuê" tone="neutral" className="text-[10px] font-bold uppercase tracking-wider" />
            )}
          </div>

          {data.matchScore && data.matchScore > 0 ? (
            <div className="absolute top-3 left-3 flex flex-col items-start gap-1 z-10">
              <span className="bg-primary/90 backdrop-blur-sm text-white text-[10px] font-bold px-2.5 py-1 rounded-full flex items-center gap-1 shadow-sm uppercase tracking-wider">
                <Sparkles className="h-3 w-3" /> Phù hợp {Math.round(data.matchScore)}%
              </span>
              {data.matchReason && (
                <span className="bg-black/60 backdrop-blur-sm text-white text-[9px] px-2 py-0.5 rounded shadow-sm max-w-[150px] line-clamp-1 italic">
                  {data.matchReason}
                </span>
              )}
            </div>
          ) : null}

          {/* --- NÚT TIM & NÚT SO SÁNH --- */}
          <div className="absolute top-3 right-3 flex flex-col gap-2 z-10">
            {/* Nếu đã có Status Badge, ta dời nó sang trái hoặc để nó bên dưới.
                Tạm thời Status Badge ở dòng 121 đã chiếm top-3 right-3.
                Tôi sẽ đổi chỗ nút Tim lên góc trái, và Status Badge sang góc phải. Hoặc đẩy Tim xuống.
                Sửa lại: Tim ở top-3 right-3, Status Badge dời xuống top-12 right-3.
                Vì Status Badge đã render ở trên, tôi sẽ đặt Tim ở top-12 right-3. */}
          </div>
          
          <button
            className={`absolute top-12 right-3 p-2 rounded-full backdrop-blur-md shadow-sm z-20 transition-all hover:scale-110 ${isFav ? 'bg-red-50 text-red-500' : 'bg-white/70 text-gray-500 hover:bg-white hover:text-red-500'}`}
            onClick={(e) => {
              e.stopPropagation();
              e.preventDefault();
              if (!isAuthenticated) {
                setIsLoginModalOpen(true);
                return;
              }
              toggleFavorite(data.id);
            }}
          >
            <Heart className={`h-4 w-4 ${isFav ? 'fill-current' : ''}`} />
          </button>

          <button
            className={`absolute top-24 right-3 p-2 rounded-full backdrop-blur-md shadow-sm z-20 transition-all hover:scale-110 ${isComp ? 'bg-blue-50 text-blue-600' : 'bg-white/70 text-gray-500 hover:bg-white hover:text-blue-600'}`}
            onClick={(e) => {
              e.stopPropagation();
              e.preventDefault();
              addToCompare(data);
            }}
          >
            <GitCompareArrows className="h-4 w-4" />
          </button>
        </div>

        {/* --- THÔNG TIN --- */}
        <div className="p-4 md:p-5 flex-1 flex flex-col">
          <div className="flex justify-between items-start mb-2">
            <h4 className="font-semibold text-lg text-gray-900 group-hover:text-primary transition-colors truncate pr-2">
              {data.name.toLowerCase().includes('phòng') ? data.name : `Phòng ${data.name}`}
            </h4>
            <span className="font-bold text-primary text-lg shrink-0">
              {formatPrice(data.price)}
            </span>
          </div>

          <div className="space-y-2 mb-3">
            <div className="flex items-center text-[13px] text-gray-500 justify-between flex-wrap gap-1">
              <span className="flex items-center">
                 <Maximize className="h-3.5 w-3.5 mr-1.5 text-gray-400" />
                 {data.area} m²
              </span>
              {data.type && (
                <span className="flex items-center text-primary font-medium bg-primary/5 px-2 py-0.5 rounded-sm">
                   <Home className="h-3.5 w-3.5 mr-1 text-primary" />
                   {mapRoomType(data.type)}
                </span>
              )}
            </div>

            <div className="flex gap-2">
                {data.hasMezzanine && (
                  <span className="text-[10px] bg-amber-50 text-amber-700 border border-amber-200 px-2 py-1 rounded flex items-center">
                    <Layers className="h-3 w-3 mr-1" /> Có gác lửng
                  </span>
                )}
                {data.hasBalcony && (
                  <span className="text-[10px] bg-blue-50 text-blue-700 border border-blue-200 px-2 py-1 rounded flex items-center">
                    <Sun className="h-3 w-3 mr-1" /> Có ban công / Cửa sổ
                  </span>
                )}
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

          {/* --- NÚT HÀNH ĐỘNG --- */}
          <div className="mt-auto grid grid-cols-2 gap-2 pt-3 border-t border-border/70 min-h-[52px] items-end">
              <Button 
                  variant="outline" 
                  size="sm" 
                  className="text-xs h-10 hover:bg-primary/5 text-gray-600 hover:text-primary border-gray-200 transition-colors group/btn1 rounded-xl"
                  onClick={(e) => { e.preventDefault(); e.stopPropagation(); setIsDetailOpen(true); }}
              >
                  <Eye className="h-3.5 w-3.5 mr-1.5 group-hover/btn1:-translate-y-0.5 transition-transform" /> Chi tiết
              </Button>

              <Button 
                  size="sm"
                  className={`text-xs h-10 gap-1 rounded-xl ${((!isAvailable && !data.availableFromDate) || isMaintenance) ? 'cursor-not-allowed opacity-50' : 'bg-primary hover:bg-primary/90 text-white'}`}
                  disabled={(!isAvailable && !data.availableFromDate) || isMaintenance}
                  onClick={(e) => {
                      e.stopPropagation();
                      e.preventDefault();
                      if (onBookAppointment) {
                          onBookAppointment();
                      } else {
                          navigate(`/rooms/${data.id}?action=book`);
                      }
                  }}
              >
                  {isMaintenance ? "Đang bảo trì" : (isAvailable || data.availableFromDate) ? (
                      <>Đặt lịch xem <CalendarClock className="h-3.5 w-3.5 ml-0.5" /></>
                  ) : (
                      "Đã hết"
                  )}
              </Button>
          </div>
        </div>
      </div>

      {/* --- MODAL CHI TIẾT PHÒNG --- */}
      {isDetailOpen && createPortal(
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/55 backdrop-blur-sm p-4 animate-in fade-in"
          onClick={(e) => { e.stopPropagation(); setIsDetailOpen(false); }}
        >
          <div 
            className="bg-white rounded-xl w-full max-w-lg overflow-hidden shadow-2xl animate-in zoom-in-95 relative flex flex-col max-h-[90vh]"
            onClick={(e) => e.stopPropagation()}
          >

            <div className="h-56 bg-gray-100 relative shrink-0">
              {coverImage && <img src={coverImage} className="w-full h-full object-cover" alt="" />}
              <button
                onClick={() => setIsDetailOpen(false)}
                className="absolute top-2 right-2 bg-black/50 text-white p-1 rounded-full hover:bg-black/70"
              >
                <XCircle className="h-6 w-6" />
              </button>
            </div>

            <div className="p-6 overflow-y-auto">
              <h2 className="text-2xl font-bold mb-2">
                {data.name.toLowerCase().includes('phòng') ? data.name : `Phòng ${data.name}`}
              </h2>
              <p className="text-2xl text-primary font-bold mb-4">
                {formatPrice(data.price)}
                <span className="text-sm font-normal text-gray-500">/tháng</span>
              </p>

              <div className="grid grid-cols-2 gap-4 mb-6">
                <div className="bg-gray-50 p-3 rounded-lg">
                  <span className="text-xs text-gray-500 uppercase font-bold">Diện tích & Không gian</span>
                  <p className="font-semibold text-sm mt-1">{data.area} m²</p>
                  {(data.hasMezzanine || data.hasBalcony || data.type) && (
                    <div className="mt-1 flex gap-1 flex-wrap">
                      {data.type && <span className="text-[10px] bg-primary/10 text-primary px-1.5 py-0.5 rounded">{mapRoomType(data.type)}</span>}
                      {data.hasMezzanine && <span className="text-[10px] bg-amber-100 text-amber-800 px-1.5 py-0.5 rounded">Gác lửng</span>}
                      {data.hasBalcony && <span className="text-[10px] bg-blue-100 text-blue-800 px-1.5 py-0.5 rounded">Ban công</span>}
                    </div>
                  )}
                </div>

                <div className="bg-gray-50 p-3 rounded-lg flex flex-col justify-center">
                  <span className="text-xs text-gray-500 uppercase font-bold mb-1">Trạng thái</span>
                  <p className={`font-semibold text-sm ${
                    isAvailable ? 'text-green-600' : 
                    isReserved ? 'text-orange-600' : 
                    isMaintenance ? 'text-amber-600' : 
                    'text-gray-500'
                  }`}>
                    {isAvailable
                      ? "Sẵn sàng đón khách"
                      : isReserved
                        ? "Đang có người đợi ký HĐ"
                        : isMaintenance
                          ? "Đang bảo trì / Sửa chữa"
                          : data.status === 'RENTED' && data.availableFromDate
                            ? `Sắp trống (${new Date(data.availableFromDate).toLocaleDateString('vi-VN')})`
                            : "Đang có người thuê"}
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

              {/* Nút hành động trong modal */}
              <div className="flex flex-col sm:flex-row gap-3 pt-2 border-t">
                <Button variant="outline" className="w-full sm:w-auto" onClick={() => setIsDetailOpen(false)}>
                  Đóng
                </Button>

                <div className="flex flex-1 gap-3">
                  <Button
                    variant="outline"
                    className="flex-1 border-orange-200 text-orange-700 hover:bg-orange-50"
                    disabled={(!isAvailable && !data.availableFromDate) || isMaintenance}
                    onClick={() => {
                      setIsDetailOpen(false);
                      if (onBookAppointment) {
                          onBookAppointment();
                      } else {
                          navigate(`/rooms/${data.id}?action=book`);
                      }
                    }}
                  >
                    <CalendarClock className="h-4 w-4 mr-2" /> Đặt lịch
                  </Button>

                  <Button
                    className="flex-1 bg-primary text-white hover:bg-primary/90 shadow-md"
                    disabled={(!isAvailable && !data.availableFromDate) || isMaintenance}
                    onClick={handleRentNow}
                  >
                    <FileSignature className="h-4 w-4 mr-2" /> Thuê ngay
                  </Button>
                </div>
              </div>

              {/* Thông báo khi đang bảo trì */}
              {isMaintenance && (
                <div className="mt-4 p-3 bg-amber-50 border border-amber-200 rounded-lg text-amber-700 text-sm flex items-start gap-2">
                  <Wrench className="h-5 w-5 mt-0.5 flex-shrink-0" />
                  Phòng đang trong quá trình bảo trì. Không thể đặt lịch hoặc thuê lúc này.
                </div>
              )}
            </div>
          </div>
        </div>,
        document.body
      )}

      <LoginRequiredModal 
        isOpen={isLoginModalOpen} 
        onClose={() => setIsLoginModalOpen(false)} 
        title="Yêu cầu đăng nhập" 
        message="Vui lòng đăng nhập để lưu phòng yêu thích!" 
      />
    </>
  );
}
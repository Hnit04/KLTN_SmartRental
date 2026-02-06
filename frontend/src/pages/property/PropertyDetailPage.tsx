import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { 
  MapPin, ArrowLeft, Zap, Droplets, Wifi, ShieldCheck, 
  User, Phone, MessageSquare 
} from "lucide-react";
import { propertyApi } from "@/api/propertyApi";
import type { Property, Room } from "@/types/index";
import RoomCard from "@/features/property/components/RoomCard";
import LoadingSpinner from "@/components/shared/LoadingSpinner";
import { Button } from "@/components/ui/Button";
import { toast } from "sonner";

export default function PropertyDetailPage() {
  const { id } = useParams();
  const [property, setProperty] = useState<Property | null>(null);
  const [rooms, setRooms] = useState<Room[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // --- FETCH DATA ---
  useEffect(() => {
    const fetchData = async () => {
      if (!id) return;
      setIsLoading(true);
      try {
        const [propRes, roomRes] = await Promise.all([
          propertyApi.getDetail(id),
          propertyApi.getRooms(id)
        ]);
        
        // Ép kiểu as any nếu API trả về data bọc trong object khác structure mặc định
        setProperty(propRes.data as any);
        setRooms(roomRes.data as any);
      } catch (error) {
        console.error("Lỗi tải trang chi tiết:", error);
        toast.error("Không thể tải thông tin khu trọ.");
      } finally {
        setIsLoading(false);
      }
    };
    fetchData();
  }, [id]);

  // --- HANDLERS: LIÊN HỆ ---
  const handleCall = () => {
    // Ép kiểu as any để tránh lỗi TypeScript nếu bạn chưa kịp cập nhật file types/index.ts
    const phone = (property as any)?.landlordPhone;
    
    if (!phone) {
      toast.error("Chủ nhà chưa cập nhật số điện thoại liên hệ.");
      return;
    }
    window.location.href = `tel:${phone}`;
  };

  const handleZalo = () => {
    const phone = (property as any)?.landlordPhone;

    if (!phone) {
      toast.error("Chủ nhà chưa cập nhật số điện thoại Zalo.");
      return;
    }
    // Mở tab mới đến trang Zalo
    window.open(`https://zalo.me/${phone}`, '_blank');
  };

  // --- RENDER LOGIC ---
  if (isLoading) return <LoadingSpinner />;
  if (!property) return <div className="text-center py-20 text-gray-500">Không tìm thấy khu trọ này.</div>;

  // Xử lý ảnh: Nếu API trả về ít ảnh hoặc không có, dùng ảnh placeholder để demo giao diện Grid
  const images = property.images && property.images.length > 0 
    ? property.images 
    : ["https://placehold.co/800x600?text=No+Image"];

  // Nhân bản ảnh lên để demo Layout Grid nếu số lượng ảnh < 3 (Có thể xóa logic này khi chạy thật)
  const displayImages = images.length < 3 
    ? [...images, ...images, ...images].slice(0, 5) 
    : images.slice(0, 5);

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      
      {/* 1. HEADER & GALLERY */}
      <div className="bg-white border-b pb-6">
        <div className="container mx-auto max-w-7xl px-4 pt-6">
          <Link to="/properties" className="inline-flex items-center text-sm text-gray-500 hover:text-primary mb-4 transition-colors">
            <ArrowLeft className="h-4 w-4 mr-1" /> Quay lại tìm kiếm
          </Link>

          {/* GALLERY GRID LAYOUT */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-2 h-[300px] md:h-[400px] rounded-2xl overflow-hidden mb-8 shadow-sm">
            {/* Ảnh chính lớn nhất */}
            <div className="md:col-span-2 md:row-span-2 relative group cursor-pointer">
              <img src={displayImages[0]} alt="Main" className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" />
            </div>
            {/* Các ảnh phụ */}
            <div className="hidden md:block relative group cursor-pointer">
               <img src={displayImages[1]} alt="Sub 1" className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" />
            </div>
            <div className="hidden md:block relative group cursor-pointer">
               <img src={displayImages[2]} alt="Sub 2" className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" />
            </div>
            <div className="hidden md:block relative group cursor-pointer">
               <img src={displayImages[1]} alt="Sub 3" className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" />
            </div>
            <div className="hidden md:block relative group cursor-pointer">
               <img src={displayImages[2]} alt="Sub 4" className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" />
               {/* Overlay xem tất cả */}
               <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                  <span className="text-white font-bold text-sm bg-black/50 px-3 py-1 rounded-full border border-white/30">Xem tất cả ảnh</span>
               </div>
            </div>
          </div>

          <div className="flex flex-col lg:flex-row gap-8">
            {/* ─── CỘT TRÁI: THÔNG TIN CHI TIẾT ─── */}
            <div className="flex-1 space-y-8">
              <div>
                <h1 className="text-3xl font-bold text-gray-900 mb-2">{property.name}</h1>
                <div className="flex items-center text-gray-600">
                  <MapPin className="h-5 w-5 mr-2 text-primary shrink-0" />
                  <span>{property.address}, {property.district}, {property.city}</span>
                </div>
              </div>

              {/* Bảng giá dịch vụ */}
              <div className="border-t pt-6">
                <h3 className="font-bold text-lg mb-4 text-gray-800">Bảng giá dịch vụ</h3>
                <div className="flex flex-wrap gap-4">
                  <ServiceItem icon={<Zap className="text-yellow-500" />} label="Điện" value={property.elecPrice} unit="kW" />
                  <ServiceItem icon={<Droplets className="text-blue-500" />} label="Nước" value={property.waterPrice} unit="khối" />
                  <ServiceItem icon={<Wifi className="text-indigo-500" />} label="Internet" value={property.internetPrice} unit="tháng" />
                </div>
              </div>
              
              {/* Mô tả */}
              <div className="border-t pt-6">
                 <h3 className="font-bold text-lg mb-3 text-gray-800">Mô tả chi tiết</h3>
                 <div className="text-gray-600 bg-gray-50 p-5 rounded-xl border leading-relaxed whitespace-pre-line text-sm md:text-base">
                    {property.description || "Chủ nhà chưa cung cấp mô tả chi tiết."}
                 </div>
              </div>
            </div>

            {/* ─── CỘT PHẢI: THÔNG TIN CHỦ NHÀ (STICKY) ─── */}
            <div className="lg:w-80 shrink-0">
              <div className="sticky top-24 space-y-4">
                
                {/* Card Chủ nhà */}
                <div className="bg-white rounded-xl shadow-lg shadow-gray-100 border p-5">
                   <div className="flex items-center gap-3 mb-5 border-b pb-4 border-dashed">
                      <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center text-primary border border-primary/20 shrink-0">
                         <User className="h-6 w-6" />
                      </div>
                      <div>
                         <p className="text-[10px] text-gray-500 uppercase font-bold tracking-wider">Chủ nhà</p>
                         <p className="font-bold text-gray-900 text-lg line-clamp-1">
                           {(property as any).landlordName || property.landlordName || "Anh/Chị Chủ"}
                         </p>
                      </div>
                   </div>
                   
                   <div className="space-y-3">
                     <Button 
                        className="w-full gap-2 bg-green-600 hover:bg-green-700 h-11 text-base shadow-md shadow-green-200" 
                        onClick={handleCall}
                     >
                        <Phone className="h-4 w-4" /> 
                        Gọi điện ngay
                     </Button>
                     
                     <Button 
                        variant="outline" 
                        className="w-full gap-2 border-blue-200 text-blue-600 hover:bg-blue-50 hover:text-blue-700 hover:border-blue-300 h-11"
                        onClick={handleZalo}
                     >
                        <MessageSquare className="h-4 w-4" /> 
                        Chat qua Zalo
                     </Button>
                   </div>
                </div>

                {/* Card Map Placeholder */}
                <div className="bg-gray-100 rounded-xl h-48 flex flex-col items-center justify-center text-gray-400 border border-dashed relative overflow-hidden group">
                   <div className="absolute inset-0 bg-[url('https://maps.gstatic.com/mapfiles/api-3/images/map_error_1.png')] bg-cover opacity-10 grayscale"></div>
                   <MapPin className="h-8 w-8 mb-2 z-10 text-gray-300" />
                   <span className="text-sm font-medium z-10">Bản đồ đang cập nhật</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 2. DANH SÁCH PHÒNG */}
      <div className="container mx-auto max-w-7xl px-4 py-10">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-6 gap-4">
          <h2 className="text-2xl font-bold text-gray-800">Danh sách phòng trống ({rooms.length})</h2>
          <div className="inline-flex items-center gap-2 text-sm text-green-700 font-medium bg-green-50 px-4 py-1.5 rounded-full border border-green-200 shadow-sm">
             <ShieldCheck className="h-4 w-4" /> Tin đăng đã được xác thực
          </div>
        </div>

        {rooms.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            {rooms.map((room) => (
              <RoomCard key={room.id} data={room} />
            ))}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-16 text-center bg-white rounded-2xl border border-dashed">
             <div className="bg-gray-50 p-4 rounded-full mb-3">
               <ShieldCheck className="h-8 w-8 text-gray-300" />
             </div>
             <h3 className="text-gray-900 font-medium">Chưa có phòng trống</h3>
             <p className="text-gray-500 text-sm mt-1">Hiện tại khu trọ này chưa có phòng nào được đăng tải.</p>
          </div>
        )}
      </div>
    </div>
  );
}

// Sub-component hiển thị giá dịch vụ
const ServiceItem = ({ icon, label, value, unit }: any) => (
  <div className="flex items-center gap-3 bg-white p-3 rounded-xl border border-gray-100 shadow-sm min-w-[150px] transition-all hover:shadow-md hover:border-gray-200">
    <div className="p-2.5 bg-gray-50 rounded-full">{icon}</div>
    <div>
      <p className="text-[10px] text-gray-400 uppercase font-bold tracking-wider">{label}</p>
      <p className="text-sm font-bold text-gray-900">
        {value ? `${value.toLocaleString()}đ` : "Miễn phí"} 
        {value && <span className="text-gray-400 text-xs font-normal">/{unit}</span>}
      </p>
    </div>
  </div>
);
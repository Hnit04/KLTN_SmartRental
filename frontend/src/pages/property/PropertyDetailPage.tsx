import { useEffect, useState } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { 
  MapPin, ArrowLeft, Zap, Droplets, Wifi, ShieldCheck, 
  User, Phone, MessageSquare, CalendarClock, X, Loader2
} from "lucide-react";
import { propertyApi } from "@/api/propertyApi";
import { appointmentApi } from "@/api/appointmentApi";
import { useAuth } from "@/context/AuthContext";
import type { Property, Room } from "@/types/index";
import RoomCard from "@/features/property/components/RoomCard";
import LoadingSpinner from "@/components/shared/LoadingSpinner";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { toast } from "sonner";

export default function PropertyDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { isAuthenticated, user } = useAuth();
  
  const [property, setProperty] = useState<Property | null>(null);
  const [rooms, setRooms] = useState<Room[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // --- STATE CHO MODAL ĐẶT LỊCH ---
  const [selectedRoom, setSelectedRoom] = useState<Room | null>(null);
  const [isBookingModalOpen, setIsBookingModalOpen] = useState(false);
  const [meetDate, setMeetDate] = useState("");
  const [meetTime, setMeetTime] = useState("");
  const [note, setNote] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

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
        setProperty(propRes.data as any);
        setRooms(roomRes.data as any);
      } catch (error) {
        toast.error("Không thể tải thông tin khu trọ.");
      } finally {
        setIsLoading(false);
      }
    };
    fetchData();
  }, [id]);

  // --- HANDLERS ---
  const handleCall = () => {
    const phone = (property as any)?.landlordPhone;
    if (!phone) return toast.error("Chủ nhà chưa cập nhật số điện thoại liên hệ.");
    window.location.href = `tel:${phone}`;
  };

  const handleZalo = () => {
    const phone = (property as any)?.landlordPhone;
    if (!phone) return toast.error("Chủ nhà chưa cập nhật số điện thoại Zalo.");
    window.open(`https://zalo.me/${phone}`, '_blank');
  };

  // Mở modal đặt lịch
  const handleOpenBookingModal = (room: Room) => {
    if (!isAuthenticated) {
      toast.error("Vui lòng đăng nhập để đặt lịch xem phòng!");
      navigate("/login");
      return;
    }
    if (user?.role === 'LANDLORD') {
      toast.error("Tài khoản Chủ trọ không thể đặt lịch xem phòng.");
      return;
    }
    
    setSelectedRoom(room);
    setMeetDate("");
    setMeetTime("");
    setNote("");
    setIsBookingModalOpen(true);
  };

  // Gửi API đặt lịch
  const handleSubmitBooking = async () => {
    if (!selectedRoom || !meetDate || !meetTime) {
      toast.error("Vui lòng chọn đầy đủ ngày và giờ hẹn!");
      return;
    }

    setIsSubmitting(true);
    try {
      // Nối chuỗi ngày giờ theo chuẩn Backend yêu cầu: "yyyy-MM-dd'T'HH:mm"
      const dateTimeString = `${meetDate}T${meetTime}`;

      await appointmentApi.createAppointment({
        roomId: selectedRoom.id,
        meetTime: dateTimeString,
        note: note
      });

      toast.success("Đặt lịch thành công! Vui lòng chờ chủ nhà duyệt.");
      setIsBookingModalOpen(false);
    } catch (error: any) {
      toast.error(error.response?.data?.message || "Có lỗi xảy ra khi đặt lịch.");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) return <LoadingSpinner />;
  if (!property) return <div className="text-center py-20 text-gray-500">Không tìm thấy khu trọ này.</div>;

  const images = property.images && property.images.length > 0 ? property.images : ["https://placehold.co/800x600?text=No+Image"];
  const displayImages = images.length < 3 ? [...images, ...images, ...images].slice(0, 5) : images.slice(0, 5);

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
            <div className="md:col-span-2 md:row-span-2 relative group cursor-pointer">
              <img src={displayImages[0]} alt="Main" className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" />
            </div>
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
               <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                  <span className="text-white font-bold text-sm bg-black/50 px-3 py-1 rounded-full border border-white/30">Xem tất cả ảnh</span>
               </div>
            </div>
          </div>

          <div className="flex flex-col lg:flex-row gap-8">
            {/* CỘT TRÁI */}
            <div className="flex-1 space-y-8">
              <div>
                <h1 className="text-3xl font-bold text-gray-900 mb-2">{property.name}</h1>
                <div className="flex items-center text-gray-600">
                  <MapPin className="h-5 w-5 mr-2 text-primary shrink-0" />
                  <span>{property.address}, {property.district}, {property.city}</span>
                </div>
              </div>

              <div className="border-t pt-6">
                <h3 className="font-bold text-lg mb-4 text-gray-800">Bảng giá dịch vụ</h3>
                <div className="flex flex-wrap gap-4">
                  <ServiceItem icon={<Zap className="text-yellow-500" />} label="Điện" value={property.elecPrice} unit="kW" />
                  <ServiceItem icon={<Droplets className="text-blue-500" />} label="Nước" value={property.waterPrice} unit="khối" />
                  <ServiceItem icon={<Wifi className="text-indigo-500" />} label="Internet" value={property.internetPrice} unit="tháng" />
                </div>
              </div>
              
              <div className="border-t pt-6">
                 <h3 className="font-bold text-lg mb-3 text-gray-800">Mô tả chi tiết</h3>
                 <div className="text-gray-600 bg-gray-50 p-5 rounded-xl border leading-relaxed whitespace-pre-line text-sm md:text-base">
                    {property.description || "Chủ nhà chưa cung cấp mô tả chi tiết."}
                 </div>
              </div>
            </div>

            {/* CỘT PHẢI */}
            <div className="lg:w-80 shrink-0">
              <div className="sticky top-24 space-y-4">
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
                     <Button className="w-full gap-2 bg-green-600 hover:bg-green-700 h-11 text-base shadow-md shadow-green-200" onClick={handleCall}>
                        <Phone className="h-4 w-4" /> Gọi điện ngay
                     </Button>
                     <Button variant="outline" className="w-full gap-2 border-blue-200 text-blue-600 hover:bg-blue-50 hover:text-blue-700 hover:border-blue-300 h-11" onClick={handleZalo}>
                        <MessageSquare className="h-4 w-4" /> Chat qua Zalo
                     </Button>
                   </div>
                </div>

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
              // TRUYỀN HÀM XỬ LÝ XUỐNG ROOMCARD
              <RoomCard 
                key={room.id} 
                data={room} 
                onBookAppointment={() => handleOpenBookingModal(room)} 
              />
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

      {/* 3. MODAL ĐẶT LỊCH XEM PHÒNG */}
      {isBookingModalOpen && selectedRoom && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl w-full max-w-md overflow-hidden shadow-2xl animate-in zoom-in-95">
            <div className="p-5 border-b flex justify-between items-center bg-gray-50">
              <h2 className="text-lg font-bold flex items-center gap-2 text-gray-900">
                <CalendarClock className="h-5 w-5 text-primary" />
                Đặt lịch xem phòng
              </h2>
              <button onClick={() => setIsBookingModalOpen(false)} className="text-gray-400 hover:text-gray-600">
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="p-6 space-y-5">
              <div className="bg-primary/5 border border-primary/20 rounded-xl p-4">
                <p className="text-sm font-semibold text-primary mb-1">Khu trọ: {property.name}</p>
                <p className="text-gray-700 font-medium">Phòng: {selectedRoom.name}</p>
                <p className="text-xs text-gray-500 mt-1">Giá thuê: {selectedRoom.price.toLocaleString('vi-VN')}đ/tháng</p>
              </div>

              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-sm font-medium text-gray-700">Ngày xem <span className="text-red-500">*</span></label>
                    <Input 
                      type="date" 
                      value={meetDate} 
                      onChange={(e) => setMeetDate(e.target.value)} 
                      min={new Date().toISOString().split("T")[0]} // Không cho chọn ngày quá khứ
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-sm font-medium text-gray-700">Giờ xem <span className="text-red-500">*</span></label>
                    <Input 
                      type="time" 
                      value={meetTime} 
                      onChange={(e) => setMeetTime(e.target.value)} 
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-gray-700">Lời nhắn cho chủ nhà (Tùy chọn)</label>
                  <textarea 
                    className="w-full min-h-[80px] rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                    placeholder="Ví dụ: Mình đi 2 người, xem phòng sau giờ hành chính..."
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
                  />
                </div>
              </div>
            </div>

            <div className="p-5 bg-gray-50 border-t flex justify-end gap-3">
              <Button variant="outline" onClick={() => setIsBookingModalOpen(false)}>Hủy</Button>
              <Button onClick={handleSubmitBooking} disabled={isSubmitting || !meetDate || !meetTime}>
                {isSubmitting ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
                Gửi yêu cầu
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

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
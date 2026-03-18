import { useEffect, useState, useMemo } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { 
  MapPin, ArrowLeft, Zap, Droplets, Wifi, ShieldCheck, 
  User, Phone, MessageSquare, CalendarClock, X, Loader2, Star, Bot,
  ChevronLeft, ChevronRight, ZoomIn, SlidersHorizontal
} from "lucide-react";
import { propertyApi } from "@/api/propertyApi";
import { appointmentApi } from "@/api/appointmentApi";
import { reviewApi } from '@/api/reviewApi'; 
import { useAuth } from "@/context/AuthContext";
import type { Property, Room, ReviewResponse } from "@/types/index"; 
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
  const [reviews, setReviews] = useState<ReviewResponse[]>([]); 
  const [isLoading, setIsLoading] = useState(true);

  // --- STATE LIGHTBOX ---
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [lightboxIndex, setLightboxIndex] = useState(0);

  // --- STATE FILTER PHÒNG ---
  const [roomSortBy, setRoomSortBy] = useState<"default" | "price_asc" | "price_desc" | "area_asc">("default");
  const [roomStatusFilter, setRoomStatusFilter] = useState<"ALL" | "AVAILABLE" | "RENTED">("ALL");
  const [showRoomFilter, setShowRoomFilter] = useState(false);

  // --- STATE CHO MODAL ĐẶT LỊCH ---
  const [selectedRoom, setSelectedRoom] = useState<Room | null>(null);
  const [isBookingModalOpen, setIsBookingModalOpen] = useState(false);
  const [meetDate, setMeetDate] = useState("");
  const [meetTime, setMeetTime] = useState("");
  const [note, setNote] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // --- FETCH DATA ---
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
        
        const propertyData = propRes.data as any;
        setProperty(propertyData);
        setRooms(roomRes.data as any);

        // ✅ GỌI THẲNG API LẤY REVIEW THEO PROPERTY ID (KHU TRỌ)
        try {
            // Truyền thẳng biến id của khu trọ vào API mới
            const reviewRes = await reviewApi.getReviewsByProperty(id);
             
            // Bóc tách nhiều lớp bọc của Spring Boot & Axios
            let finalReviewData = (reviewRes as any)?.data !== undefined ? (reviewRes as any).data : reviewRes;
             
            if (finalReviewData?.data) finalReviewData = finalReviewData.data;
            if (finalReviewData?.content) finalReviewData = finalReviewData.content; 

            if (Array.isArray(finalReviewData)) {
                setReviews(finalReviewData);
            } else {
                setReviews([]);
            }
        } catch (reviewErr) {
            console.error("Lỗi khi tải Đánh giá:", reviewErr);
            setReviews([]);
        }

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

  const handleAskAI = () => {
    if (!property) return;
    const question = `Nhờ AI tư vấn thêm về ưu nhược điểm của khu trọ "${property.name}" (Địa chỉ: ${property.address}, ${property.district}, ${property.city}).`;
    window.dispatchEvent(new CustomEvent('openAiChat', { detail: { question } }));
  };

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

  const handleSubmitBooking = async () => {
    if (!selectedRoom || !meetDate || !meetTime) {
      toast.error("Vui lòng chọn đầy đủ ngày và giờ hẹn!");
      return;
    }

    setIsSubmitting(true);
    try {
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

  // --- COMPUTED: FILTER & SORT PHÒNG ---
  const filteredRooms = useMemo(() => {
    let result = [...rooms];
    if (roomStatusFilter !== "ALL") {
      result = result.filter(r => r.status === roomStatusFilter);
    }
    switch (roomSortBy) {
      case "price_asc":  result.sort((a, b) => a.price - b.price); break;
      case "price_desc": result.sort((a, b) => b.price - a.price); break;
      case "area_asc":   result.sort((a, b) => a.area - b.area);  break;
    }
    return result;
  }, [rooms, roomSortBy, roomStatusFilter]);

  // --- COMPUTED: RATING TỔNG HỢP ---
  const avgRating = reviews.length > 0
    ? reviews.reduce((acc, r) => acc + r.rating, 0) / reviews.length
    : 0;
  const ratingDistribution = [5, 4, 3, 2, 1].map(star => ({
    star,
    count: reviews.filter(r => r.rating === star).length,
    pct: reviews.length > 0 ? (reviews.filter(r => r.rating === star).length / reviews.length) * 100 : 0,
  }));

  if (isLoading) return <LoadingSpinner />;
  if (!property) return <div className="text-center py-20 text-gray-500">Không tìm thấy khu trọ này.</div>;

  // FIX: Không lặp ảnh nữa — chỉ dùng ảnh thật
  const images = property.images && property.images.length > 0 ? property.images : ["https://placehold.co/800x600?text=No+Image"];
  const displayImages = images.slice(0, 5); // max 5, không duplicate

  return (
    <div className="min-h-screen bg-gray-50 pb-20">

      {/* ============ LIGHTBOX ============ */}
      {lightboxOpen && (
        <div
          className="fixed inset-0 z-[100] bg-black/95 flex items-center justify-center"
          onClick={() => setLightboxOpen(false)}
        >
          <button
            className="absolute top-4 right-4 text-white/80 hover:text-white p-2 rounded-full bg-white/10 hover:bg-white/20 transition"
            onClick={() => setLightboxOpen(false)}
          >
            <X className="h-6 w-6" />
          </button>
          <button
            className="absolute left-4 text-white/80 hover:text-white p-2 rounded-full bg-white/10 hover:bg-white/20 transition"
            onClick={(e) => { e.stopPropagation(); setLightboxIndex(i => (i - 1 + images.length) % images.length); }}
          >
            <ChevronLeft className="h-7 w-7" />
          </button>
          <img
            src={images[lightboxIndex]}
            alt={`Ảnh ${lightboxIndex + 1}`}
            className="max-h-[85vh] max-w-[90vw] object-contain rounded-lg shadow-2xl"
            onClick={e => e.stopPropagation()}
          />
          <button
            className="absolute right-4 text-white/80 hover:text-white p-2 rounded-full bg-white/10 hover:bg-white/20 transition"
            onClick={(e) => { e.stopPropagation(); setLightboxIndex(i => (i + 1) % images.length); }}
          >
            <ChevronRight className="h-7 w-7" />
          </button>
          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2">
            {images.map((_, i) => (
              <button
                key={i}
                onClick={e => { e.stopPropagation(); setLightboxIndex(i); }}
                className={`w-2 h-2 rounded-full transition ${i === lightboxIndex ? 'bg-white scale-125' : 'bg-white/40'}`}
              />
            ))}
          </div>
          <span className="absolute bottom-4 right-4 text-white/60 text-sm">{lightboxIndex + 1} / {images.length}</span>
        </div>
      )}

      {/* 1. HEADER & GALLERY */}
      <div className="bg-white border-b pb-6">
        <div className="container mx-auto max-w-7xl px-4 pt-6">
          <Link to="/properties" className="inline-flex items-center text-sm text-gray-500 hover:text-primary mb-4 transition-colors">
            <ArrowLeft className="h-4 w-4 mr-1" /> Quay lại tìm kiếm
          </Link>

          {/* GALLERY — không lặp ảnh, có lightbox */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-2 h-[300px] md:h-[400px] rounded-2xl overflow-hidden mb-8 shadow-sm">
            {/* Ảnh chính lớn */}
            <div
              className="md:col-span-2 md:row-span-2 relative group cursor-pointer"
              onClick={() => { setLightboxIndex(0); setLightboxOpen(true); }}
            >
              <img src={displayImages[0]} alt="Main" className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" />
              <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors duration-300 flex items-center justify-center">
                <ZoomIn className="h-8 w-8 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
              </div>
            </div>
            {/* Ảnh phụ — chỉ hiện nếu có ảnh thật */}
            {[1, 2, 3, 4].map((slot) => (
              <div
                key={slot}
                className={`hidden md:block relative group cursor-pointer ${
                  !displayImages[slot] ? 'bg-gray-100' : ''
                }`}
                onClick={() => { if (displayImages[slot]) { setLightboxIndex(slot); setLightboxOpen(true); } }}
              >
                {displayImages[slot] ? (
                  <>
                    <img
                      src={displayImages[slot]}
                      alt={`Sub ${slot}`}
                      className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                    />
                    {slot === 4 && images.length > 5 && (
                      <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                        <span className="text-white font-bold text-sm">+{images.length - 5} ảnh</span>
                      </div>
                    )}
                    {slot !== 4 && (
                      <div className="absolute inset-0 bg-black/0 group-hover:bg-black/25 transition-colors duration-300 flex items-center justify-center">
                        <ZoomIn className="h-6 w-6 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
                      </div>
                    )}
                  </>
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-gray-300 bg-gray-100">
                    <span className="text-xs">—</span>
                  </div>
                )}
              </div>
            ))}
          </div>

          <div className="flex flex-col lg:flex-row gap-8">
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
                     <Button variant="outline" className="w-full gap-2 border-primary/30 text-primary hover:bg-primary/5 hover:border-primary/50 h-11 shadow-sm" onClick={handleAskAI}>
                        <Bot className="h-4 w-4" /> Nhờ AI tư vấn thêm về khu trọ này
                     </Button>
                   </div>
                </div>

                {/* BẢN ĐỒ LEAFLET qua OpenStreetMap iframe */}
                <div className="rounded-xl overflow-hidden border shadow-sm h-48">
                  <iframe
                    title="Bản đồ vị trí khu trọ"
                    width="100%"
                    height="100%"
                    style={{ border: 0 }}
                    loading="lazy"
                    src={`https://www.openstreetmap.org/export/embed.html?bbox=&layer=mapnik&marker=&query=${encodeURIComponent(`${property.address}, ${property.district}, ${property.city}`)}`}
                    onError={(e) => {
                      const iframe = e.currentTarget;
                      iframe.style.display = 'none';
                    }}
                  />
                </div>
                <a
                  href={`https://www.openstreetmap.org/search?query=${encodeURIComponent(`${property.address}, ${property.district}, ${property.city}`)}`}
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center gap-1 text-xs text-primary hover:underline mt-1"
                >
                  <MapPin className="h-3 w-3" /> Xem bản đồ lớn hơn
                </a>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 2. DANH SÁCH PHÒNG */}
      <div className="container mx-auto max-w-7xl px-4 py-10">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-4 gap-4">
          <h2 className="text-2xl font-bold text-gray-800">
            Danh sách phòng
            <span className="ml-2 text-base font-normal text-gray-500">({filteredRooms.length}/{rooms.length})</span>
          </h2>
          <div className="flex items-center gap-3">
            <div className="inline-flex items-center gap-2 text-sm text-green-700 font-medium bg-green-50 px-4 py-1.5 rounded-full border border-green-200 shadow-sm">
               <ShieldCheck className="h-4 w-4" /> Tin đăng đã xác thực
            </div>
            <button
              onClick={() => setShowRoomFilter(!showRoomFilter)}
              className={`flex items-center gap-1.5 text-sm px-3 py-1.5 rounded-lg border transition ${
                showRoomFilter ? 'bg-primary text-white border-primary' : 'border-gray-200 text-gray-600 hover:bg-gray-50'
              }`}
            >
              <SlidersHorizontal className="h-4 w-4" /> Lọc phòng
            </button>
          </div>
        </div>

        {/* PANEL LỌC PHÒNG */}
        {showRoomFilter && (
          <div className="bg-white rounded-xl border p-4 mb-6 flex flex-wrap gap-6 items-end animate-in slide-in-from-top-2 duration-200">
            <div className="space-y-1">
              <label className="text-xs font-semibold text-gray-600 uppercase">Trạng thái</label>
              <div className="flex gap-2">
                {(["ALL", "AVAILABLE", "RENTED"] as const).map(s => (
                  <button
                    key={s}
                    onClick={() => setRoomStatusFilter(s)}
                    className={`px-3 py-1 rounded-full text-xs font-medium border transition ${
                      roomStatusFilter === s
                        ? 'bg-primary text-white border-primary'
                        : 'border-gray-200 text-gray-600 hover:bg-gray-50'
                    }`}
                  >
                    {s === "ALL" ? "Tất cả" : s === "AVAILABLE" ? "Còn trống" : "Đã thuê"}
                  </button>
                ))}
              </div>
            </div>
            <div className="space-y-1">
              <label className="text-xs font-semibold text-gray-600 uppercase">Sắp xếp</label>
              <select
                className="h-9 border border-gray-200 rounded-lg px-3 text-sm focus:ring-2 focus:ring-primary outline-none bg-white"
                value={roomSortBy}
                onChange={e => setRoomSortBy(e.target.value as any)}
              >
                <option value="default">Mặc định</option>
                <option value="price_asc">Giá: Thấp → Cao</option>
                <option value="price_desc">Giá: Cao → Thấp</option>
                <option value="area_asc">Diện tích: Nhỏ → Lớn</option>
              </select>
            </div>
            <button
              onClick={() => { setRoomSortBy("default"); setRoomStatusFilter("ALL"); }}
              className="text-xs text-gray-500 hover:text-red-500 underline"
            >
              Đặt lại
            </button>
          </div>
        )}

        {filteredRooms.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            {filteredRooms.map((room) => (
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
             <h3 className="text-gray-900 font-medium">
               {rooms.length === 0 ? 'Chưa có phòng' : 'Không có phòng khớp bộ lọc'}
             </h3>
             <p className="text-gray-500 text-sm mt-1">
               {rooms.length === 0
                 ? 'Hiện tại khu trọ này chưa có phòng nào được đăng tải.'
                 : 'Thử thay đổi bộ lọc để tìm phòng phù hợp.'}
             </p>
             {rooms.length > 0 && (
               <button
                 onClick={() => { setRoomSortBy('default'); setRoomStatusFilter('ALL'); }}
                 className="mt-3 text-sm text-primary underline"
               >Xóa bộ lọc</button>
             )}
          </div>
        )}

        {/* --- 4. KHỐI ĐÁNH GIÁ (REVIEWS) với Rating Tổng Hợp --- */}
        <div className="mt-12 bg-white rounded-2xl border p-6 md:p-8 shadow-sm">
          <h2 className="text-2xl font-bold text-gray-900 mb-6 flex items-center gap-2">
            <Star className="h-6 w-6 text-yellow-500 fill-yellow-500" />
            Đánh giá từ người thuê ({reviews.length})
          </h2>

          {reviews.length === 0 ? (
            <div className="text-center py-8 text-gray-500 bg-gray-50 rounded-xl border border-dashed">
              Chưa có đánh giá nào cho khu trọ này.
            </div>
          ) : (
            <>
              {/* RATING TỔNG HỢP */}
              <div className="flex flex-col sm:flex-row gap-6 mb-8 p-5 bg-amber-50 rounded-2xl border border-amber-100">
                {/* Điểm trung bình */}
                <div className="flex flex-col items-center justify-center shrink-0 text-center">
                  <span className="text-5xl font-extrabold text-amber-500">{avgRating.toFixed(1)}</span>
                  <div className="flex gap-0.5 mt-1">
                    {[1,2,3,4,5].map(s => (
                      <Star key={s} className={`h-5 w-5 ${
                        s <= Math.round(avgRating) ? 'text-yellow-400 fill-yellow-400' : 'text-gray-300 fill-gray-200'
                      }`} />
                    ))}
                  </div>
                  <span className="text-xs text-gray-500 mt-1">{reviews.length} đánh giá</span>
                </div>
                {/* Phân phối sao */}
                <div className="flex-1 space-y-1.5">
                  {ratingDistribution.map(({ star, count, pct }) => (
                    <div key={star} className="flex items-center gap-3">
                      <span className="text-xs text-gray-500 w-6 text-right shrink-0">{star}★</span>
                      <div className="flex-1 h-2 bg-gray-200 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-yellow-400 rounded-full transition-all duration-500"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                      <span className="text-xs text-gray-400 w-4 shrink-0">{count}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* DANH SÁCH REVIEW */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {reviews.map((review) => (
                  <div key={review.id} className="bg-gray-50 rounded-xl p-5 border border-gray-100 hover:shadow-md transition-shadow">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center gap-3">
                        <div className="h-10 w-10 bg-primary/20 text-primary rounded-full flex items-center justify-center font-bold shrink-0">
                          {review.reviewerName ? review.reviewerName.charAt(0).toUpperCase() : 'U'}
                        </div>
                        <div>
                          <p className="font-bold text-gray-900 text-sm">{review.reviewerName || 'Người dùng ẩn danh'}</p>
                          <p className="text-xs text-gray-500">
                            {new Date(review.createdAt).toLocaleDateString('vi-VN', { 
                               year: 'numeric', month: 'long', day: 'numeric' 
                            })}
                          </p>
                        </div>
                      </div>
                      <div className="flex gap-0.5 shrink-0">
                        {[1, 2, 3, 4, 5].map((star) => (
                          <Star 
                            key={star} 
                            className={`h-4 w-4 ${star <= review.rating ? 'text-yellow-400 fill-yellow-400' : 'text-gray-300 fill-gray-200'}`} 
                          />
                        ))}
                      </div>
                    </div>
                    <p className="text-gray-700 text-sm leading-relaxed mt-2 italic">
                      "{review.comment}"
                    </p>
                    <div className="mt-4 inline-block bg-white text-[11px] font-medium text-gray-500 px-2.5 py-1.5 rounded border">
                      Đã thuê: Phòng {review.roomName}
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
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
                      min={new Date().toISOString().split("T")[0]} 
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
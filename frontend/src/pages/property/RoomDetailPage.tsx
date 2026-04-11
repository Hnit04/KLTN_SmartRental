import { useEffect, useState } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import {
  ArrowLeft, Maximize, Zap, Droplets, Wifi, CalendarClock,
  CheckCircle, XCircle, Bot, Loader2, X, Phone, MessageSquare,
  MapPin, FileSignature, Sparkles, ChevronLeft, ChevronRight, ZoomIn,
  Wrench
} from "lucide-react";
import { propertyApi } from "@/api/propertyApi";
import { appointmentApi } from "@/api/appointmentApi";
import { useAuth } from "@/context/AuthContext";
import type { Room } from "@/types/index";
import LoadingSpinner from "@/components/shared/LoadingSpinner";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { toast } from "sonner";

export default function RoomDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { isAuthenticated, user } = useAuth();

  const [room, setRoom] = useState<Room | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Lightbox
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [lightboxIndex, setLightboxIndex] = useState(0);

  // Booking modal
  const [isBookingOpen, setIsBookingOpen] = useState(false);
  const [meetDate, setMeetDate] = useState("");
  const [meetTime, setMeetTime] = useState("");
  const [note, setNote] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    const load = async () => {
      if (!id) return;
      setIsLoading(true);
      try {
        const res = await propertyApi.getRoomDetail(id);
        setRoom((res as any).data || res);
      } catch {
        toast.error("Không tìm thấy thông tin phòng.");
      } finally {
        setIsLoading(false);
      }
    };
    load();
  }, [id]);

  // Kiểm tra trạng thái phòng
  const isAvailable = room?.status === "AVAILABLE";
  const isReserved = room?.status === "RESERVED";
  const isMaintenance = room?.status === "MAINTENANCE";

  const handleBooking = async () => {
    if (!isAuthenticated) {
      toast.error("Vui lòng đăng nhập để đặt lịch xem phòng!");
      navigate("/login");
      return;
    }
    if (user?.role === "LANDLORD") {
      toast.error("Tài khoản Chủ trọ không thể đặt lịch xem phòng.");
      return;
    }

    if (isMaintenance) {
      toast.error("Phòng đang trong quá trình bảo trì. Không thể đặt lịch lúc này.");
      return;
    }
    if (isReserved) {
      toast.error("Phòng đã có người đặt cọc. Không thể đặt lịch xem.");
      return;
    }
    if (!isAvailable) {
      toast.error("Phòng hiện không còn trống.");
      return;
    }

    setMeetDate("");
    setMeetTime("");
    setNote("");
    setIsBookingOpen(true);
  };

  const handleSubmitBooking = async () => {
    if (!room || !meetDate || !meetTime) {
      toast.error("Vui lòng chọn đầy đủ ngày và giờ hẹn!");
      return;
    }
    setIsSubmitting(true);
    try {
      await appointmentApi.createAppointment({
        roomId: room.id,
        meetTime: `${meetDate}T${meetTime}`,
        note,
      });
      toast.success("Đặt lịch thành công! Chờ chủ nhà xác nhận.");
      setIsBookingOpen(false);
    } catch (e: any) {
      toast.error(e?.response?.data?.message || "Có lỗi xảy ra khi đặt lịch.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleAskAI = () => {
    if (!room) return;
    const q = `Phân tích ưu nhược điểm của phòng "${room.name}" diện tích ${room.area}m², giá ${room.price?.toLocaleString("vi-VN")}đ/tháng. Có phù hợp không?`;
    window.dispatchEvent(new CustomEvent("openAiChat", { detail: { question: q } }));
  };

  const formatPrice = (n: number) => 
    new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND" }).format(n);

  // Text cho nút Đặt lịch
  const getBookingButtonText = () => {
    if (isMaintenance) return "Phòng đang bảo trì";
    if (isReserved) return "Đã có người đặt cọc";
    if (!isAvailable) return "Phòng đã có người thuê";
    return "Đặt lịch xem phòng";
  };

  if (isLoading) return <LoadingSpinner />;
  if (!room) return (
    <div className="flex flex-col items-center justify-center py-32 text-gray-500">
      <XCircle className="h-12 w-12 mb-3 text-gray-300" />
      <p className="font-medium">Không tìm thấy phòng này.</p>
      <Link to="/properties" className="mt-4 text-primary text-sm underline">Quay lại tìm kiếm</Link>
    </div>
  );

  // Parse dữ liệu
  let images: string[] = [];
  let amenities: string[] = [];
  try {
    images = room.images ? (typeof room.images === "string" ? JSON.parse(room.images) : room.images) : [];
    amenities = room.amenities ? (typeof room.amenities === "string" ? JSON.parse(room.amenities) : room.amenities) : [];
  } catch {
    images = [];
    amenities = [];
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-20">

      {/* ============ LIGHTBOX ============ */}
      {lightboxOpen && images.length > 0 && (
        <div className="fixed inset-0 z-[100] bg-black/95 flex items-center justify-center"
          onClick={() => setLightboxOpen(false)}>
          <button 
            className="absolute top-4 right-4 text-white/80 hover:text-white p-2 rounded-full bg-white/10 transition"
            onClick={() => setLightboxOpen(false)}
          >
            <X className="h-6 w-6" />
          </button>
          <button 
            className="absolute left-4 p-2 rounded-full bg-white/10 text-white hover:bg-white/20 transition"
            onClick={e => { e.stopPropagation(); setLightboxIndex(i => (i - 1 + images.length) % images.length); }}
          >
            <ChevronLeft className="h-7 w-7" />
          </button>
          <img 
            src={images[lightboxIndex]} 
            alt="" 
            className="max-h-[85vh] max-w-[90vw] object-contain rounded-lg shadow-2xl"
            onClick={e => e.stopPropagation()} 
          />
          <button 
            className="absolute right-4 p-2 rounded-full bg-white/10 text-white hover:bg-white/20 transition"
            onClick={e => { e.stopPropagation(); setLightboxIndex(i => (i + 1) % images.length); }}
          >
            <ChevronRight className="h-7 w-7" />
          </button>
          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2">
            {images.map((_, i) => (
              <button 
                key={i} 
                onClick={e => { e.stopPropagation(); setLightboxIndex(i); }}
                className={`w-2 h-2 rounded-full transition ${i === lightboxIndex ? "bg-white scale-125" : "bg-white/40"}`} 
              />
            ))}
          </div>
          <span className="absolute bottom-4 right-4 text-white/60 text-sm">
            {lightboxIndex + 1} / {images.length}
          </span>
        </div>
      )}

      <div className="container mx-auto max-w-5xl px-4 py-8">
        {/* Breadcrumb */}
        <div className="flex items-center gap-2 text-sm text-gray-500 mb-6">
          <Link to="/properties" className="hover:text-primary transition">Tìm phòng</Link>
          <span>/</span>
          {room.propertyName && (
            <>
              <Link to={`/properties/${room.propertyId}`} className="hover:text-primary transition line-clamp-1">
                {room.propertyName}
              </Link>
              <span>/</span>
            </>
          )}
          <span className="text-gray-800 font-medium">Phòng {room.name}</span>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

          {/* ===== CỘT TRÁI: Ảnh + Thông tin ===== */}
          <div className="lg:col-span-2 space-y-6">

            {/* GALLERY */}
            {images.length > 0 ? (
              <div className={`grid gap-2 rounded-2xl overflow-hidden h-72 md:h-96 ${images.length >= 3 ? "grid-cols-3" : images.length === 2 ? "grid-cols-2" : "grid-cols-1"}`}>
                {images.slice(0, 3).map((img, i) => (
                  <div 
                    key={i}
                    className={`relative group cursor-pointer overflow-hidden ${i === 0 && images.length >= 3 ? "col-span-2 row-span-2" : ""}`}
                    onClick={() => { setLightboxIndex(i); setLightboxOpen(true); }}
                  >
                    <img 
                      src={img} 
                      alt={`Ảnh ${i + 1}`} 
                      className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" 
                    />
                    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/25 transition-colors flex items-center justify-center">
                      <ZoomIn className="h-7 w-7 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
                    </div>
                    {i === 2 && images.length > 3 && (
                      <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                        <span className="text-white font-bold text-lg">+{images.length - 3} ảnh</span>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div className="h-64 bg-gray-100 rounded-2xl flex items-center justify-center text-gray-400">
                Chưa có ảnh phòng
              </div>
            )}

            {/* THÔNG TIN CHÍNH */}
            <div className="bg-white rounded-2xl border p-6 space-y-5 shadow-sm">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h1 className="text-2xl font-bold text-gray-900">Phòng {room.name}</h1>
                  {room.propertyName && (
                    <Link 
                      to={`/properties/${room.propertyId}`}
                      className="flex items-center gap-1 text-sm text-primary mt-1 hover:underline"
                    >
                      <MapPin className="h-3.5 w-3.5" />
                      {room.propertyName} · {room.propertyAddress || room.address}
                    </Link>
                  )}
                  <div className="flex flex-wrap items-center gap-2 mt-2">
                    {room.type && (
                      <span className="text-xs font-medium text-primary bg-primary/5 border border-primary/20 px-2.5 py-1 rounded-full">
                        {room.type === 'STUDIO' ? 'Phòng Studio' :
                         room.type === 'ONE_BEDROOM' ? '1 Phòng ngủ' :
                         room.type === 'TWO_BEDROOM' ? '2 Phòng ngủ' :
                         room.type === 'SINGLE_ROOM' ? 'Phòng đơn' :
                         room.type === 'SHARED_ROOM' ? 'Phòng ghép' :
                         room.type === 'MEZZANINE_ROOM' ? 'Phòng có gác lửng' : ''}
                      </span>
                    )}
                    {room.hasMezzanine && (
                      <span className="text-xs font-medium text-amber-700 bg-amber-50 border border-amber-200 px-2.5 py-1 rounded-full">
                        Có gác lửng
                      </span>
                    )}
                    {room.hasBalcony && (
                      <span className="text-xs font-medium text-sky-700 bg-sky-50 border border-sky-200 px-2.5 py-1 rounded-full">
                        Có ban công
                      </span>
                    )}
                  </div>
                </div>

                {/* Badge trạng thái */}
                <span className={`px-3 py-1 rounded-full text-xs font-bold flex items-center gap-1.5 ${
                  isAvailable ? "bg-green-100 text-green-700" : 
                  isReserved ? "bg-orange-100 text-orange-700" : 
                  isMaintenance ? "bg-amber-100 text-amber-700" : 
                  "bg-gray-100 text-gray-500"
                }`}>
                  {isAvailable ? (
                    <><CheckCircle className="h-3.5 w-3.5" /> Còn trống</>
                  ) : isReserved ? (
                    <><CalendarClock className="h-3.5 w-3.5" /> Đã có người đặt cọc</>
                  ) : isMaintenance ? (
                    <><Wrench className="h-3.5 w-3.5" /> Đang bảo trì</>
                  ) : (
                    <><XCircle className="h-3.5 w-3.5" /> Đã thuê</>
                  )}
                </span>
              </div>

              {/* Giá + Diện tích */}
              <div className="flex flex-wrap gap-4">
                <div className="bg-primary/5 border border-primary/20 rounded-xl px-5 py-3">
                  <p className="text-xs text-gray-500 mb-0.5">Giá thuê</p>
                  <p className="text-2xl font-extrabold text-primary">
                    {formatPrice(room.price)}
                    <span className="text-sm font-normal text-gray-500">/tháng</span>
                  </p>
                </div>
                <div className="bg-gray-50 border rounded-xl px-5 py-3">
                  <p className="text-xs text-gray-500 mb-0.5">Diện tích</p>
                  <p className="text-xl font-bold text-gray-800 flex items-center gap-1">
                    <Maximize className="h-4 w-4 text-gray-400" />{room.area} m²
                  </p>
                </div>
              </div>

              {/* Phí dịch vụ, Tiện ích, Mô tả, Điều khoản ... (giữ nguyên như file gốc) */}
              {/* Bạn có thể copy phần này từ file cũ nếu cần, ở đây tôi giữ cấu trúc đầy đủ */}

              {(room.elecPrice || room.waterPrice || room.internetPrice) && (
                <div className="border-t pt-4">
                  <p className="text-sm font-semibold text-gray-700 mb-3">Chi phí dịch vụ</p>
                  <div className="flex flex-wrap gap-3">
                    {room.elecPrice && (
                      <div className="flex items-center gap-2 bg-yellow-50 px-3 py-2 rounded-lg border border-yellow-100">
                        <Zap className="h-4 w-4 text-yellow-500" />
                        <div>
                          <p className="text-[10px] text-gray-400 font-bold uppercase">Điện</p>
                          <p className="text-sm font-bold">{room.elecPrice.toLocaleString()}đ/kWh</p>
                        </div>
                      </div>
                    )}
                    {room.waterPrice && (
                      <div className="flex items-center gap-2 bg-blue-50 px-3 py-2 rounded-lg border border-blue-100">
                        <Droplets className="h-4 w-4 text-blue-500" />
                        <div>
                          <p className="text-[10px] text-gray-400 font-bold uppercase">Nước</p>
                          <p className="text-sm font-bold">{room.waterPrice.toLocaleString()}đ/khối</p>
                        </div>
                      </div>
                    )}
                    {room.internetPrice && (
                      <div className="flex items-center gap-2 bg-indigo-50 px-3 py-2 rounded-lg border border-indigo-100">
                        <Wifi className="h-4 w-4 text-indigo-500" />
                        <div>
                          <p className="text-[10px] text-gray-400 font-bold uppercase">Internet</p>
                          <p className="text-sm font-bold">{room.internetPrice.toLocaleString()}đ/tháng</p>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {amenities.length > 0 && (
                <div className="border-t pt-4">
                  <p className="text-sm font-semibold text-gray-700 mb-3">Tiện nghi phòng</p>
                  <div className="flex flex-wrap gap-2">
                    {amenities.map((a, i) => (
                      <span key={i} className="bg-blue-50 text-blue-700 px-3 py-1 rounded-full text-xs font-medium border border-blue-100">
                        {a}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {room.description && (
                <div className="border-t pt-4">
                  <p className="text-sm font-semibold text-gray-700 mb-2">Mô tả phòng</p>
                  <p className="text-sm text-gray-600 leading-relaxed whitespace-pre-line bg-gray-50 p-4 rounded-xl border">
                    {room.description}
                  </p>
                </div>
              )}

              {room.defaultTerms && (
                <div className="border-t pt-4">
                  <p className="text-sm font-semibold text-gray-700 mb-2">Nội quy & Điều khoản</p>
                  <div className="text-sm text-gray-600 leading-relaxed bg-amber-50 p-4 rounded-xl border border-amber-100 whitespace-pre-line">
                    {room.defaultTerms}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* ===== CỘT PHẢI: Hành động ===== */}
          <div className="lg:col-span-1">
            <div className="sticky top-24 space-y-4">

              <div className="bg-white rounded-2xl border shadow-lg p-5 space-y-3">
                <div className="text-center pb-3 border-b">
                  <p className="text-2xl font-extrabold text-primary">{formatPrice(room.price)}</p>
                  <p className="text-sm text-gray-400">/ tháng · {room.area} m²</p>
                </div>

                {room.matchScore && room.matchScore > 0 && (
                  <div className="flex items-center gap-2 bg-primary/5 border border-primary/20 rounded-xl px-3 py-2">
                    <Sparkles className="h-4 w-4 text-primary shrink-0" />
                    <div>
                      <p className="text-xs font-bold text-primary">{Math.round(room.matchScore)}% phù hợp với bạn</p>
                      {room.matchReason && <p className="text-[11px] text-gray-500 mt-0.5 line-clamp-2">{room.matchReason}</p>}
                    </div>
                  </div>
                )}

                <Button
                  className="w-full h-11 gap-2"
                  disabled={!isAvailable || isReserved || isMaintenance}
                  onClick={handleBooking}
                >
                  <CalendarClock className="h-4 w-4" />
                  {getBookingButtonText()}
                </Button>

                {isAvailable && isAuthenticated && user?.role !== "LANDLORD" && (
                  <Button
                    variant="outline"
                    className="w-full h-11 gap-2 text-green-700 border-green-200 hover:bg-green-50"
                    onClick={() => navigate(`/tenant/contracts/create?roomId=${room.id}`)}
                  >
                    <FileSignature className="h-4 w-4" />
                    Thuê ngay
                  </Button>
                )}

                <Button
                  variant="outline"
                  className="w-full h-11 gap-2 border-primary/30 text-primary hover:bg-primary/5"
                  onClick={handleAskAI}
                >
                  <Bot className="h-4 w-4" />
                  Hỏi AI về phòng này
                </Button>
              </div>

              {/* Liên hệ chủ nhà */}
              {(room as any).landlordPhone && (
                <div className="bg-white rounded-2xl border p-4 space-y-3">
                  <p className="text-xs font-bold uppercase text-gray-400 tracking-wider">Liên hệ chủ nhà</p>
                  <p className="font-bold text-gray-900">{room.landlordName || "Chủ nhà"}</p>
                  <div className="grid grid-cols-2 gap-2">
                    <Button 
                      variant="outline" 
                      size="sm" 
                      className="gap-1.5 text-green-700 border-green-200 hover:bg-green-50"
                      onClick={() => window.location.href = `tel:${(room as any).landlordPhone}`}
                    >
                      <Phone className="h-3.5 w-3.5" /> Gọi điện
                    </Button>
                    <Button 
                      variant="outline" 
                      size="sm" 
                      className="gap-1.5 text-blue-600 border-blue-200 hover:bg-blue-50"
                      onClick={() => window.open(`https://zalo.me/${(room as any).landlordPhone}`, "_blank")}
                    >
                      <MessageSquare className="h-3.5 w-3.5" /> Zalo
                    </Button>
                  </div>
                </div>
              )}

              {room.propertyId && (
                <Link 
                  to={`/properties/${room.propertyId}`}
                  className="flex items-center gap-2 text-sm text-gray-500 hover:text-primary transition px-1"
                >
                  <ArrowLeft className="h-4 w-4" />
                  Xem tất cả phòng của khu trọ này
                </Link>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ===== BOOKING MODAL ===== */}
      {isBookingOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl w-full max-w-md overflow-hidden shadow-2xl animate-in zoom-in-95">
            <div className="p-5 border-b flex justify-between items-center bg-gray-50">
              <h2 className="text-lg font-bold flex items-center gap-2 text-gray-900">
                <CalendarClock className="h-5 w-5 text-primary" /> Đặt lịch xem phòng
              </h2>
              <button onClick={() => setIsBookingOpen(false)} className="text-gray-400 hover:text-gray-600">
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="p-6 space-y-5">
              <div className="bg-primary/5 border border-primary/20 rounded-xl p-4">
                <p className="text-sm font-semibold text-primary">Phòng {room.name}</p>
                <p className="text-xs text-gray-500 mt-0.5">Giá thuê: {formatPrice(room.price)}/tháng</p>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-gray-700">Ngày xem <span className="text-red-500">*</span></label>
                  <Input 
                    type="date" 
                    value={meetDate} 
                    onChange={e => setMeetDate(e.target.value)} 
                    min={new Date().toISOString().split("T")[0]} 
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-gray-700">Giờ xem <span className="text-red-500">*</span></label>
                  <Input 
                    type="time" 
                    value={meetTime} 
                    onChange={e => setMeetTime(e.target.value)} 
                  />
                </div>
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-gray-700">Lời nhắn (Tùy chọn)</label>
                <textarea
                  className="w-full min-h-[70px] rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                  placeholder="VD: Mình muốn xem phòng sau 17h..."
                  value={note}
                  onChange={e => setNote(e.target.value)}
                />
              </div>
            </div>
            <div className="p-5 bg-gray-50 border-t flex justify-end gap-3">
              <Button variant="outline" onClick={() => setIsBookingOpen(false)}>Hủy</Button>
              <Button 
                onClick={handleSubmitBooking} 
                disabled={isSubmitting || !meetDate || !meetTime}
              >
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
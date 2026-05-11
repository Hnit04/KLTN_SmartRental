import { useEffect, useState } from "react";
import { useParams, Link, useNavigate, useSearchParams } from "react-router-dom";
import {
  ArrowLeft, Maximize, Zap, Droplets, Wifi, CalendarClock,
  XCircle, Bot, Loader2, X, Phone, MessageSquare,
  MapPin, FileSignature, Sparkles, ChevronLeft, ChevronRight, ZoomIn,
  Share2, Heart, LayoutTemplate, Box, Users, Sofa, Tv, BedDouble, Car,
  GitCompareArrows, Flag
} from "lucide-react";
import { ShieldCheck } from "lucide-react";
import { propertyApi } from "@/api/propertyApi";
import { appointmentApi } from "@/api/appointmentApi";
import { useAuth } from "@/context/AuthContext";
import { useFavorites } from "@/hooks/useFavorites";
import { useCompare } from "@/context/CompareContext";
import type { Room } from "@/types/index";
import { Button } from "@/components/ui/Button";
import { StatKpiCard } from "@/components/dashboard";
import { EmptyState } from "@/components/ui/EmptyState";
import { Skeleton } from "@/components/ui/Skeleton";
import { Input } from "@/components/ui/Input";
import StatusBadge from "@/components/shared/StatusBadge";
import { toast } from "sonner";
import LoginRequiredModal from "@/components/shared/LoginRequiredModal";
import { lazy, Suspense } from "react";
import { MapContainer, TileLayer, Marker, Popup } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

const customMarkerIcon = new L.Icon({
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41]
});

const Room360Viewer = lazy(() => import("@/components/property/Room360Viewer"));
import StreetViewVerification from "@/components/property/StreetViewVerification";
import ReportRoomModal from "@/components/property/ReportRoomModal";

export default function RoomDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { isAuthenticated, user } = useAuth();
  
  const { isFavorite, toggleFavorite } = useFavorites();
  const { addToCompare, isInCompare } = useCompare();

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
  const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);
  const [loginModalConfig, setLoginModalConfig] = useState({ title: "", message: "" });
  const [showFullPhone, setShowFullPhone] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [distance, setDistance] = useState<string | null>(null);
  
  // Report modal
  const [isReportModalOpen, setIsReportModalOpen] = useState(false);

  const [searchParams] = useSearchParams();
  const actionQuery = searchParams.get("action");

  useEffect(() => {
    const load = async () => {
      if (!id) return;
      setIsLoading(true);
      try {
        const res = await propertyApi.getRoomDetail(id);
        const roomData = (res as any).data || res;

        // Fetch property details to get coordinates for the map
        if (roomData.propertyId) {
          try {
            const propRes = await propertyApi.getDetail(roomData.propertyId);
            const propData = (propRes as any).data || propRes;
            roomData.latitude = propData.latitude;
            roomData.longitude = propData.longitude;
            roomData.propertyImages = propData.images;
          } catch (e) {
            console.error("Failed to load property coordinates", e);
          }
        }

        setRoom(roomData);
      } catch {
        toast.error("Không tìm thấy thông tin phòng.");
      } finally {
        setIsLoading(false);
      }
    };
    load();

    // Lấy vị trí người dùng
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setUserLocation({
            lat: position.coords.latitude,
            lng: position.coords.longitude,
          });
        },
        (error) => console.log("Lỗi lấy vị trí: ", error)
      );
    }
  }, [id]);

  useEffect(() => {
    // Tính khoảng cách
    const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number) => {
      const R = 6371; // km
      const dLat = (lat2 - lat1) * Math.PI / 180;
      const dLon = (lon2 - lon1) * Math.PI / 180;
      const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
                Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
                Math.sin(dLon/2) * Math.sin(dLon/2);
      const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
      return R * c;
    };

    if (userLocation && (room as any)?.latitude && (room as any)?.longitude) {
      const dist = calculateDistance(
        userLocation.lat, userLocation.lng,
        (room as any).latitude, (room as any).longitude
      );
      setDistance(dist.toFixed(1));
    }
  }, [userLocation, room]);

  useEffect(() => {
    // Tự động mở hộp thoại đặt lịch nếu được chuyển tới từ nơi khác kèm ?action=book
    if (room && actionQuery === "book") {
      navigate(`/rooms/${room.id}`, { replace: true }); // Xoá query trên URL để tránh lặp lại
      setTimeout(() => {
        handleBooking();
      }, 300);
    }
  }, [room, actionQuery, navigate]);

  // Kiểm tra trạng thái phòng
  const isAvailable = room?.status === "AVAILABLE";
  const isReserved = room?.status === "RESERVED";
  const isMaintenance = room?.status === "MAINTENANCE";

  const handleBooking = async () => {
    if (!isAuthenticated) {
      setLoginModalConfig({
        title: "Đặt lịch xem phòng",
        message: "Bạn cần đăng nhập để đặt lịch hẹn và nhận thông báo xác nhận từ chủ nhà."
      });
      setIsLoginModalOpen(true);
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
    // 🛡️ Cho phép đặt lịch xem phòng sắp trống (Pre-booking)
    if (!isAvailable && !room?.availableFromDate) {
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
    // Parse amenities for the prompt
    let roomAmenities: string[] = [];
    try {
      roomAmenities = room.amenities ? (typeof room.amenities === "string" ? JSON.parse(room.amenities) : room.amenities) : [];
    } catch { roomAmenities = []; }

    const details = [
      `Tên phòng: "${room.name}"`,
      `Khu trọ: "${room.propertyName || ''}"`,
      `Địa chỉ: ${room.propertyAddress || room.address || ''}`,
      `Diện tích: ${room.area}m²`,
      `Giá thuê: ${room.price?.toLocaleString("vi-VN")}đ/tháng`,
      room.type ? `Loại phòng: ${room.type === 'STUDIO' ? 'Studio' : room.type === 'ONE_BEDROOM' ? '1 Phòng ngủ' : room.type === 'TWO_BEDROOM' ? '2 Phòng ngủ' : room.type === 'SINGLE_ROOM' ? 'Phòng đơn' : room.type === 'SHARED_ROOM' ? 'Phòng ghép' : room.type === 'MEZZANINE_ROOM' ? 'Phòng gác lửng' : room.type}` : '',
      room.hasMezzanine ? 'Có gác lửng' : '',
      room.hasBalcony ? 'Có ban công' : '',
      roomAmenities.length > 0 ? `Tiện nghi: ${roomAmenities.join(', ')}` : '',
      room.elecPrice ? `Tiền điện: ${room.elecPrice.toLocaleString()}đ/kWh` : '',
      room.waterPrice ? `Tiền nước: ${room.waterPrice.toLocaleString()}đ/khối` : '',
      room.internetPrice ? `Internet: ${room.internetPrice.toLocaleString()}đ/tháng` : '',
      room.description ? `Mô tả: ${room.description.substring(0, 200)}` : '',
    ].filter(Boolean).join('. ');

    const q = `Hãy phân tích chi tiết ưu điểm và nhược điểm của phòng trọ sau đây, đánh giá mức giá có hợp lý không, và đưa ra lời khuyên cho người thuê:\n${details}`;
    const shortText = `Phân tích phòng "${room.name}" tại "${room.propertyName || 'khu trọ này'}" giúp mình nhé! 🏠`;
    window.dispatchEvent(new CustomEvent("openAiChat", { detail: { question: q, autoSend: true, displayText: shortText } }));
  };

  const formatPrice = (n: number) => 
    new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND" }).format(n);

  const maskPhone = (phone: string) => {
    if (!phone) return "";
    if (showFullPhone || isAuthenticated) return phone;
    return phone.substring(0, phone.length - 3) + "xxx";
  };

  const handleShowPhone = () => {
    if (!isAuthenticated) {
      setLoginModalConfig({
        title: "Xem số điện thoại",
        message: "Vui lòng đăng nhập để xem thông tin liên hệ đầy đủ của chủ nhà."
      });
      setIsLoginModalOpen(true);
      return;
    }
    setShowFullPhone(true);
  };

  const handleRentNow = () => {
    if (!isAuthenticated) {
      setLoginModalConfig({
        title: "Thuê phòng ngay",
        message: "Đăng nhập để tiến hành tạo hợp đồng thuê trực tuyến một cách nhanh chóng và an toàn."
      });
      setIsLoginModalOpen(true);
      return;
    }
    // 🛡️ Cho phép thuê ngay cho cả phòng trống và phòng sắp trống
    navigate(`/tenant/contracts/create?roomId=${room?.id}`);
  };

  const handleGetDirections = () => {
    const dest = (room as any)?.latitude && (room as any)?.longitude 
      ? `${(room as any).latitude},${(room as any).longitude}` 
      : encodeURIComponent(room?.propertyAddress || room?.address || "");
      
    if (userLocation) {
      window.open(`https://www.google.com/maps/dir/?api=1&origin=${userLocation.lat},${userLocation.lng}&destination=${dest}`, '_blank');
    } else {
      window.open(`https://www.google.com/maps/search/?api=1&query=${dest}`, '_blank');
    }
  };

  const handleShare = () => {
    if (navigator.share) {
      navigator.share({
        title: room?.name,
        text: `Xem phòng ${room?.name} trên SmartRental`,
        url: window.location.href,
      }).catch(console.error);
    } else {
      navigator.clipboard.writeText(window.location.href);
      toast.success("Đã sao chép liên kết vào khay nhớ tạm!");
    }
  };

  const handleReportClick = () => {
    if (!isAuthenticated) {
      setLoginModalConfig({
        title: "Yêu cầu đăng nhập",
        message: "Bạn cần đăng nhập để báo cáo phòng trọ này."
      });
      setIsLoginModalOpen(true);
      return;
    }
    if (user?.role === "LANDLORD") {
      toast.error("Tài khoản Chủ trọ không thể báo cáo phòng.");
      return;
    }
    if (user?.kycStatus !== 'VERIFIED') {
      toast.error("Tài khoản của bạn chưa xác thực CCCD. Vui lòng xác thực trước khi báo cáo để đảm bảo tính minh bạch.");
      return;
    }
    setIsReportModalOpen(true);
  };

  // Text cho nút Đặt lịch
  const getBookingButtonText = () => {
    if (isMaintenance) return "Phòng đang bảo trì";
    if (isReserved) return "Đã có người đặt cọc";
    if (!isAvailable && room?.availableFromDate) return `Đặt lịch xem (Sắp trống)`;
    if (!isAvailable) return "Phòng đã có người thuê";
    return "Đặt lịch xem phòng";
  };

  if (isLoading) {
    return (
      <div className="mx-auto min-h-[50vh] max-w-7xl space-y-6 px-4 py-8 sm:px-6">
        <Skeleton className="h-4 w-64 rounded-md" />
        <Skeleton className="h-10 w-full max-w-2xl rounded-xl" />
        <Skeleton className="h-[45vh] w-full rounded-[20px]" />
        <div className="grid grid-cols-3 gap-3">
          <Skeleton className="h-24 rounded-2xl" />
          <Skeleton className="h-24 rounded-2xl" />
          <Skeleton className="h-24 rounded-2xl" />
        </div>
      </div>
    );
  }
  if (!room) {
    return (
      <div className="mx-auto max-w-lg px-4 py-20">
        <EmptyState
          icon={XCircle}
          title="Không tìm thấy phòng"
          description="Liên kết có thể đã hết hạn hoặc phòng đã được gỡ."
          action={
            <Button type="button" variant="outline" className="min-h-11" onClick={() => navigate("/properties")}>
              Quay lại tìm kiếm
            </Button>
          }
        />
      </div>
    );
  }

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

  const statusSummary = isMaintenance
    ? 'Đang bảo trì'
    : isReserved
      ? 'Đã đặt cọc'
      : isAvailable
        ? 'Đang trống'
        : room.status === 'RENTED' && room.availableFromDate
          ? 'Sắp trống'
          : 'Đang cho thuê';

  return (
    <div className="min-h-screen overflow-x-hidden bg-background pb-20">

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

      <div className="mx-auto min-w-0 max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        {/* Breadcrumb */}
        <div className="flex items-center gap-2 text-sm text-gray-500 mb-6">
          <Link to="/properties" className="hover:text-primary transition">Tìm phòng</Link>
          <span><ChevronRight className="h-3.5 w-3.5" /></span>
          {room.propertyName && (
            <>
              <Link to={`/properties/${room.propertyId}`} className="hover:text-primary transition line-clamp-1">
                {room.propertyName}
              </Link>
              <span><ChevronRight className="h-3.5 w-3.5" /></span>
            </>
          )}
          <span className="text-gray-800 font-medium">
            {room.name?.toLowerCase().includes('phòng') ? room.name : `Phòng ${room.name}`}
          </span>
        </div>

        {/* ⚠️ BANNER CẢNH BÁO KHI PHÒNG BỊ ẨN / BẢO TRÌ */}
        {isMaintenance && (
          <div className="mb-6 bg-red-50 border-2 border-red-300 rounded-2xl p-5 flex items-start gap-4 animate-in fade-in">
            <div className="bg-red-100 p-2.5 rounded-full shrink-0">
              <XCircle className="h-6 w-6 text-red-600" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-red-800 mb-1">Phòng này hiện không khả dụng</h3>
              <p className="text-sm text-red-700">
                Phòng đang trong trạng thái bảo trì hoặc đã bị gỡ do vi phạm chính sách nền tảng. 
                Các chức năng đặt lịch, báo cáo và liên hệ đã bị tạm dừng.
              </p>
              <Link to="/properties" className="inline-flex items-center gap-1.5 mt-3 text-sm font-semibold text-red-700 hover:text-red-900 underline underline-offset-2">
                <ArrowLeft className="h-4 w-4" /> Quay lại tìm phòng khác
              </Link>
            </div>
          </div>
        )}

        {/* MAIN CONTENT GRID */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 lg:gap-12">

          {/* ===== CỘT TRÁI: Thông tin ===== */}
          <div className="lg:col-span-2">

            {/* Header - Title & Badges */}
            <div className="mb-6 flex flex-col md:flex-row md:items-start justify-between gap-4">
              <div>
                <div className="flex flex-wrap items-center gap-3 mb-2">
                  <h1 className="text-3xl font-bold text-gray-900">
                    {room.name?.toLowerCase().includes('phòng') ? room.name : `Phòng ${room.name}`}
                  </h1>
                  {room.type && (
                    <span className="px-3 py-1 bg-blue-50 text-blue-600 rounded-full text-[13px] font-semibold whitespace-nowrap">
                      {room.type === 'STUDIO' ? 'Phòng Studio' :
                        room.type === 'ONE_BEDROOM' ? '1 Phòng ngủ' :
                        room.type === 'TWO_BEDROOM' ? '2 Phòng ngủ' :
                        room.type === 'SINGLE_ROOM' ? 'Phòng đơn' :
                        room.type === 'SHARED_ROOM' ? 'Phòng ghép' :
                        room.type === 'MEZZANINE_ROOM' ? 'Có gác lửng' : ''}
                    </span>
                  )}
                  {isAvailable ? (
                    <span className="px-3 py-1 bg-gray-100 text-gray-600 rounded-full text-[13px] font-semibold whitespace-nowrap">Còn trống</span>
                  ) : isReserved ? (
                    <span className="px-3 py-1 bg-yellow-50 text-yellow-600 rounded-full text-[13px] font-semibold whitespace-nowrap">Đã cọc</span>
                  ) : isMaintenance ? (
                    <span className="px-3 py-1 bg-amber-50 text-amber-600 rounded-full text-[13px] font-semibold whitespace-nowrap">Đang bảo trì</span>
                  ) : room.status === 'RENTED' && room.availableFromDate ? (
                    <span className="px-3 py-1 bg-orange-50 text-orange-600 rounded-full text-[13px] font-semibold whitespace-nowrap">Sắp trống</span>
                  ) : (
                    <span className="px-3 py-1 bg-gray-100 text-gray-600 rounded-full text-[13px] font-semibold whitespace-nowrap">Đã thuê</span>
                  )}
                </div>

                <div className="mt-1 flex min-w-0 items-center gap-1.5 text-[15px] text-gray-500">
                  <MapPin className="h-4 w-4 shrink-0" />
                  <span className="min-w-0 break-words">{room.propertyAddress || room.address}</span>
                </div>
                
                {room.propertyName && (
                  <p className="mt-3 text-[13px] font-bold uppercase tracking-wide text-amber-800/90">
                    {room.propertyName}
                  </p>
                )}
              </div>
            </div>

            <div className="mb-8 grid grid-cols-1 gap-3 sm:grid-cols-3">
              <StatKpiCard
                icon={<CalendarClock className="h-5 w-5" />}
                iconClassName="text-primary"
                label="Giá thuê"
                value={room.price != null ? `${Number(room.price).toLocaleString('vi-VN')} đ/tháng` : '—'}
                description="Giá niêm yết hiện tại"
              />
              <StatKpiCard
                icon={<LayoutTemplate className="h-5 w-5" />}
                iconClassName="text-emerald-600"
                label="Diện tích"
                value={room.area != null ? `${room.area} m²` : '—'}
                description="Diện tích sử dụng"
              />
              <StatKpiCard
                icon={<Box className="h-5 w-5" />}
                iconClassName="text-amber-600"
                label="Trạng thái"
                value={statusSummary}
                description="Ảnh hưởng đến đặt lịch và liên hệ"
              />
            </div>

        {/* HERO GALLERY */}
        <div className="mb-10 relative group">
          {images.length > 0 ? (
            <div className="relative">
              {/* Main Image */}
              <div className="relative h-[45vh] md:h-[55vh] bg-gray-100 rounded-[20px] overflow-hidden group border border-gray-200">
                <img 
                  src={images[lightboxIndex] || images[0]} 
                  alt="Ảnh phòng" 
                  className="w-full h-full object-cover bg-black/5 cursor-pointer"
                  onClick={() => setLightboxOpen(true)}
                />
                
                {/* Controls */}
                <button 
                  onClick={(e) => { e.stopPropagation(); setLightboxIndex(i => (i - 1 + images.length) % images.length); }}
                  className="absolute left-4 top-1/2 -translate-y-1/2 p-2.5 rounded-xl bg-white shadow-md transition opacity-0 group-hover:opacity-100 hover:scale-105"
                >
                  <ChevronLeft className="h-5 w-5 text-gray-700" />
                </button>
                <button 
                  onClick={(e) => { e.stopPropagation(); setLightboxIndex(i => (i + 1) % images.length); }}
                  className="absolute right-4 top-1/2 -translate-y-1/2 p-2.5 rounded-xl bg-white shadow-md transition opacity-0 group-hover:opacity-100 hover:scale-105"
                >
                  <ChevronRight className="h-5 w-5 text-gray-700" />
                </button>

                <div className="absolute bottom-4 right-4 bg-black/60 text-white text-xs font-semibold px-3 py-1.5 rounded-lg backdrop-blur-md cursor-pointer" onClick={() => setLightboxOpen(true)}>
                  {lightboxIndex + 1} / {images.length}
                </div>
              </div>
              
              {/* Thumbnails */}
              {images.length > 1 && (
                <div className="flex gap-2.5 mt-3 overflow-x-auto pb-2 scrollbar-hide">
                  {images.slice(0, 5).map((img, i) => (
                    <div 
                      key={i} 
                      onClick={() => setLightboxIndex(i)}
                      className={`relative flex-1 min-w-[80px] h-20 rounded-[12px] overflow-hidden cursor-pointer transition-all ${lightboxIndex === i ? 'ring-2 ring-offset-2 ring-[#A67C52]' : 'hover:opacity-90'}`}
                    >
                      <img src={img} alt="" className="w-full h-full object-cover" />
                      {i === 4 && images.length > 5 && (
                        <div className="absolute inset-0 bg-black/50 flex items-center justify-center text-white text-lg font-bold" onClick={() => setLightboxOpen(true)}>
                          +{images.length - 5}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          ) : (
            <div className="h-[55vh] bg-muted/40 rounded-[20px] flex items-center justify-center text-gray-400 border border-gray-200">
              Chưa có ảnh phòng
            </div>
          )}
        </div>

        {/* 360 VIEWER (Ngay dưới ảnh bình thường) */}
        {room.panoramaImages && room.panoramaImages.length > 0 && (
          <div className="mb-10">
            <div className="mb-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <h2 className="flex items-center gap-2 text-lg font-bold text-gray-900 min-w-0">
                <span className="w-7 h-7 bg-gradient-to-br from-cyan-500 to-blue-600 rounded-lg flex items-center justify-center">
                  <svg className="w-4 h-4 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <circle cx="12" cy="12" r="10" strokeDasharray="4 2"/>
                    <path d="M12 2a10 10 0 0 1 0 20M12 2a10 10 0 0 0 0 20M2 12h20"/>
                  </svg>
                </span>
                Xem phòng 360°
              </h2>
              <span className="text-xs font-bold bg-cyan-50 text-cyan-700 px-2.5 py-1 rounded-full">Virtual Tour</span>
            </div>
            <div className="bg-white rounded-2xl border p-2 shadow-sm">
              <Suspense fallback={
                <div className="h-[400px] bg-slate-50 rounded-xl flex items-center justify-center border border-dashed border-gray-200">
                  <Loader2 className="h-6 w-6 animate-spin text-cyan-500" />
                </div>
              }>
                <div className="rounded-xl">
                  <Room360Viewer images={room.panoramaImages} />
                </div>
              </Suspense>
            </div>
          </div>
        )}

        {/* STREET VIEW VERIFICATION */}
        {((room as any)?.latitude && (room as any)?.longitude) && (
          <div className="mb-10">
            <StreetViewVerification
              latitude={(room as any).latitude}
              longitude={(room as any).longitude}
              propertyAddress={room.propertyAddress || room.address || ''}
            />
          </div>
        )}

            
            {/* TAB NAVIGATION */}
            <div className="flex items-center gap-6 sm:gap-10 border-b mb-8 overflow-x-auto scrollbar-hide">
              {['Tổng quan', 'Vị trí', 'Tiện ích', 'Mô tả', 'Nội quy'].map((tab) => (
                <a 
                  key={tab} 
                  href={`#${tab.toLowerCase().replace(/ /g, '-')}`}
                  className="pb-3 text-sm font-medium text-gray-500 hover:text-gray-900 border-b-2 border-transparent hover:border-gray-300 transition whitespace-nowrap"
                >
                  {tab}
                </a>
              ))}
            </div>

            <div className="space-y-10">
              {/* THÔNG TIN TỔNG QUAN */}
              <section id="tổng-quan">
                <h2 className="text-lg font-bold text-gray-900 mb-5">Thông tin tổng quan</h2>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-4 md:grid-cols-4">
                  <div className="flex flex-col items-center justify-center gap-3 rounded-2xl border border-gray-200 p-4 text-center sm:p-5">
                    <Maximize className="h-7 w-7 text-gray-400" />
                    <div className="space-y-0.5">
                      <p className="text-[13px] text-gray-500 font-medium">Diện tích</p>
                      <p className="font-bold text-gray-900">{room.area} m²</p>
                    </div>
                  </div>
                  <div className="flex flex-col items-center justify-center gap-3 rounded-2xl border border-gray-200 p-4 text-center sm:p-5">
                    <LayoutTemplate className="h-7 w-7 text-gray-400" />
                    <div className="space-y-0.5">
                      <p className="text-[13px] text-gray-500 font-medium">Thiết kế</p>
                      <p className="font-bold text-gray-900">{room.hasMezzanine ? 'Gác lửng' : 'Tiêu chuẩn'}</p>
                    </div>
                  </div>
                  <div className="flex flex-col items-center justify-center gap-3 rounded-2xl border border-gray-200 p-4 text-center sm:p-5">
                    <Box className="h-7 w-7 text-gray-400" />
                    <div className="space-y-0.5">
                      <p className="text-[13px] text-gray-500 font-medium">Tiện ích phụ</p>
                      <p className="font-bold text-gray-900">{room.hasBalcony ? 'Ban công' : 'Không có'}</p>
                    </div>
                  </div>
                  <div className="flex flex-col items-center justify-center gap-3 rounded-2xl border border-gray-200 p-4 text-center sm:p-5">
                    <Users className="h-7 w-7 text-gray-400" />
                    <div className="space-y-0.5">
                      <p className="text-[13px] text-gray-500 font-medium">Số lượng người</p>
                      <p className="font-bold text-gray-900">{room.maxOccupants ? `Tối đa ${room.maxOccupants}` : 'Không giới hạn'}</p>
                    </div>
                  </div>
                </div>
              </section>

              {/* VỊ TRÍ (MAP) */}
              <section id="vị-trí" className="pt-8 border-t">
                <h2 className="text-lg font-bold text-gray-900 mb-4">Vị trí & Bản đồ</h2>
                
                {((room as any)?.latitude && (room as any)?.longitude) ? (
                  <div className="bg-gray-100 rounded-[20px] h-[400px] flex border border-gray-200 relative overflow-hidden shadow-sm">
                    {/* The Map itself */}
                    <div className="absolute inset-0 z-0">
                      <MapContainer
                        center={[(room as any).latitude, (room as any).longitude]}
                        zoom={15}
                        className="w-full h-full"
                        scrollWheelZoom={false}
                      >
                        <TileLayer
                          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                        />
                        <Marker position={[(room as any).latitude, (room as any).longitude]} icon={customMarkerIcon}>
                          <Popup className="font-semibold text-sm">{room.propertyName || "Vị trí phòng"}</Popup>
                        </Marker>
                      </MapContainer>
                    </div>

                    {/* Floating Info Card */}
                    <div className="z-10 absolute bottom-4 left-4 right-4 sm:left-auto sm:right-4 sm:w-[320px] bg-white/95 p-5 rounded-2xl shadow-xl backdrop-blur-md">
                      <div className="flex items-start gap-3">
                        <MapPin className="h-6 w-6 text-red-500 shrink-0 mt-0.5" />
                        <div>
                          <p className="font-bold text-gray-900 mb-1 line-clamp-1">{room.propertyName || "Vị trí phòng"}</p>
                          <p className="text-sm text-gray-600 mb-3 line-clamp-2">{(room.propertyAddress || room.address)?.replace(/^,\s*/, '')}</p>
                          <Button size="sm" variant="outline" className="w-full bg-white hover:bg-muted/40 border-gray-300 font-medium h-9 text-xs" onClick={handleGetDirections}>
                            Chỉ đường tới đây
                          </Button>
                        </div>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="bg-gray-100 rounded-[20px] h-[300px] flex items-center justify-center border border-gray-200 relative overflow-hidden shadow-sm">
                     <div className="absolute inset-0 bg-[url('https://maps.gstatic.com/mapfiles/maps_lite/pwa/twa/maps_desktop_2024.png')] bg-cover bg-center opacity-30"></div>
                     <div className="z-10 flex flex-col items-center bg-white/95 p-6 rounded-2xl shadow-lg text-center w-full max-w-md mx-4 backdrop-blur-sm">
                        <MapPin className="h-10 w-10 text-red-500 mb-3" />
                        <p className="font-bold text-gray-900 mb-2 line-clamp-2 text-lg">{room.propertyName || "Vị trí phòng"}</p>
                        <p className="text-[15px] text-gray-600 mb-6 line-clamp-2">{(room.propertyAddress || room.address)?.replace(/^,\s*/, '')}</p>
                        <Button variant="outline" className="w-full h-11 bg-white hover:bg-muted/40 border-gray-200 font-semibold" onClick={handleGetDirections}>
                          Chỉ đường tới đây
                        </Button>
                     </div>
                  </div>
                )}
              </section>

              {/* TIỆN NGHI PHÒNG */}
              {amenities.length > 0 && (
                <section id="tiện-ích" className="pt-8 border-t">
                  <h2 className="text-lg font-bold text-gray-900 mb-5">Tiện nghi phòng</h2>
                  <div className="flex flex-wrap gap-3">
                    {amenities.map((a, i) => {
                      const lowerA = a.toLowerCase();
                      let Icon = Sparkles;
                      if (lowerA.includes('sofa')) Icon = Sofa;
                      else if (lowerA.includes('tv') || lowerA.includes('tivi')) Icon = Tv;
                      else if (lowerA.includes('wifi') || lowerA.includes('internet')) Icon = Wifi;
                      else if (lowerA.includes('giường') || lowerA.includes('nệm')) Icon = BedDouble;
                      else if (lowerA.includes('xe') || lowerA.includes('parking')) Icon = Car;

                      return (
                        <div key={i} className="flex items-center gap-2.5 border border-gray-200 rounded-full px-4 py-2 text-sm font-medium text-gray-700 bg-white shadow-sm hover:border-[#A67C52] transition cursor-default">
                          <Icon className="h-4 w-4 text-gray-400" />
                          <span>{a}</span>
                        </div>
                      );
                    })}
                  </div>
                </section>
              )}

              {/* MÔ TẢ PHÒNG */}
              {room.description && (
                <section id="mô-tả" className="pt-8 border-t">
                  <h2 className="text-lg font-bold text-gray-900 mb-4">Mô tả phòng</h2>
                  <div className="relative">
                    <p className={`text-[15px] text-gray-600 leading-relaxed whitespace-pre-line ${!isExpanded ? "line-clamp-4" : ""}`}>
                      {room.description}
                    </p>
                    <button 
                      onClick={() => setIsExpanded(!isExpanded)}
                      className="mt-2 text-[#A67C52] font-semibold text-sm hover:underline"
                    >
                      {isExpanded ? "Thu gọn" : "Xem thêm"}
                    </button>
                  </div>
                </section>
              )}

              {/* ĐIỀU KHOẢN VÀ NỘI QUY */}
              {room.defaultTerms && (
                <section id="nội-quy" className="pt-8 border-t">
                  <h2 className="text-lg font-bold text-gray-900 mb-4">Nội quy & Điều khoản</h2>
                  <div className="text-[15px] text-gray-600 leading-relaxed whitespace-pre-line p-5 rounded-2xl border border-gray-100 bg-muted/40">
                    {room.defaultTerms}
                  </div>
                </section>
              )}
            </div>
          </div>

          {/* ===== CỘT PHẢI: Hành động ===== */}
          <div className="lg:col-span-1">
            <div className="sticky top-24 space-y-6">

              {/* BOOKING CARD */}
              {user?.role === 'ADMIN' ? (
                <div className="bg-blue-50 rounded-[24px] border-2 border-blue-200 p-6 space-y-4">
                  <div className="flex items-center gap-3">
                    <ShieldCheck className="h-6 w-6 text-blue-600" />
                    <p className="font-bold text-blue-800">Chế độ Quản trị viên</p>
                  </div>
                  <p className="text-sm text-blue-700">
                    Bạn đang xem phòng dưới quyền Quản trị viên để xác minh thông tin. Các chức năng đặt lịch, báo cáo và liên hệ đã bị ẩn.
                  </p>
                </div>
              ) : isMaintenance ? (
                <div className="bg-red-50 rounded-[24px] border-2 border-red-200 p-6 space-y-4">
                  <div className="flex items-center gap-3">
                    <XCircle className="h-6 w-6 text-red-500" />
                    <p className="font-bold text-red-800">Phòng không khả dụng</p>
                  </div>
                  <p className="text-sm text-red-700">
                    Phòng đang bảo trì hoặc đã bị gỡ do vi phạm. Các chức năng đặt lịch, liên hệ và thuê phòng đã bị tạm dừng.
                  </p>
                  <Link to="/properties" className="block">
                    <Button className="w-full h-11 bg-red-600 hover:bg-red-700 text-white font-bold rounded-xl">
                      <ArrowLeft className="h-4 w-4 mr-2" /> Tìm phòng khác
                    </Button>
                  </Link>
                </div>
              ) : (
              <div className="bg-white rounded-[24px] border border-gray-100 shadow-[0_8px_30px_rgb(0,0,0,0.04)] p-6 space-y-5">
                <div className="pb-5 border-b border-gray-100 space-y-1">
                  <div className="flex items-end gap-1">
                    <p className="text-3xl font-extrabold text-[#A67C52]">{formatPrice(room.price)}</p>
                    <p className="text-sm font-medium text-gray-500 mb-1">/ tháng</p>
                  </div>
                  <p className="text-[13px] text-gray-500 flex items-center gap-1.5 font-medium">
                    <Maximize className="h-3.5 w-3.5" /> {room.area} m²
                  </p>
                </div>

                <div className="space-y-3">
                  <Button
                    className="w-full h-12 bg-white text-gray-800 border border-gray-300 hover:bg-muted/40 font-bold rounded-xl text-base shadow-sm"
                    disabled={isReserved || isMaintenance || (!isAvailable && !room.availableFromDate)}
                    onClick={handleBooking}
                  >
                    <CalendarClock className="h-5 w-5 mr-2" />
                    {getBookingButtonText()}
                  </Button>

                  {(isAvailable || room.availableFromDate) && user?.role !== "LANDLORD" && (
                    <Button
                      className="w-full h-12 bg-[#A67C52] hover:bg-[#8e6944] text-white font-bold rounded-xl text-base shadow-sm"
                      onClick={handleRentNow}
                    >
                      <FileSignature className="h-5 w-5 mr-2" />
                      {room.availableFromDate && !isAvailable ? `Đặt trước phòng này` : 'Thuê ngay'}
                    </Button>
                  )}

                  <Button
                    variant="outline"
                    className="w-full h-12 border-gray-200 text-gray-700 hover:bg-muted/40 font-medium rounded-xl"
                    onClick={handleAskAI}
                  >
                    <Bot className="h-5 w-5 mr-2 text-[#A67C52]" />
                    Hỏi AI về phòng này
                  </Button>
                  
                  <div className="grid grid-cols-2 gap-2 mt-2">
                    <Button
                      variant="outline"
                      className={`h-11 border-gray-200 font-medium rounded-xl transition-all ${isFavorite(room.id) ? 'bg-red-50 text-red-500 border-red-200 hover:bg-red-100 hover:text-red-600' : 'text-gray-700 hover:bg-muted/40'}`}
                      onClick={() => {
                        if (!isAuthenticated) {
                          setLoginModalConfig({
                            title: "Yêu cầu đăng nhập",
                            message: "Vui lòng đăng nhập để lưu phòng yêu thích!"
                          });
                          setIsLoginModalOpen(true);
                          return;
                        }
                        toggleFavorite(room.id);
                      }}
                    >
                      <Heart className={`h-4 w-4 mr-2 ${isFavorite(room.id) ? 'fill-current' : ''}`} />
                      Yêu thích
                    </Button>

                    <Button
                      variant="outline"
                      className={`h-11 border-gray-200 font-medium rounded-xl transition-all ${isInCompare(room.id) ? 'bg-blue-50 text-blue-600 border-blue-200 hover:bg-blue-100 hover:text-blue-600' : 'text-gray-700 hover:bg-muted/40'}`}
                      onClick={() => addToCompare(room as any)}
                    >
                      <GitCompareArrows className="h-4 w-4 mr-2" />
                      So sánh
                    </Button>

                    <Button
                      variant="outline"
                      className="h-11 border-gray-200 font-medium rounded-xl text-gray-700 hover:bg-muted/40 transition-all"
                      onClick={handleShare}
                    >
                      <Share2 className="h-4 w-4 mr-2" />
                      Chia sẻ
                    </Button>

                    <Button
                      variant="outline"
                      className="h-11 border-gray-200 font-medium rounded-xl text-gray-700 hover:bg-red-50 hover:text-red-600 hover:border-red-200 transition-all"
                      onClick={handleReportClick}
                    >
                      <Flag className="h-4 w-4 mr-2" />
                      Báo cáo
                    </Button>
                  </div>
                </div>

                <div className="pt-5 border-t border-gray-100 space-y-3.5">
                  <div className="flex justify-between items-center text-[13px]">
                    <span className="flex items-center gap-2.5 text-gray-500 font-medium">
                      <Users className="h-4 w-4 text-blue-400"/> Trạng thái
                    </span>
                    <span className="font-semibold text-gray-900">{isAvailable ? 'Còn trống' : 'Đã có người thuê'}</span>
                  </div>
                  <div className="flex justify-between items-center text-[13px]">
                    <span className="flex items-center gap-2.5 text-gray-500 font-medium">
                      <FileSignature className="h-4 w-4 text-orange-400"/> Đặt cọc
                    </span>
                    <span className="font-semibold text-gray-900">1 tháng</span>
                  </div>
                  {room.elecPrice && (
                    <div className="flex justify-between items-center text-[13px]">
                      <span className="flex items-center gap-2.5 text-gray-500 font-medium">
                        <Zap className="h-4 w-4 text-yellow-500"/> Điện
                      </span>
                      <span className="font-semibold text-gray-900">{room.elecPrice.toLocaleString()}đ/kWh</span>
                    </div>
                  )}
                  {room.waterPrice && (
                    <div className="flex justify-between items-center text-[13px]">
                      <span className="flex items-center gap-2.5 text-gray-500 font-medium">
                        <Droplets className="h-4 w-4 text-blue-500"/> Nước
                      </span>
                      <span className="font-semibold text-gray-900">{room.waterPrice.toLocaleString()}đ/khối</span>
                    </div>
                  )}
                  {room.internetPrice && (
                    <div className="flex justify-between items-center text-[13px]">
                      <span className="flex items-center gap-2.5 text-gray-500 font-medium">
                        <Wifi className="h-4 w-4 text-[#A67C52]"/> Internet
                      </span>
                      <span className="font-semibold text-gray-900">{room.internetPrice.toLocaleString()}đ/tháng</span>
                    </div>
                  )}
                </div>
              </div>
              )}

              {/* Liên hệ chủ nhà (ẩn khi phòng MAINTENANCE hoặc chế độ ADMIN) */}
              {!isMaintenance && user?.role !== 'ADMIN' && (room as any).landlordPhone && (
                <div className="bg-white rounded-2xl border p-4 space-y-3">
                  <p className="text-xs font-bold uppercase text-gray-400 tracking-wider">Liên hệ chủ nhà</p>
                  <p className="font-bold text-gray-900">{room.landlordName || "Chủ nhà"}</p>
                  <div className="grid grid-cols-2 gap-2">
                    <Button 
                      variant="outline" 
                      size="sm" 
                      className="gap-1.5 text-green-700 border-green-200 hover:bg-green-50"
                      onClick={() => {
                        if (!isAuthenticated && !showFullPhone) {
                          handleShowPhone();
                        } else {
                          window.location.href = `tel:${(room as any).landlordPhone}`;
                        }
                      }}
                    >
                      <Phone className="h-3.5 w-3.5" /> 
                      {(!isAuthenticated && !showFullPhone) ? maskPhone((room as any).landlordPhone) : "Gọi điện"}
                    </Button>
                    <Button 
                      variant="outline" 
                      size="sm" 
                      className="gap-1.5 text-blue-600 border-blue-200 hover:bg-blue-50"
                      onClick={() => {
                        if (!isAuthenticated && !showFullPhone) {
                          handleShowPhone();
                        } else {
                          window.open(`https://zalo.me/${(room as any).landlordPhone}`, "_blank");
                        }
                      }}
                    >
                      <MessageSquare className="h-3.5 w-3.5" /> Zalo
                    </Button>
                  </div>
                </div>
              )}

              {/* Các liên kết bổ sung có thể để ở đây */}

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
            <div className="flex flex-wrap items-start justify-between gap-2 border-b bg-muted/40 p-5 sm:items-center">
              <h2 className="flex min-w-0 items-center gap-2 text-lg font-bold text-gray-900">
                <CalendarClock className="h-5 w-5 shrink-0 text-primary" /> Đặt lịch xem phòng
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
            <div className="p-5 bg-muted/40 border-t flex justify-end gap-3">
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
      {/* ===== LOGIN REQUIRED MODAL ===== */}
      <LoginRequiredModal
        isOpen={isLoginModalOpen}
        onClose={() => setIsLoginModalOpen(false)}
        title={loginModalConfig.title}
        message={loginModalConfig.message}
      />

      <ReportRoomModal
        isOpen={isReportModalOpen}
        onClose={() => setIsReportModalOpen(false)}
        room={room}
      />
    </div>
  );
}
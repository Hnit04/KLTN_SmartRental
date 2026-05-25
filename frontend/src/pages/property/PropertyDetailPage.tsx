import { useEffect, useState, useMemo } from "react";
import { useParams, Link } from "react-router-dom";
import {
  MapPin, Zap, Droplets, Wifi, ShieldCheck,
  User, Phone, MessageSquare, Bot, CalendarClock, X, Loader2, Star,
  ChevronLeft, ChevronRight, SlidersHorizontal, Home
} from "lucide-react";
import { propertyApi } from "@/api/propertyApi";
import { tenantPreferenceApi } from "@/api/tenantPreferenceApi";
import { appointmentApi } from "@/api/appointmentApi";
import { reviewApi } from '@/api/reviewApi';
import { useAuth } from "@/context/AuthContext";
import type { Property, Room, ReviewResponse, TenantPreference } from "@/types/index";
import RoomCard from "@/features/property/components/RoomCard";
import LoadingSpinner from "@/components/shared/LoadingSpinner";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import StatusBadge from "@/components/shared/StatusBadge";
import { toast } from "sonner";
import LoginRequiredModal from "@/components/shared/LoginRequiredModal";
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

const ROOM_PREF_WEIGHT_PRICE = 0.55;
const ROOM_PREF_WEIGHT_AMENITY = 0.30;
const ROOM_PREF_WEIGHT_PET = 0.15;

const PET_FORBID_KEYWORDS = [
  "khong nuoi thu cung",
  "cam thu cung",
  "khong cho nuoi pet",
  "khong pet",
  "khong duoc nuoi"
];

const PET_ALLOW_KEYWORDS = [
  "cho nuoi thu cung",
  "duoc nuoi thu cung",
  "pet friendly",
  "cho nuoi pet",
  "duoc nuoi pet",
  "co the nuoi thu cung"
];

function clamp01(value: number): number {
  return Math.max(0, Math.min(1, value));
}

function normalizeText(input?: string | null): string {
  if (!input) return "";
  return input
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function parsePreferenceAmenities(raw?: string): string[] {
  if (!raw) return [];
  return raw
    .split(/[;,|]/)
    .map(normalizeText)
    .filter(Boolean);
}

function parseRoomAmenities(room: Room): string[] {
  if (!room) return [];
  if (Array.isArray(room.amenities)) {
    return room.amenities.map((item) => normalizeText(String(item))).filter(Boolean);
  }
  if (typeof room.amenities === "string") {
    try {
      const parsed = JSON.parse(room.amenities);
      if (Array.isArray(parsed)) {
        return parsed.map((item) => normalizeText(String(item))).filter(Boolean);
      }
    } catch {
      return (room.amenities as unknown as string)
        .split(/[;,|]/)
        .map(normalizeText)
        .filter(Boolean);
    }
  }
  return [];
}

function computeRoomPriceFit(roomPrice?: number, min?: number, max?: number): number {
  if (roomPrice == null || min == null || max == null || max < min || min < 0) return 0;
  const targetAvg = (min + max) / 2;
  let effectiveRange = Math.max(max - min, targetAvg * 0.15);
  if (effectiveRange <= 0) {
    effectiveRange = Math.max(1, roomPrice * 0.15);
  }
  return clamp01(1 - Math.abs(roomPrice - targetAvg) / effectiveRange);
}

function computeRoomAmenityFit(room: Room, requestedAmenities: string[]): number {
  if (!requestedAmenities.length) return 0;
  const roomAmenities = parseRoomAmenities(room);
  if (!roomAmenities.length) return 0;

  let matched = 0;
  for (const expected of requestedAmenities) {
    const hit = roomAmenities.some((actual) => actual.includes(expected) || expected.includes(actual));
    if (hit) matched++;
  }
  return clamp01(matched / requestedAmenities.length);
}

function computeRoomPetFit(room: Room): number {
  const amenities = parseRoomAmenities(room).join(" ");
  const combined = normalizeText(`${amenities} ${room.defaultTerms || ""} ${room.description || ""}`);

  for (const keyword of PET_FORBID_KEYWORDS) {
    if (combined.includes(keyword)) return 0;
  }
  for (const keyword of PET_ALLOW_KEYWORDS) {
    if (combined.includes(keyword)) return 1;
  }
  return 0.5;
}

function computeRoomPreferenceScore(room: Room, preference: TenantPreference | null): number {
  if (!preference) return 0;

  let weighted = 0;
  let activeWeightSum = 0;

  const hasPricePref =
    preference.targetPriceMin != null &&
    preference.targetPriceMax != null &&
    preference.targetPriceMax >= preference.targetPriceMin &&
    preference.targetPriceMin >= 0;

  if (hasPricePref) {
    const priceFit = computeRoomPriceFit(room.price, preference.targetPriceMin, preference.targetPriceMax);
    weighted += ROOM_PREF_WEIGHT_PRICE * priceFit;
    activeWeightSum += ROOM_PREF_WEIGHT_PRICE;
  }

  const requestedAmenities = parsePreferenceAmenities(preference.amenitiesRef);
  if (requestedAmenities.length) {
    const amenityFit = computeRoomAmenityFit(room, requestedAmenities);
    weighted += ROOM_PREF_WEIGHT_AMENITY * amenityFit;
    activeWeightSum += ROOM_PREF_WEIGHT_AMENITY;
  }

  if (preference.hasPet === true) {
    const petFit = computeRoomPetFit(room);
    weighted += ROOM_PREF_WEIGHT_PET * petFit;
    activeWeightSum += ROOM_PREF_WEIGHT_PET;
  }

  if (activeWeightSum <= 0) return 0;
  return clamp01(weighted / activeWeightSum);
}

export default function PropertyDetailPage() {
  const { id } = useParams();
  const { isAuthenticated, user } = useAuth();

  const [property, setProperty] = useState<Property | null>(null);
  const [rooms, setRooms] = useState<Room[]>([]);
  const [tenantPreference, setTenantPreference] = useState<TenantPreference | null>(null);
  const [reviews, setReviews] = useState<ReviewResponse[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // --- STATE LIGHTBOX ---
  const [lightboxIndex, setLightboxIndex] = useState(0);

  // --- STATE FILTER PHÒNG ---
  const [roomSortBy, setRoomSortBy] = useState<"default" | "price_asc" | "price_desc" | "area_asc">("default");
  const [roomStatusFilter, setRoomStatusFilter] = useState<"ALL" | "AVAILABLE" | "RESERVED" | "RENTED" | "MAINTENANCE">("ALL");
  const [showRoomFilter, setShowRoomFilter] = useState(false);

  // --- STATE CHO MODAL ĐẶT LỊCH ---
  const [selectedRoom, setSelectedRoom] = useState<Room | null>(null);
  const [isBookingModalOpen, setIsBookingModalOpen] = useState(false);
  const [meetDate, setMeetDate] = useState("");
  const [meetTime, setMeetTime] = useState("");
  const [note, setNote] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);
  const [loginModalConfig, setLoginModalConfig] = useState({ title: "", message: "" });
  const [showFullPhone, setShowFullPhone] = useState(false);

  // --- FETCH DATA ---
  // --- FETCH DATA ---
  useEffect(() => {
    const fetchData = async () => {
      if (!id) return;
      setIsLoading(true);
      try {
        const preferencePromise =
          isAuthenticated && user?.role === "TENANT"
            ? tenantPreferenceApi.getPreference().catch(() => ({ data: null }))
            : Promise.resolve({ data: null });

        const [propRes, roomRes, prefRes] = await Promise.all([
          propertyApi.getDetail(id),
          propertyApi.getRooms(id),
          preferencePromise
        ]);

        const propertyData = propRes.data as unknown as Property;
        setProperty(propertyData);
        setRooms(roomRes.data as unknown as Room[]);
        setTenantPreference((prefRes as { data?: TenantPreference })?.data ?? null);

        // ✅ GỌI THẲNG API LẤY REVIEW THEO PROPERTY ID (KHU TRỌ)
        try {
          // Truyền thẳng biến id của khu trọ vào API mới
          const reviewRes = await reviewApi.getReviewsByProperty(id);

          // Bóc tách nhiều lớp bọc của Spring Boot & Axios
          let finalReviewData = (reviewRes as { data?: unknown })?.data !== undefined ? (reviewRes as { data?: unknown }).data : reviewRes;

          if ((finalReviewData as { data?: unknown })?.data) finalReviewData = (finalReviewData as { data?: unknown }).data;
          if ((finalReviewData as { content?: unknown })?.content) finalReviewData = (finalReviewData as { content?: unknown }).content;

          if (Array.isArray(finalReviewData)) {
            setReviews(finalReviewData);
          } else {
            setReviews([]);
          }
        } catch (reviewErr) {
          console.error("Lỗi khi tải Đánh giá:", reviewErr);
          setReviews([]);
        }

      } catch {
        toast.error("Không thể tải thông tin khu trọ.");
      } finally {
        setIsLoading(false);
      }
    };
    fetchData();
  }, [id, isAuthenticated, user?.role]);

  // --- HANDLERS ---
  const maskPhone = (phone: string) => {
    if (!phone) return "";
    if (showFullPhone || isAuthenticated) return phone;
    return phone.substring(0, phone.length - 3) + "xxx";
  };

  const handleShowPhone = (action: "call" | "zalo") => {
    if (!isAuthenticated) {
      setLoginModalConfig({
        title: action === "call" ? "Xem số điện thoại" : "Chat Zalo",
        message: `Vui lòng đăng nhập để ${action === "call" ? "liên hệ trực tiếp" : "nhắn tin Zalo"} cho chủ nhà.`
      });
      setIsLoginModalOpen(true);
      return;
    }
    setShowFullPhone(true);
  };

  const handleCall = () => {
    const phone = property?.landlordPhone;
    if (!phone) return toast.error("Chủ nhà chưa cập nhật số điện thoại liên hệ.");

    if (!isAuthenticated && !showFullPhone) {
      handleShowPhone("call");
      return;
    }
    window.location.href = `tel:${phone}`;
  };

  const handleZalo = () => {
    const phone = property?.landlordPhone;
    if (!phone) return toast.error("Chủ nhà chưa cập nhật số điện thoại Zalo.");

    if (!isAuthenticated && !showFullPhone) {
      handleShowPhone("zalo");
      return;
    }
    window.open(`https://zalo.me/${phone}`, '_blank');
  };

  const handleAskAI = () => {
    if (!property) return;

    // Tính giá phòng min-max từ danh sách rooms
    const availableRooms = rooms.filter(r => r.status === "AVAILABLE");
    const prices = rooms.map(r => r.price).filter(Boolean);
    const minPrice = prices.length > 0 ? Math.min(...prices) : 0;
    const maxPrice = prices.length > 0 ? Math.max(...prices) : 0;

    const details = [
      `Tên khu trọ: "${property.name}"`,
      `Địa chỉ: ${property.address}, ${property.district}, ${property.city}`,
      `Tổng số phòng: ${rooms.length} (Còn trống: ${availableRooms.length})`,
      prices.length > 0 ? `Khoảng giá: ${minPrice.toLocaleString('vi-VN')}đ - ${maxPrice.toLocaleString('vi-VN')}đ/tháng` : '',
      property.elecPrice ? `Giá điện: ${property.elecPrice.toLocaleString()}đ/kWh` : '',
      property.waterPrice ? `Giá nước: ${property.waterPrice.toLocaleString()}đ/khối` : '',
      property.internetPrice ? `Internet: ${property.internetPrice.toLocaleString()}đ/tháng` : '',
      property.description ? `Mô tả: ${property.description.substring(0, 300)}` : '',
      reviews.length > 0 ? `Đánh giá: ${avgRating.toFixed(1)}/5 sao (${reviews.length} lượt)` : 'Chưa có đánh giá',
    ].filter(Boolean).join('. ');

    const question = `Hãy phân tích chi tiết ưu điểm và nhược điểm của khu trọ sau đây, đánh giá giá dịch vụ có hợp lý không, và đưa ra lời khuyên cho người thuê:\n${details}`;
    const shortText = `Tư vấn về khu trọ "${property.name}" giúp mình nhé! 🏠`;
    window.dispatchEvent(new CustomEvent('openAiChat', { detail: { question, autoSend: true, displayText: shortText } }));
  };

  const handleOpenBookingModal = (room: Room) => {
    if (!isAuthenticated) {
      setLoginModalConfig({
        title: "Đặt lịch xem phòng",
        message: "Bạn cần đăng nhập để đặt lịch hẹn và trao đổi với chủ nhà."
      });
      setIsLoginModalOpen(true);
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
    } catch (error: unknown) {
      const err = error as { response?: { data?: { message?: string } } };
      toast.error(err.response?.data?.message || "Có lỗi xảy ra khi đặt lịch.");
    } finally {
      setIsSubmitting(false);
    }
  };

  // --- COMPUTED: FILTER & SORT PHÒNG ---
  const hasRoomPreferenceSignals = useMemo(() => {
    if (!tenantPreference) return false;
    const hasPrice =
      tenantPreference.targetPriceMin != null &&
      tenantPreference.targetPriceMax != null &&
      tenantPreference.targetPriceMax >= tenantPreference.targetPriceMin &&
      tenantPreference.targetPriceMin >= 0;
    const hasAmenities = parsePreferenceAmenities(tenantPreference.amenitiesRef).length > 0;
    const hasPet = tenantPreference.hasPet === true;
    return hasPrice || hasAmenities || hasPet;
  }, [tenantPreference]);

  const roomPreferenceScoreMap = useMemo(() => {
    const scoreMap = new Map<number, number>();
    for (const room of rooms) {
      scoreMap.set(room.id, computeRoomPreferenceScore(room, tenantPreference));
    }
    return scoreMap;
  }, [rooms, tenantPreference]);

  const filteredRooms = useMemo(() => {
    let result = [...rooms];
    if (roomStatusFilter !== "ALL") {
      result = result.filter((r) => r.status === roomStatusFilter);
    }
    switch (roomSortBy) {
      case "price_asc":
        result.sort((a, b) => a.price - b.price);
        break;
      case "price_desc":
        result.sort((a, b) => b.price - a.price);
        break;
      case "area_asc":
        result.sort((a, b) => a.area - b.area);
        break;
      case "default":
      default:
        if (hasRoomPreferenceSignals) {
          result.sort((a, b) => {
            const scoreA = roomPreferenceScoreMap.get(a.id) ?? 0;
            const scoreB = roomPreferenceScoreMap.get(b.id) ?? 0;
            if (scoreB !== scoreA) return scoreB - scoreA;

            const availableA = a.status === "AVAILABLE" ? 1 : 0;
            const availableB = b.status === "AVAILABLE" ? 1 : 0;
            if (availableB !== availableA) return availableB - availableA;

            return (a.price ?? 0) - (b.price ?? 0);
          });
        }
        break;
    }
    return result;
  }, [rooms, roomSortBy, roomStatusFilter, hasRoomPreferenceSignals, roomPreferenceScoreMap]);

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

  const activeRoomFilters = [
    roomStatusFilter !== "ALL" ? { key: "status", label: `Trang thai: ${roomStatusFilter}` } : null,
    roomSortBy !== "default" ? { key: "sort", label: `Sap xep: ${roomSortBy}` } : null,
    (roomSortBy === "default" && hasRoomPreferenceSignals)
      ? { key: "pref", label: "Uu tien phong phu hop so thich" }
      : null,
  ].filter(Boolean) as { key: string; label: string }[];

  return (
    <div className="min-h-screen overflow-x-hidden bg-background pb-20">
      <div className="mx-auto min-w-0 max-w-7xl px-4 py-8 md:px-6">
        {/* Breadcrumb */}
        <div className="flex items-center gap-2 text-sm text-gray-500 mb-6">
          <Link to="/properties" className="hover:text-primary transition">Tìm khu trọ</Link>
          <span><ChevronRight className="h-3.5 w-3.5" /></span>
          <span className="text-gray-800 font-medium line-clamp-1">{property.name}</span>
        </div>

        {/* MAIN CONTENT GRID */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 lg:gap-12">

          {/* CỘT TRÁI */}
          <div className="lg:col-span-2">

            {/* Header - Title & Address */}
            <div className="mb-6">
              <h1 className="text-3xl font-bold text-gray-900 mb-2">{property.name}</h1>
              <div className="flex min-w-0 items-center text-gray-500 text-[15px]">
                <MapPin className="h-5 w-5 mr-1.5 shrink-0 text-[#A67C52]" />
                <span className="min-w-0 break-words">{property.address}, {property.district}, {property.city}</span>
              </div>
            </div>

            {/* HERO GALLERY */}
            <div className="mb-8 relative group">
              <div className="relative">
                {/* Main Image */}
                <div className="relative h-[45vh] md:h-[55vh] bg-gray-100 rounded-[20px] overflow-hidden group border border-gray-200">
                  <img
                    src={images[lightboxIndex] || images[0]}
                    alt="Ảnh khu trọ"
                    className="w-full h-full object-cover bg-black/5 cursor-pointer transition-transform duration-500"
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

                  <div className="absolute bottom-4 right-4 bg-black/60 text-white text-xs font-semibold px-3 py-1.5 rounded-lg backdrop-blur-md">
                    {lightboxIndex + 1} / {images.length}
                  </div>
                </div>

                {/* Thumbnails */}
                {images.length > 1 && (
                  <div className="flex gap-2.5 mt-3 overflow-x-auto pb-2 scrollbar-hide">
                    {displayImages.map((img, idx) => (
                      <div
                        key={idx}
                        className={`relative w-24 h-16 rounded-xl overflow-hidden cursor-pointer shrink-0 border-2 transition-all hover:opacity-100 ${idx === lightboxIndex ? 'border-primary opacity-100 shadow-sm' : 'border-transparent opacity-60'}`}
                        onClick={() => setLightboxIndex(idx)}
                      >
                        <img src={img} className="w-full h-full object-cover" alt="" />
                      </div>
                    ))}
                    {images.length > 5 && (
                      <div
                        className="relative w-24 h-16 rounded-xl overflow-hidden shrink-0 border-2 border-transparent bg-black"
                      >
                        <img src={images[4]} className="w-full h-full object-cover opacity-40" alt="" />
                        <div className="absolute inset-0 flex items-center justify-center text-white font-semibold text-sm">
                          +{images.length - 4}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* STICKY NAVIGATION TABS */}
            <div className="sticky top-0 z-40 bg-background/90 backdrop-blur-md border-b mb-8 py-3 px-1">
              <div className="flex items-center gap-6 overflow-x-auto scrollbar-hide">
                {[
                  { id: 'tổng-quan', label: 'Tổng quan' },
                  { id: 'mô-tả', label: 'Mô tả' },
                  { id: 'vị-trí', label: 'Vị trí' },
                  { id: 'danh-sách-phòng', label: 'Phòng trống' },
                  { id: 'đánh-giá', label: 'Đánh giá' },
                ].map((tab) => (
                  <a
                    key={tab.id}
                    href={`#${tab.id}`}
                    className="text-sm font-semibold text-gray-500 hover:text-gray-900 transition-colors whitespace-nowrap py-1 border-b-2 border-transparent hover:border-gray-900"
                  >
                    {tab.label}
                  </a>
                ))}
              </div>
            </div>

            <div id="tổng-quan" className="space-y-8 scroll-mt-24">
              <div className="border-t pt-6">
                <h3 className="font-bold text-lg mb-4 text-foreground">Bảng giá dịch vụ</h3>
                <div className="flex flex-wrap gap-4">
                  <ServiceItem icon={<Zap className="text-yellow-500" />} label="Điện" value={property.elecPrice} unit="kW" />
                  <ServiceItem icon={<Droplets className="text-blue-500" />} label="Nước" value={property.waterPrice} unit="khối" />
                  <ServiceItem icon={<Wifi className="text-indigo-500" />} label="Internet" value={property.internetPrice} unit="tháng" />
                </div>
              </div>

              <div id="mô-tả" className="border-t pt-6 scroll-mt-24">
                <h3 className="font-bold text-lg mb-3 text-foreground">Mô tả chi tiết</h3>
                <div className="text-muted-foreground bg-muted/40 p-5 rounded-xl border leading-relaxed whitespace-pre-line text-sm md:text-base">
                  {property.description || "Chủ nhà chưa cung cấp mô tả chi tiết."}
                </div>
              </div>

              {/* VỊ TRÍ (MAP) */}
              <div id="vị-trí" className="border-t pt-6 scroll-mt-24">
                <h3 className="font-bold text-lg mb-4 text-foreground">Vị trí & Bản đồ</h3>
                {property.latitude && property.longitude ? (
                  <div className="bg-gray-100 rounded-[20px] h-[400px] flex border border-gray-200 relative overflow-hidden shadow-sm">
                    <div className="absolute inset-0 z-0">
                      <MapContainer
                        center={[property.latitude, property.longitude]}
                        zoom={15}
                        className="w-full h-full"
                        scrollWheelZoom={false}
                      >
                        <TileLayer
                          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                        />
                        <Marker position={[property.latitude, property.longitude]} icon={customMarkerIcon}>
                          <Popup className="font-semibold text-sm">{property.name}</Popup>
                        </Marker>
                      </MapContainer>
                    </div>
                    {/* Floating Info Card */}
                    <div className="z-10 absolute bottom-4 left-4 right-4 sm:left-auto sm:right-4 sm:w-[320px] bg-white/95 p-5 rounded-2xl shadow-xl backdrop-blur-md">
                      <div className="flex items-start gap-3">
                        <MapPin className="h-6 w-6 text-red-500 shrink-0 mt-0.5" />
                        <div>
                          <p className="font-bold text-gray-900 mb-1 line-clamp-1">{property.name}</p>
                          <p className="text-sm text-gray-600 mb-3 line-clamp-2">{property.address}, {property.district}</p>
                          <a
                            href={`https://maps.google.com/maps?q=${encodeURIComponent(`${property.address}, ${property.district}, ${property.city}`)}`}
                            target="_blank"
                            rel="noreferrer"
                            className="flex items-center justify-center w-full bg-white hover:bg-muted/40 border border-gray-300 font-medium h-9 text-xs rounded-md transition-colors"
                          >
                            Chỉ đường tới đây
                          </a>
                        </div>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="bg-gray-100 rounded-[20px] h-[300px] flex items-center justify-center border border-gray-200 relative overflow-hidden shadow-sm">
                    <div className="absolute inset-0 bg-[url('https://maps.gstatic.com/mapfiles/maps_lite/pwa/twa/maps_desktop_2024.png')] bg-cover bg-center opacity-30"></div>
                    <div className="z-10 flex flex-col items-center bg-white/95 p-6 rounded-2xl shadow-lg text-center w-full max-w-md mx-4 backdrop-blur-sm">
                      <MapPin className="h-10 w-10 text-red-500 mb-3" />
                      <p className="font-bold text-gray-900 mb-2 line-clamp-2 text-lg">{property.name}</p>
                      <p className="text-[15px] text-gray-600 mb-6 line-clamp-2">{property.address}, {property.district}</p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div> {/* Closes lg:col-span-2 */}

          <div className="lg:col-span-1">
            <div className="sticky top-24 space-y-4">
              {/* THẺ THÔNG TIN CHỦ TRỌ */}
              <div className="rounded-2xl border border-[#A67C52]/20 bg-gradient-to-b from-[#A67C52]/5 to-white p-5 shadow-md">
                <div className="flex items-center gap-4 mb-4">
                  <div className="h-16 w-16 rounded-full overflow-hidden border-2 border-white shadow-sm shrink-0 bg-gray-100 flex items-center justify-center">
                    {property.landlordAvatar ? (
                      <img src={property.landlordAvatar} alt="Chủ trọ" className="h-full w-full object-cover" />
                    ) : (
                      <span className="text-2xl font-bold text-gray-400">
                        {(property.landlordName || "C")?.charAt(0).toUpperCase()}
                      </span>
                    )}
                  </div>
                  <div className="flex-1">
                    <p className="text-xs text-[#A67C52] font-bold uppercase tracking-wider mb-0.5">Chủ nhà</p>
                    <p className="font-bold text-gray-900 text-lg line-clamp-1 leading-tight mb-1">
                      {property.landlordName || "Anh/Chị Chủ"}
                    </p>
                    {/* Điểm uy tín */}
                    <div className="flex items-center gap-1.5 bg-white px-2 py-1 rounded-md border shadow-sm w-fit">
                      <ShieldCheck className={`h-3.5 w-3.5 ${(property.landlordReputationScore || 0) >= 80 ? 'text-green-500' : 'text-yellow-500'}`} />
                      <span className="text-[11px] font-bold text-gray-700">
                        Uy tín: {property.landlordReputationScore || 100}/100
                      </span>
                    </div>
                  </div>
                </div>

                <div className="space-y-3 pt-2">
                  {user?.role === 'ADMIN' ? (
                    <div className="bg-blue-50 text-blue-800 p-4 rounded-xl border border-blue-200">
                      <p className="font-bold mb-1 flex items-center gap-1.5"><ShieldCheck className="h-4 w-4"/> Quản trị viên</p>
                      <p className="text-[13px] text-blue-700">Chế độ xem quản trị. Bạn có thể xem thông tin nhưng không thể đặt phòng.</p>
                      <Button className="w-full mt-3 gap-2 bg-blue-600 hover:bg-blue-700 h-10 text-sm shadow-sm" onClick={handleCall}>
                        <Phone className="h-4 w-4" /> Gọi kiểm tra
                      </Button>
                    </div>
                  ) : user?.role === 'LANDLORD' && user.id === property.landlordId ? (
                    <div className="bg-[#A67C52]/10 text-[#A67C52] p-4 rounded-xl border border-[#A67C52]/20">
                      <p className="font-bold mb-1 flex items-center gap-1.5"><Home className="h-4 w-4"/> Khu trọ của bạn</p>
                      <p className="text-[13px] text-[#A67C52]/80">Đây là khu trọ do bạn quản lý. Bạn không thể tự đặt phòng của mình.</p>
                      <Link to={`/landlord/properties/${property.id}`} className="block mt-3">
                        <Button className="w-full gap-2 bg-[#A67C52] hover:bg-[#8b6540] text-white h-10 text-sm shadow-sm">
                          Quản lý khu trọ này
                        </Button>
                      </Link>
                    </div>
                  ) : (
                    <>
                      <Button className="w-full gap-2 bg-[#A67C52] hover:bg-[#8b6540] h-11 text-base shadow-md shadow-[#A67C52]/20 rounded-xl" onClick={handleCall}>
                        <Phone className="h-4 w-4" />
                        {(!isAuthenticated && !showFullPhone) ? maskPhone(property.landlordPhone || "") : "Gọi điện ngay"}
                      </Button>
                      <Button variant="outline" className="w-full gap-2 border-blue-200 text-blue-600 hover:bg-blue-50 hover:text-blue-700 hover:border-blue-300 h-11 rounded-xl" onClick={handleZalo}>
                        <MessageSquare className="h-4 w-4" /> Chat qua Zalo
                      </Button>
                      <Button variant="outline" className="w-full gap-2 border-gray-200 text-gray-600 hover:bg-muted/40 h-11 rounded-xl shadow-sm" onClick={handleAskAI}>
                        <Bot className="h-4 w-4" /> Hỏi AI về khu trọ này
                      </Button>
                    </>
                  )}

                  {property.landlordUsername && (
                    <Link to={`/landlord/${property.landlordUsername}/properties`} className="block">
                      <Button variant="outline" className="w-full gap-2 border-[#A67C52]/30 text-[#8b6540] hover:bg-[#A67C52]/5 h-11 rounded-xl">
                        <User className="h-4 w-4" /> Xem tất cả khu trọ của chủ này
                      </Button>
                    </Link>
                  )}
                  {!property.landlordUsername && (
                    <p className="px-1 text-xs text-muted-foreground">
                      Chủ trọ chưa công khai hồ sơ khu trọ.
                    </p>
                  )}
                </div>
              </div>


            </div>
          </div>
        </div>

        {/* 2. DANH SÁCH PHÒNG */}
        <div id="danh-sách-phòng" className="page-shell py-10 scroll-mt-20">
          <div className="section-card p-4 md:p-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-4 gap-4">
              <h2 className="text-2xl font-bold text-foreground">
                Danh sách phòng trống
                <span className="ml-2 text-base font-normal text-gray-500">({filteredRooms.length}/{rooms.length})</span>
              </h2>
              <div className="flex items-center gap-3">
                <StatusBadge label="Tin đăng đã xác thực" tone="success" className="text-sm font-medium" />
                <button
                  onClick={() => setShowRoomFilter(!showRoomFilter)}
                  className={`flex items-center gap-1.5 text-sm px-3 py-1.5 rounded-lg border transition ${showRoomFilter ? 'bg-primary text-white border-primary' : 'border-gray-200 text-gray-600 hover:bg-muted/40'
                    }`}
                >
                  <SlidersHorizontal className="h-4 w-4" /> Lọc phòng
                </button>
              </div>
            </div>

            {/* PANEL LỌC PHÒNG */}
            {showRoomFilter && (
              <div className="rounded-xl border bg-card p-4 mb-6 flex flex-wrap gap-6 items-end animate-in slide-in-from-top-2 duration-200">
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-gray-600 uppercase">Trạng thái</label>
                  <div className="flex gap-2">
                    {(["ALL", "AVAILABLE", "RESERVED", "MAINTENANCE", "RENTED"] as const).map(s => (
                      <button
                        key={s}
                        onClick={() => setRoomStatusFilter(s)}
                        className={`px-3 py-1 rounded-full text-xs font-medium border transition ${roomStatusFilter === s
                            ? 'bg-primary text-white border-primary'
                            : 'border-gray-200 text-gray-600 hover:bg-muted/40'
                          }`}
                      >
                        {s === "ALL"
                          ? "Tất cả"
                          : s === "AVAILABLE"
                            ? "Còn trống"
                            : s === "RESERVED"
                              ? "Đang giữ chỗ"
                              : s === "MAINTENANCE"
                                ? "Đang bảo trì"
                                : "Đã thuê"
                        }
                      </button>
                    ))}
                  </div>
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-gray-600 uppercase">Sắp xếp</label>
                  <select
                    className="h-9 border border-gray-200 rounded-lg px-3 text-sm focus:ring-2 focus:ring-primary outline-none bg-white"
                    value={roomSortBy}
                    onChange={e => setRoomSortBy(e.target.value as "default" | "price_asc" | "price_desc" | "area_asc")}
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

            {activeRoomFilters.length > 0 && (
              <div className="mb-4 flex flex-wrap items-center gap-2">
                {activeRoomFilters.map((filter) => (
                  <StatusBadge key={filter.key} label={filter.label} tone="info" className="text-xs" />
                ))}
              </div>
            )}

            {filteredRooms.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                {filteredRooms.map((room) => (
                  <div key={room.id} className="h-full">
                    <Link to={`/rooms/${room.id}`} className="block h-full transition-transform hover:scale-[1.01] active:scale-[0.99]">
                      <RoomCard
                        data={room}
                        onBookAppointment={() => handleOpenBookingModal(room)}
                      />
                    </Link>
                  </div>
                ))}
              </div>

            ) : (
              <div className="flex flex-col items-center justify-center py-16 text-center bg-white rounded-2xl border border-dashed">
                <div className="bg-muted/40 p-4 rounded-full mb-3">
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
            <div id="đánh-giá" className="mt-12 rounded-2xl border bg-card p-6 md:p-8 shadow-sm scroll-mt-20">
              <h2 className="text-2xl font-bold text-foreground mb-6 flex items-center gap-2">
                <Star className="h-6 w-6 text-yellow-500 fill-yellow-500" />
                Đánh giá từ người thuê ({reviews.length})
              </h2>

              {reviews.length === 0 ? (
                <div className="text-center py-8 text-gray-500 bg-muted/40 rounded-xl border border-dashed">
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
                        {[1, 2, 3, 4, 5].map(s => (
                          <Star key={s} className={`h-5 w-5 ${s <= Math.round(avgRating) ? 'text-yellow-400 fill-yellow-400' : 'text-gray-300 fill-gray-200'
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
                      <div key={review.id} className="bg-muted/40 rounded-xl p-5 border border-gray-100 hover:shadow-md transition-shadow">
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
        </div>

        {/* 3. MODAL ĐẶT LỊCH XEM PHÒNG */}
        {isBookingModalOpen && selectedRoom && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 overflow-y-auto">
            <div className="bg-white rounded-2xl w-full max-w-md overflow-hidden shadow-2xl animate-in zoom-in-95">
              <div className="flex flex-wrap items-start justify-between gap-2 border-b bg-muted/40 p-5 sm:items-center">
                <h2 className="flex min-w-0 items-center gap-2 text-lg font-bold text-gray-900">
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

              <div className="p-5 bg-muted/40 border-t flex justify-end gap-3">
                <Button variant="outline" onClick={() => setIsBookingModalOpen(false)}>Hủy</Button>
                <Button onClick={handleSubmitBooking} disabled={isSubmitting || !meetDate || !meetTime}>
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
      </div>
    </div>
  );
}

      const ServiceItem = ({ icon, label, value, unit }: { icon: React.ReactNode; label: string; value?: number; unit: string }) => (
      <div className="flex min-w-0 flex-1 basis-[9rem] items-center gap-3 rounded-xl border border-gray-100 bg-white p-3 shadow-sm transition-all hover:border-gray-200 hover:shadow-md sm:min-w-[140px] sm:flex-none">
        <div className="p-2.5 bg-muted/40 rounded-full">{icon}</div>
        <div>
          <p className="text-[10px] text-gray-400 uppercase font-bold tracking-wider">{label}</p>
          <p className="text-sm font-bold text-gray-900">
            {value ? `${value.toLocaleString()}đ` : "Miễn phí"}
            {value && <span className="text-gray-400 text-xs font-normal">/{unit}</span>}
          </p>
        </div>
      </div>
      );

import { useState, useEffect } from "react";
import { Search, MapPin, Frown, Filter, Sparkles, Zap } from "lucide-react";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import PropertyCard from "@/features/property/components/PropertyCard";
import RoomCard from "@/features/property/components/RoomCard";
import { propertyApi } from "@/api/propertyApi";
import type { Property, Room } from "@/types/index";
import { toast } from "sonner";

export default function PropertiesPage() {
  // --- STATE ---
  const [properties, setProperties] = useState<Property[]>([]);
  const [recommendedRooms, setRecommendedRooms] = useState<Room[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  
  // Filter States
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCity, setSelectedCity] = useState("Tất cả");
  const [priceRange, setPriceRange] = useState("all"); // all, <3m, 3m-5m, >5m

  // --- FETCH DATA ---
  useEffect(() => {
    const fetchData = async () => {
      try {
        setIsLoading(true);
        // Chạy song song cả hai API
        const [propsRes, recRoomsRes] = await Promise.allSettled([
          propertyApi.getAll(),
          propertyApi.getRecommendedRooms()
        ]);

        if (propsRes.status === "fulfilled") {
            setProperties(propsRes.value.data as any); 
        }

        // Chỗ này cần log lại lỗi nếu có, nhưng không làm crash trang.
        // Chỉ hiện kết quả recRoomsRes nều gọi API thành công và trả ra mảng.
        if (recRoomsRes.status === "fulfilled" && Array.isArray(recRoomsRes.value.data)) {
            setRecommendedRooms(recRoomsRes.value.data as any);
        }

      } catch (error) {
        console.error("Failed to fetch properties or recommendations:", error);
        toast.error("Không thể tải toàn bộ dữ liệu. Đã có lỗi xảy ra.");
      } finally {
        // Giả lập delay một chút để thấy hiệu ứng Skeleton (có thể bỏ khi chạy thật)
        setTimeout(() => setIsLoading(false), 500);
      }
    };
    fetchData();
  }, []);

  // --- FILTER LOGIC ---
  const filteredProperties = properties.filter(p => {
    // 1. Tìm kiếm text
    const searchLower = searchTerm.toLowerCase();
    const matchesSearch = 
      p.name?.toLowerCase().includes(searchLower) ||
      p.address?.toLowerCase().includes(searchLower) ||
      p.district?.toLowerCase().includes(searchLower);

    // 2. Lọc City
    const matchesCity = selectedCity === "Tất cả" || p.city === selectedCity;

    // 3. Lọc Giá (Giả sử p.minPrice là giá thấp nhất của khu trọ)
    // Lưu ý: Cần đảm bảo p.minPrice là số. Nếu API trả string thì cần parse.
    let matchesPrice = true;
    const price = Number(p.minPrice || 0); 
    
    if (priceRange === "under_3") matchesPrice = price < 3000000;
    else if (priceRange === "3_5") matchesPrice = price >= 3000000 && price <= 5000000;
    else if (priceRange === "over_5") matchesPrice = price > 5000000;

    return matchesSearch && matchesCity && matchesPrice;
  });

  return (
    <div className="min-h-screen bg-gray-50/50 pb-20">
      {/* --- HEADER & FILTER --- */}
      <div className="bg-white border-b sticky top-16 z-30 shadow-sm px-4 py-4">
        <div className="container mx-auto max-w-7xl">
          <div className="flex flex-col lg:flex-row justify-between items-end lg:items-center gap-4">
            
            {/* Title */}
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Tìm phòng trọ</h1>
              <p className="text-sm text-gray-500 mt-1">
                {isLoading 
                  ? "Đang cập nhật dữ liệu..." 
                  : `Hiện có ${filteredProperties.length} kết quả phù hợp`
                }
              </p>
            </div>

            {/* Filter Bar */}
            <div className="flex flex-col sm:flex-row w-full lg:w-auto gap-3">
              {/* Search */}
              <div className="relative flex-1 sm:w-64">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input 
                  placeholder="Tìm theo khu vực, tên đường..." 
                  className="pl-9 bg-gray-50 border-gray-200"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>

              {/* City Filter */}
              <div className="relative">
                <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <select 
                  className="h-10 w-full sm:w-40 rounded-md border border-gray-200 bg-gray-50 pl-9 pr-3 text-sm focus:ring-2 focus:ring-primary focus:outline-none appearance-none cursor-pointer hover:bg-white transition-colors"
                  value={selectedCity}
                  onChange={(e) => setSelectedCity(e.target.value)}
                >
                  <option value="Tất cả">Toàn quốc</option>
                  <option value="Hồ Chí Minh">TP.HCM</option>
                  <option value="Hà Nội">Hà Nội</option>
                  <option value="Đà Nẵng">Đà Nẵng</option>
                </select>
              </div>

              {/* Price Filter (Mới) */}
              <div className="relative">
                <Filter className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <select 
                  className="h-10 w-full sm:w-48 rounded-md border border-gray-200 bg-gray-50 pl-9 pr-3 text-sm focus:ring-2 focus:ring-primary focus:outline-none appearance-none cursor-pointer hover:bg-white transition-colors"
                  value={priceRange}
                  onChange={(e) => setPriceRange(e.target.value)}
                >
                  <option value="all">Tất cả mức giá</option>
                  <option value="under_3">Dưới 3 triệu</option>
                  <option value="3_5">Từ 3 - 5 triệu</option>
                  <option value="over_5">Trên 5 triệu</option>
                </select>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* --- DANH SÁCH GỢI Ý CỦA AI (NẾU CÓ) --- */}
      {recommendedRooms.length > 0 && (
        <div className="container mx-auto max-w-7xl px-4 py-8">
          <div className="flex items-center gap-3 border-b pb-4 mb-6">
            <div className="p-2 bg-gradient-to-br from-yellow-100 to-amber-100 rounded-lg text-amber-600">
              <Sparkles className="h-6 w-6" />
            </div>
            <div>
              <h2 className="text-2xl font-bold bg-gradient-to-r from-amber-600 to-orange-500 bg-clip-text text-transparent">
                Phòng Gợi Ý Từ AI
              </h2>
              <p className="text-sm text-muted-foreground mt-1">
                Dựa trên sở thích bạn đã cài đặt, AI tìm thấy {recommendedRooms.length} phòng phù hợp nhất.
              </p>
            </div>
          </div>
          <div className="flex gap-4 overflow-x-auto pb-6 snap-x">
            {recommendedRooms.map((room) => (
              <div key={room.id} className="min-w-[300px] w-[300px] sm:min-w-[350px] sm:w-[350px] snap-start shrink-0">
                 {/* Bọc RoomCard trong 1 relative div để thêm badge "% Phù hợp" nếu có từ API, hiện tại tạm ẩn */}
                <div className="relative h-full">
                   <div className="absolute -top-3 -right-3 z-10 bg-gradient-to-r from-amber-400 to-orange-500 text-white text-xs font-bold px-3 py-1.5 rounded-full shadow-lg border-2 border-white flex items-center gap-1">
                      <Zap className="h-3 w-3" /> Phù hợp nhất
                   </div>
                   <RoomCard data={room} />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* --- LIST CONTENT --- */}
      <div className="container mx-auto max-w-7xl px-4 py-8">
        <h2 className="text-xl font-bold mb-6 text-gray-800 border-b pb-2">Khám Phá Khu Trọ Toàn Quốc</h2>
        {isLoading ? (
          // SKELETON LOADING (Thay cho Spinner xoay)
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {[...Array(8)].map((_, i) => (
              <div key={i} className="bg-white rounded-xl overflow-hidden border shadow-sm h-[320px] animate-pulse">
                <div className="h-48 bg-gray-200" />
                <div className="p-4 space-y-3">
                  <div className="h-4 bg-gray-200 rounded w-3/4" />
                  <div className="h-3 bg-gray-200 rounded w-1/2" />
                  <div className="pt-4 flex justify-between">
                     <div className="h-8 w-20 bg-gray-200 rounded" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : filteredProperties.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            {filteredProperties.map((property) => (
              <PropertyCard key={property.id} data={property} />
            ))}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-20 text-center animate-in fade-in zoom-in duration-300">
            <div className="bg-gray-100 p-6 rounded-full mb-4">
              <Frown className="h-10 w-10 text-gray-400" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900">Không tìm thấy kết quả</h3>
            <p className="text-gray-500 max-w-sm mt-2">
              Thử thay đổi từ khóa hoặc bộ lọc để tìm kiếm lại nhé.
            </p>
            <Button 
              variant="outline" 
              onClick={() => {setSearchTerm(""); setSelectedCity("Tất cả"); setPriceRange("all")}}
              className="mt-4"
            >
              Xóa bộ lọc
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
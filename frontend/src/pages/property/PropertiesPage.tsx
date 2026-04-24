import { useState, useEffect, useMemo } from "react";
import { Search, MapPin, Frown, Filter, Sparkles, ChevronDown, Bot, ArrowUpDown, X, List, Map as MapIcon } from "lucide-react";
import { Checkbox } from "@/components/ui/Checkbox";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import PropertyCard from "@/features/property/components/PropertyCard";
import PropertyMap from "@/features/property/components/PropertyMap";
import RoomCard from "@/features/property/components/RoomCard";
import { propertyApi } from "@/api/propertyApi";
import type { Property, Room } from "@/types/index";
import { toast } from "sonner";

export default function PropertiesPage() {
  // --- STATE ---
  const [properties, setProperties] = useState<Property[]>([]);
  const [page, setPage] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [viewMode, setViewMode] = useState<"list" | "map">("list");
  const [recommendedRooms, setRecommendedRooms] = useState<Room[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  
  // Filter States
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCity, setSelectedCity] = useState("Tất cả");
  const [maxPrice, setMaxPrice] = useState(20000000); // 20 TRIỆU
  const [selectedAmenities, setSelectedAmenities] = useState<string[]>([]);
  const [showAdvanceFilters, setShowAdvanceFilters] = useState(false);
  const [sortBy, setSortBy] = useState<"default" | "price_asc" | "available_desc" | "newest">("default");
  const [isAvailableOnly, setIsAvailableOnly] = useState(true);

  const amenityOptions = ["Máy lạnh", "Gác lửng", "Cho nuôi thú cưng", "Giờ giấc tự do", "Máy giặt"];

  // --- FETCH DATA ---
  useEffect(() => {
    const fetchData = async () => {
      try {
        if (page === 0) setIsLoading(true);
        // Chạy song song cả hai API
        const [propsRes, recRoomsRes] = await Promise.allSettled([
          propertyApi.getAll(page, 24),
          page === 0 ? propertyApi.getRecommendedRooms() : Promise.resolve({ data: [] })
        ]);
        
        if (propsRes.status === "fulfilled") {
            const pageData = propsRes.value.data as any;
            if (page === 0) {
                 setProperties(pageData.content || pageData); 
            } else {
                 setProperties(prev => [...prev, ...(pageData.content || [])]);
            }
            setTotalPages(pageData.totalPages || 1);
        }

        if (recRoomsRes.status === "fulfilled" && Array.isArray(recRoomsRes.value.data) && recRoomsRes.value.data.length > 0) {
            const enrichedRooms = recRoomsRes.value.data.map((room: any) => ({
                ...room,
                matchScore: room.matchScore ? room.matchScore : 95,
                matchReason: room.matchReason ? room.matchReason : "Phù hợp với mức giá và khu vực bạn chọn."
            }));
            setRecommendedRooms(enrichedRooms as any);
        }

      } catch (error) {
        console.error("Failed to fetch properties or recommendations:", error);
        toast.error("Không thể tải toàn bộ dữ liệu. Đã có lỗi xảy ra.");
      } finally {
        setTimeout(() => setIsLoading(false), 500);
      }
    };
    fetchData();
  }, [page]);

  // --- FILTER LOGIC ---
  const filteredProperties = useMemo(() => {
    let result = properties.filter(p => {
      const searchLower = searchTerm.toLowerCase();
      const matchesSearch =
        p.name?.toLowerCase().includes(searchLower) ||
        p.address?.toLowerCase().includes(searchLower) ||
        p.district?.toLowerCase().includes(searchLower);

      const matchesCity = selectedCity === "Tất cả" || p.city === selectedCity;

      const price = Number(p.minPrice || 0);
      const matchesPrice = price <= maxPrice;

      const matchesAmenities = selectedAmenities.length === 0 || selectedAmenities.every(am =>
        p.description?.toLowerCase().includes(am.toLowerCase()) ||
        p.name?.toLowerCase().includes(am.toLowerCase())
      );

      const matchesAvailability = !isAvailableOnly || Number(p.availableRooms || 0) > 0;

      return matchesSearch && matchesCity && matchesPrice && matchesAmenities && matchesAvailability;
    });

    switch (sortBy) {
      case "price_asc":
        result.sort((a, b) => Number(a.minPrice || 0) - Number(b.minPrice || 0));
        break;
      case "available_desc":
        result.sort((a, b) => Number(b.availableRooms || 0) - Number(a.availableRooms || 0));
        break;
      case "newest":
        result.sort((a, b) => Number(b.id || 0) - Number(a.id || 0));
        break;
      default:
        break;
    }

    return result;
  }, [properties, searchTerm, selectedCity, maxPrice, selectedAmenities, sortBy]);

  const activeFilterCount = [
    searchTerm !== "",
    selectedCity !== "Tất cả",
    maxPrice < 20000000,
    selectedAmenities.length > 0,
    sortBy !== "default",
    !isAvailableOnly // Count as active filter if user manually UNCHECKS it (since default is true)
  ].filter(Boolean).length;

  const activeFilters = [
    searchTerm ? { key: "search", label: `Tu khoa: ${searchTerm}`, onClear: () => setSearchTerm("") } : null,
    selectedCity !== "Tất cả" ? { key: "city", label: `Khu vuc: ${selectedCity}`, onClear: () => setSelectedCity("Tất cả") } : null,
    maxPrice < 20000000
      ? {
          key: "price",
          label: `Toi da: ${new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND" }).format(maxPrice)}`,
          onClear: () => setMaxPrice(20000000),
        }
      : null,
    selectedAmenities.length > 0
      ? { key: "amenities", label: `Tien ich: ${selectedAmenities.length}`, onClear: () => setSelectedAmenities([]) }
      : null,
    sortBy !== "default" ? { key: "sort", label: "Da sap xep", onClear: () => setSortBy("default") } : null,
    !isAvailableOnly ? { key: "availability", label: "Hien ca da het phong", onClear: () => setIsAvailableOnly(true) } : null,
  ].filter(Boolean) as { key: string; label: string; onClear: () => void }[];

  const resetFilters = () => {
    setMaxPrice(20000000);
    setSelectedAmenities([]);
    setSearchTerm("");
    setSelectedCity("Tất cả");
    setSortBy("default");
    setIsAvailableOnly(true);
  };

  return (
    <div className="min-h-screen bg-background pb-20 space-y-6">
      {/* --- HEADER & FILTER --- */}
      <div className="sticky top-16 z-30">
        <div className="page-shell pt-3">
          <div className="section-card bg-card/95 p-4 shadow-sm backdrop-blur md:p-5">
          <div className="flex flex-col lg:flex-row justify-between items-end lg:items-center gap-4">
            
            <div>
              <h1 className="page-title text-foreground">Tìm phòng trọ</h1>
              <p className="page-subtitle">
                {isLoading 
                  ? "Đang cập nhật dữ liệu..." 
                  : `Đang hiển thị ${filteredProperties.length} khu trọ đã duyệt`
                }
              </p>
            </div>

            <div className="flex flex-col sm:flex-row w-full lg:w-auto gap-3">
              <div className="relative flex-1 sm:w-64">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input 
                  placeholder="Tìm theo khu vực, tên đường..." 
                  className="pl-9 bg-muted/40 border-border"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>

              <div className="relative">
                <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <select 
                  className="h-10 w-full sm:w-40 rounded-lg border border-border bg-muted/40 pl-9 pr-3 text-sm focus:ring-2 focus:ring-primary focus:outline-none appearance-none cursor-pointer hover:bg-background transition-colors"
                  value={selectedCity}
                  onChange={(e) => setSelectedCity(e.target.value)}
                >
                  <option value="Tất cả">Toàn quốc</option>
                  <option value="Hồ Chí Minh">TP.HCM</option>
                  <option value="Hà Nội">Hà Nội</option>
                  <option value="Đà Nẵng">Đà Nẵng</option>
                </select>
              </div>

              <div className="relative">
                <ArrowUpDown className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <select
                  className="h-10 w-full sm:w-44 rounded-lg border border-border bg-muted/40 pl-9 pr-3 text-sm focus:ring-2 focus:ring-primary focus:outline-none appearance-none cursor-pointer hover:bg-background transition-colors"
                  value={sortBy}
                  onChange={e => setSortBy(e.target.value as any)}
                >
                  <option value="default">Sắp xếp</option>
                  <option value="newest">Mới nhất</option>
                  <option value="price_asc">Giá thấp nhất</option>
                  <option value="available_desc">Nhiều phòng trống</option>
                </select>
              </div>

              <Button 
                variant="outline" 
                className={`gap-2 relative ${showAdvanceFilters ? 'bg-primary/5 border-primary text-primary' : ''}`}
                onClick={() => setShowAdvanceFilters(!showAdvanceFilters)}
              >
                <Filter className="h-4 w-4" /> 
                Bộ lọc
                {activeFilterCount > 0 && (
                  <span className="absolute -top-1.5 -right-1.5 h-4 w-4 rounded-full bg-primary text-white text-[10px] font-bold flex items-center justify-center">
                    {activeFilterCount}
                  </span>
                )}
                <ChevronDown className={`h-3 w-3 transition-transform ${showAdvanceFilters ? 'rotate-180' : ''}`} />
              </Button>
            </div>
          </div>

          {activeFilters.length > 0 && (
            <div className="mt-4 flex flex-wrap items-center gap-2">
              {activeFilters.map((filter) => (
                <button
                  key={filter.key}
                  type="button"
                  onClick={filter.onClear}
                  className="inline-flex items-center gap-1 rounded-full border bg-secondary px-3 py-1 text-xs font-medium text-foreground hover:bg-secondary/70"
                >
                  {filter.label}
                  <X className="h-3 w-3" />
                </button>
              ))}
                <Button variant="ghost" size="sm" className="h-7 px-2 text-xs" onClick={resetFilters}>
                Xoa tat ca
              </Button>
            </div>
          )}

          {showAdvanceFilters && (
            <div className="mt-6 pt-6 border-t animate-in slide-in-from-top-4 duration-300">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <label className="text-sm font-semibold text-gray-700">Mức giá tối đa</label>
                    <span className="text-primary font-bold">
                        {maxPrice >= 20000000 ? "Tất cả" : new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(maxPrice)}
                    </span>
                  </div>
                  <input 
                    type="range" 
                    min="500000" 
                    max="20000000" 
                    step="500000"
                    className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-primary"
                    value={maxPrice}
                    onChange={(e) => setMaxPrice(parseInt(e.target.value))}
                  />
                  <div className="flex justify-between text-[10px] text-gray-400 font-medium">
                    <span>500k</span>
                    <span>10M</span>
                    <span>20M+</span>
                  </div>
                </div>

                <div className="space-y-3">
                    <label className="text-sm font-semibold text-gray-700">Tiện ích phổ biến</label>
                    <div className="flex flex-wrap gap-4">
                        {amenityOptions.map(am => (
                            <div key={am} className="flex items-center">
                                <Checkbox 
                                    id={`am-${am}`}
                                    label={am}
                                    checked={selectedAmenities.includes(am)}
                                    onCheckedChange={(checked) => {
                                        if (checked) setSelectedAmenities([...selectedAmenities, am]);
                                        else setSelectedAmenities(selectedAmenities.filter(item => item !== am));
                                    }}
                                />
                            </div>
                        ))}
                    </div>
                </div>

                <div className="space-y-3">
                    <label className="text-sm font-semibold text-gray-700">Trạng thái phòng</label>
                    <div className="flex items-center">
                        <Checkbox 
                            id="filter-available"
                            label="Chỉ hiện khu trọ còn phòng"
                            checked={isAvailableOnly}
                            onCheckedChange={(checked) => setIsAvailableOnly(!!checked)}
                        />
                    </div>
                    <p className="text-[10px] text-gray-400 font-medium">
                        Tắt tùy chọn này để xem tất cả khu trọ kể cả đã hết phòng.
                    </p>
                </div>
              </div>

              <div className="flex justify-end gap-3 mt-8 pt-4 border-t">
                  <Button variant="ghost" size="sm" onClick={resetFilters}>
                      Đặt lại tất cả
                  </Button>
                  <Button size="sm" onClick={() => setShowAdvanceFilters(false)}>
                      Áp dụng lọc
                  </Button>
              </div>
            </div>
          )}
          </div>
        </div>
      </div>

      {/* --- AI RECOMMENDATIONS --- */}
      {recommendedRooms.length > 0 && (
        <div className="page-shell relative z-20 py-8">
          <div className="flex items-center gap-3 border-b pb-4 mb-6">
            <div className="p-2 bg-gradient-to-br from-yellow-100 to-amber-100 rounded-lg text-amber-600">
              <Sparkles className="h-6 w-6" />
            </div>
            <div>
              <h2 className="text-2xl font-bold bg-gradient-to-r from-amber-600 to-orange-500 bg-clip-text text-transparent">
                Phòng Gợi Ý Từ AI
              </h2>
              <p className="text-sm text-muted-foreground mt-1">
                Dựa trên sở thích của bạn, AI đã chọn ra {recommendedRooms.length} phòng tối ưu nhất.
              </p>
            </div>
          </div>
          <div className="flex gap-4 overflow-x-auto pb-6 snap-x">
            {recommendedRooms.map((room) => (
              <div key={room.id} className="min-w-[300px] w-[300px] sm:min-w-[350px] sm:w-[350px] snap-start shrink-0 flex flex-col gap-3">
                 <div className="relative flex-1">
                   <RoomCard data={room} />
                 </div>
                 
                 <Button 
                   variant="outline" 
                   className="w-full gap-2 border-primary/40 text-primary font-medium hover:bg-primary/5 shadow-sm h-10"
                   onClick={() => {
                     const amenitiesList = Array.isArray(room.amenities) ? room.amenities.join(', ') : '';
                     const details = [
                       `Tên phòng: "${room.name}"`,
                       room.propertyName ? `Khu trọ: "${room.propertyName}"` : '',
                       (room as any).propertyAddress || (room as any).address ? `Địa chỉ: ${(room as any).propertyAddress || (room as any).address}` : '',
                       `Diện tích: ${room.area}m²`,
                       `Giá thuê: ${room.price?.toLocaleString('vi-VN')}đ/tháng`,
                       room.type ? `Loại: ${room.type}` : '',
                       room.hasMezzanine ? 'Có gác lửng' : '',
                       room.hasBalcony ? 'Có ban công' : '',
                       amenitiesList ? `Tiện nghi: ${amenitiesList}` : '',
                       room.description ? `Mô tả: ${room.description.substring(0, 200)}` : '',
                     ].filter(Boolean).join('. ');
                     const q = `Hãy phân tích chi tiết ưu điểm và nhược điểm của phòng trọ sau đây, đánh giá mức giá có hợp lý không, và đưa ra lời khuyên cho người thuê:\n${details}`;
                     const shortText = `Phân tích phòng "${room.name}" tại "${room.propertyName || 'khu trọ này'}" giúp mình nhé! 🏠`;
                     window.dispatchEvent(new CustomEvent('openAiChat', { detail: { question: q, autoSend: true, displayText: shortText } }));
                   }}
                 >
                   <Bot className="h-4 w-4" /> Hỏi AI về phòng này
                 </Button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* --- MAIN CONTENT --- */}
      <div className="page-shell py-8">
        <h2 className="text-xl font-bold mb-6 text-foreground border-b pb-2 flex justify-between items-center">
            <span>Khám Phá Khu Trọ Toàn Quốc</span>
            <div className="flex bg-gray-100 p-1 rounded-lg">
              <button 
                onClick={() => setViewMode("list")} 
                className={`p-1.5 px-3 rounded-md text-sm font-medium flex items-center gap-2 transition-colors ${viewMode === "list" ? "bg-white text-primary shadow-sm" : "text-gray-500 hover:text-gray-900"}`}
              >
                <List className="h-4 w-4" /> Danh sách
              </button>
              <button 
                onClick={() => setViewMode("map")} 
                className={`p-1.5 px-3 rounded-md text-sm font-medium flex items-center gap-2 transition-colors ${viewMode === "map" ? "bg-white text-primary shadow-sm" : "text-gray-500 hover:text-gray-900"}`}
              >
                <MapIcon className="h-4 w-4" /> Bản đồ
              </button>
            </div>
        </h2>
        
        {isLoading ? (
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
          <>
            {viewMode === "list" ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                {filteredProperties.map((property) => (
                  <PropertyCard key={property.id} data={property} />
                ))}
              </div>
            ) : (
              <div className="animate-in zoom-in-95 duration-500">
                <PropertyMap properties={filteredProperties} />
              </div>
            )}
            
            {page < totalPages - 1 && (
              <div className="flex justify-center mt-10">
                <Button variant="outline" onClick={() => setPage(p => p + 1)} className="px-8 bg-white border-primary text-primary hover:bg-primary/5">
                  Xem thêm khu trọ
                </Button>
              </div>
            )}
          </>
        ) : (
          <div className="flex flex-col items-center justify-center py-20 text-center animate-in fade-in zoom-in duration-300">
            <div className="bg-gray-100 p-6 rounded-full mb-4">
              <Frown className="h-10 w-10 text-gray-400" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900">Không tìm thấy kết quả</h3>
            <p className="text-gray-500 max-w-sm mt-2">
              Hãy thử thay đổi từ khóa hoặc bộ lọc để tìm kiếm lại nhé.
            </p>
            <Button 
              variant="outline" 
              onClick={resetFilters}
              className="mt-4 gap-2"
            >
              <X className="h-4 w-4" /> Xóa bộ lọc
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
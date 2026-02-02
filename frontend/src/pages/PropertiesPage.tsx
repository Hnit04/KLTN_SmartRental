import { useState, useEffect } from "react";
import { Search, MapPin, Frown } from "lucide-react";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import PropertyCard from "@/components/shared/PropertyCard";
import LoadingSpinner from "@/components/shared/LoadingSpinner";
import { propertyApi } from "@/api/api/propertyApi";
import type { Property } from "@/types/index";
import { toast } from "sonner";

export default function PropertiesPage() {
  // 1. STATE QUẢN LÝ DỮ LIỆU
  const [properties, setProperties] = useState<Property[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  
  // 2. STATE TÌM KIẾM
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCity, setSelectedCity] = useState("Tất cả");

  // 3. GỌI API KHI VÀO TRANG
  useEffect(() => {
    const fetchProperties = async () => {
      try {
        setIsLoading(true);
        // Gọi API lấy danh sách thật từ Backend
        const response = await propertyApi.getAll();
        
        // Axios trả về dữ liệu trong response.data
        // (Tùy cấu hình axiosClient của bạn, nếu bạn đã interceptor để lấy data thì bỏ .data đi)
        setProperties(response.data as any); 
        
      } catch (error) {
        console.error("Failed to fetch properties:", error);
        toast.error("Không thể tải danh sách phòng. Vui lòng thử lại sau.");
      } finally {
        setIsLoading(false);
      }
    };

    fetchProperties();
  }, []);

  // 4. LOGIC LỌC DỮ LIỆU (Client-side Filter)
  const filteredProperties = properties.filter(p => {
    // Chuyển tất cả về chữ thường để tìm kiếm không phân biệt hoa thường
    const searchLower = searchTerm.toLowerCase();
    
    const matchesSearch = 
      p.name?.toLowerCase().includes(searchLower) ||
      p.address?.toLowerCase().includes(searchLower) ||
      p.district?.toLowerCase().includes(searchLower);

    const matchesCity = selectedCity === "Tất cả" || p.city === selectedCity;
    
    return matchesSearch && matchesCity;
  });

  // 5. RENDER GIAO DIỆN
  return (
    <div className="min-h-screen bg-gray-50/50 pb-20">
      {/* --- HEADER & FILTER SECTION --- */}
      <div className="bg-white border-b sticky top-16 z-30 shadow-sm">
        <div className="container mx-auto px-4 py-6">
          <div className="flex flex-col md:flex-row justify-between items-end md:items-center gap-4">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Khám phá phòng trọ</h1>
              <p className="text-sm text-gray-500 mt-1">
                {isLoading 
                  ? "Đang tìm kiếm dữ liệu..." 
                  : `Tìm thấy ${filteredProperties.length} khu trọ phù hợp`
                }
              </p>
            </div>

            {/* Bộ lọc */}
            <div className="flex w-full md:w-auto gap-3">
              <div className="relative flex-1 md:w-80">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input 
                  placeholder="Tìm theo tên, đường, quận..." 
                  className="pl-9 bg-gray-50"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
              <select 
                className="h-10 rounded-md border border-input bg-background px-3 py-2 text-sm focus:ring-2 focus:ring-primary focus:outline-none"
                value={selectedCity}
                onChange={(e) => setSelectedCity(e.target.value)}
              >
                <option value="Tất cả">Toàn quốc</option>
                <option value="Hồ Chí Minh">TP.HCM</option>
                <option value="Hà Nội">Hà Nội</option>
                <option value="Đà Nẵng">Đà Nẵng</option>
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* --- MAIN CONTENT --- */}
      <div className="container mx-auto px-4 py-8">
        
        {/* Case 1: Đang tải */}
        {isLoading ? (
          <LoadingSpinner />
        ) : filteredProperties.length > 0 ? (
          
          /* Case 2: Có dữ liệu -> Hiển thị Grid */
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {filteredProperties.map((property) => (
              <PropertyCard key={property.id} data={property} />
            ))}
          </div>

        ) : (
          
          /* Case 3: Không tìm thấy kết quả */
          <div className="flex flex-col items-center justify-center py-20 text-center animate-in fade-in zoom-in duration-300">
            <div className="bg-gray-100 p-6 rounded-full mb-4">
              <Frown className="h-10 w-10 text-gray-400" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900">Không tìm thấy phòng nào</h3>
            <p className="text-gray-500 max-w-sm mt-2">
              Chúng tôi không tìm thấy kết quả nào khớp với từ khóa "{searchTerm}" tại {selectedCity}.
            </p>
            <Button 
              variant="link" 
              onClick={() => {setSearchTerm(""); setSelectedCity("Tất cả")}}
              className="mt-2 text-primary font-semibold"
            >
              Xóa bộ lọc & Xem tất cả
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
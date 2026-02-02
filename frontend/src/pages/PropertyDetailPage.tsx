import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { MapPin, ArrowLeft, Zap, Droplets, Wifi, ShieldCheck } from "lucide-react";
import { propertyApi } from "@/api/api/propertyApi";
import type { Property, Room } from "@/types/index";
import RoomCard from "@/components/shared/RoomCard";
import LoadingSpinner from "@/components/shared/LoadingSpinner";
import { Button } from "@/components/ui/Button";

export default function PropertyDetailPage() {
  const { id } = useParams(); // Lấy ID từ URL
  const [property, setProperty] = useState<Property | null>(null);
  const [rooms, setRooms] = useState<Room[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      if (!id) return;
      setIsLoading(true);
      try {
        // Gọi song song 2 API để tiết kiệm thời gian
        const [propRes, roomRes] = await Promise.all([
          propertyApi.getDetail(id),
          propertyApi.getRooms(id)
        ]);
        
        setProperty(propRes.data as any);
        setRooms(roomRes.data as any);
      } catch (error) {
        console.error("Lỗi tải trang chi tiết:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [id]);

  if (isLoading) return <LoadingSpinner />;
  if (!property) return <div className="text-center py-20">Không tìm thấy khu trọ này.</div>;

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      {/* 1. Header Info */}
      <div className="bg-white border-b shadow-sm">
        <div className="container mx-auto max-w-6xl px-4 py-6">
          <Link to="/properties">
            <Button variant="ghost" size="sm" className="mb-4 pl-0 hover:bg-transparent hover:underline text-muted-foreground">
              <ArrowLeft className="h-4 w-4 mr-1" /> Quay lại danh sách
            </Button>
          </Link>

          <div className="flex flex-col md:flex-row gap-6">
            {/* Ảnh đại diện lớn */}
            <div className="w-full md:w-1/3 h-64 rounded-xl overflow-hidden shadow-sm">
               <img 
                 src={property.images?.[0] || "https://placehold.co/600x400"} 
                 className="w-full h-full object-cover" 
                 alt={property.name} 
               />
            </div>

            {/* Thông tin chính */}
            <div className="flex-1 space-y-4">
              <h1 className="text-3xl font-bold text-gray-900">{property.name}</h1>
              
              <div className="flex items-center text-gray-600">
                <MapPin className="h-5 w-5 mr-2 text-primary" />
                <span>{property.address}, {property.district}, {property.city}</span>
              </div>

              {/* Bảng giá dịch vụ */}
              <div className="flex flex-wrap gap-4 bg-blue-50/50 p-4 rounded-lg border border-blue-100">
                <ServiceItem icon={<Zap className="text-yellow-500" />} label="Điện" value={property.elecPrice} unit="kW" />
                <ServiceItem icon={<Droplets className="text-blue-500" />} label="Nước" value={property.waterPrice} unit="khối/người" />
                <ServiceItem icon={<Wifi className="text-indigo-500" />} label="Internet" value={property.internetPrice} unit="tháng" />
              </div>
              
              <div className="text-sm text-gray-600 bg-gray-50 p-3 rounded border">
                <span className="font-semibold block mb-1">Mô tả:</span>
                {property.description || "Chưa có mô tả chi tiết."}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 2. Danh sách Phòng */}
      <div className="container mx-auto max-w-6xl px-4 py-10">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold text-gray-800">Danh sách phòng ({rooms.length})</h2>
          <div className="flex items-center gap-2 text-sm text-green-600 font-medium">
             <ShieldCheck className="h-5 w-5" /> Tin đăng đã xác thực
          </div>
        </div>

        {rooms.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {rooms.map((room) => (
              <RoomCard key={room.id} data={room} />
            ))}
          </div>
        ) : (
          <div className="text-center py-10 text-gray-500 bg-white rounded-xl border border-dashed">
            Hiện tại khu trọ này chưa có phòng nào được đăng tải.
          </div>
        )}
      </div>
    </div>
  );
}

// Component phụ hiển thị giá dịch vụ
const ServiceItem = ({ icon, label, value, unit }: any) => (
  <div className="flex items-center gap-2 pr-4 border-r last:border-0">
    {icon}
    <div>
      <p className="text-xs text-gray-500 uppercase font-semibold">{label}</p>
      <p className="text-sm font-bold text-gray-900">
        {value ? `${value.toLocaleString()}đ / ${unit}` : "Miễn phí"}
      </p>
    </div>
  </div>
);
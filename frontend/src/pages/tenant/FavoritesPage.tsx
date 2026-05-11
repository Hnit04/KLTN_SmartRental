import { useEffect, useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { propertyApi } from '@/api/propertyApi';
import type { Room } from '@/types/index';
import { Heart, Loader2, Search, Trash2, SlidersHorizontal, ArrowUpDown } from 'lucide-react';
import RoomCard from '@/features/property/components/RoomCard';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/Button';
import { toast } from 'sonner';
import { useFavorites } from '@/hooks/useFavorites';

export default function FavoritesPage() {
  const { user } = useAuth();
  const { favoriteIds } = useFavorites();
  const [allRooms, setAllRooms] = useState<Room[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [sortBy, setSortBy] = useState<"default" | "price_asc" | "price_desc" | "area_desc">("default");

  useEffect(() => {
    const fetchFavorites = async () => {
      try {
        setIsLoading(true);
        const res = await propertyApi.getFavoriteRooms();
        const data = (res as any).data || res;
        setAllRooms(Array.isArray(data) ? data : []);
      } catch (error) {
        console.error('Failed to load favorite rooms', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchFavorites();
  }, []);

  // Real-time filter: only show rooms that are still in favoriteIds
  const rooms = allRooms.filter(room => favoriteIds.includes(room.id));

  // Sorted rooms
  const sortedRooms = [...rooms].sort((a, b) => {
    switch (sortBy) {
      case "price_asc": return a.price - b.price;
      case "price_desc": return b.price - a.price;
      case "area_desc": return b.area - a.area;
      default: return 0;
    }
  });

  const stats = {
    total: rooms.length,
    available: rooms.filter(r => r.status === "AVAILABLE").length,
    avgPrice: rooms.length > 0 ? Math.round(rooms.reduce((s, r) => s + r.price, 0) / rooms.length) : 0,
  };

  return (
    <div className="min-h-[80vh] animate-in fade-in duration-300">
      {/* Hero Header */}
      <div className="bg-gradient-to-br from-rose-50 via-pink-50/30 to-white border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-10">
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <div className="p-2.5 bg-gradient-to-br from-rose-500 to-pink-500 rounded-xl shadow-lg shadow-rose-200">
                  <Heart className="h-5 w-5 text-white fill-white" />
                </div>
                <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">
                  Phòng yêu thích
                </h1>
              </div>
              <p className="text-gray-500 text-sm sm:text-base ml-[52px]">
                Những phòng trọ bạn đã đánh dấu lưu lại để xem sau
              </p>
            </div>

            {rooms.length > 0 && (
              <div className="flex items-center gap-4 sm:gap-6">
                {/* Stats pills */}
                <div className="flex gap-2">
                  <div className="bg-white border rounded-xl px-3 py-2 text-center shadow-sm">
                    <p className="text-lg font-bold text-gray-900">{stats.total}</p>
                    <p className="text-[10px] text-gray-400 font-medium uppercase">Đã lưu</p>
                  </div>
                  <div className="bg-white border rounded-xl px-3 py-2 text-center shadow-sm">
                    <p className="text-lg font-bold text-emerald-600">{stats.available}</p>
                    <p className="text-[10px] text-gray-400 font-medium uppercase">Còn trống</p>
                  </div>
                  <div className="bg-white border rounded-xl px-3 py-2 text-center shadow-sm hidden sm:block">
                    <p className="text-lg font-bold text-indigo-600">{stats.avgPrice?.toLocaleString('vi-VN')}</p>
                    <p className="text-[10px] text-gray-400 font-medium uppercase">TB/tháng</p>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">

        {/* Toolbar */}
        {rooms.length > 0 && (
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-6">
            <p className="text-sm text-gray-500">
              Hiển thị <span className="font-semibold text-gray-800">{sortedRooms.length}</span> phòng
              <span className="text-gray-400"> / tối đa 20</span>
            </p>
            <div className="flex items-center gap-2">
              <ArrowUpDown className="h-4 w-4 text-gray-400" />
              <select
                className="h-9 border border-gray-200 rounded-lg px-3 pr-8 text-sm focus:ring-2 focus:ring-rose-300 outline-none bg-white appearance-none cursor-pointer hover:border-gray-300 transition"
                value={sortBy}
                onChange={e => setSortBy(e.target.value as any)}
              >
                <option value="default">Mới thêm trước</option>
                <option value="price_asc">Giá: Thấp → Cao</option>
                <option value="price_desc">Giá: Cao → Thấp</option>
                <option value="area_desc">Diện tích: Rộng nhất</option>
              </select>
            </div>
          </div>
        )}

        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-24">
            <div className="relative">
              <div className="w-16 h-16 border-4 border-rose-100 rounded-full" />
              <Loader2 className="absolute inset-0 m-auto h-8 w-8 animate-spin text-rose-500" />
            </div>
            <p className="text-gray-400 mt-4 text-sm">Đang tải danh sách yêu thích...</p>
          </div>
        ) : rooms.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5 animate-in fade-in slide-in-from-bottom-4 duration-500">
            {sortedRooms.map(room => (
              <RoomCard key={room.id} data={room} />
            ))}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-20 sm:py-28 text-center px-4">
            {/* Empty state illustration */}
            <div className="relative mb-6">
              <div className="w-28 h-28 bg-gradient-to-br from-rose-100 to-pink-50 rounded-full flex items-center justify-center">
                <Heart className="h-12 w-12 text-rose-300" />
              </div>
              <div className="absolute -bottom-1 -right-1 w-10 h-10 bg-white border-2 border-rose-100 rounded-full flex items-center justify-center shadow-sm">
                <Search className="h-4 w-4 text-rose-400" />
              </div>
            </div>
            <h3 className="text-xl font-bold text-gray-900 mb-2">Chưa có phòng yêu thích</h3>
            <p className="text-gray-500 max-w-sm mb-8 text-sm leading-relaxed">
              Nhấn biểu tượng <Heart className="inline h-4 w-4 text-red-400 fill-red-400 align-text-bottom" /> trên thẻ phòng để lưu lại những phòng ưng ý. Danh sách này giúp bạn quay lại nhanh chóng khi cần.
            </p>
            <Link to="/properties">
              <Button className="gap-2 px-6 h-11 bg-gradient-to-r from-rose-500 to-pink-500 hover:from-rose-600 hover:to-pink-600 text-white shadow-lg shadow-rose-200 rounded-xl">
                <Search className="h-4 w-4" /> Khám phá phòng trọ
              </Button>
            </Link>
          </div>
        )}

        {/* Capacity bar */}
        {rooms.length > 0 && (
          <div className="mt-8 bg-muted/40 border rounded-xl p-4 flex items-center gap-4">
            <div className="flex-1">
              <div className="flex justify-between text-xs text-gray-500 mb-1.5">
                <span>Dung lượng danh sách</span>
                <span className="font-semibold text-gray-700">{rooms.length}/20 phòng</span>
              </div>
              <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-gradient-to-r from-rose-400 to-pink-500 rounded-full transition-all duration-500"
                  style={{ width: `${(rooms.length / 20) * 100}%` }}
                />
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

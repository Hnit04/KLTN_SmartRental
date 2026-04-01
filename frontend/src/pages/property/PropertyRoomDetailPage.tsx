import React, { useEffect, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { 
  ArrowLeft, Edit, Users, MapPin, ShieldCheck, 
  ShieldAlert, AlertTriangle, Loader2, Trash2, CheckSquare 
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { toast } from 'sonner';
import type { Room, User } from '@/types/index';
import { propertyApi } from '@/api/propertyApi';
import { roomApi } from '@/api/roomApi'; 

// Mapping loại phòng
const ROOM_TYPE_LABELS: Record<string, string> = {
  STUDIO: 'Phòng trọ Studio',
  ONE_BEDROOM: '1 Phòng ngủ',
  TWO_BEDROOM: '2 Phòng ngủ',
  SINGLE_ROOM: 'Phòng đơn',
  SHARED_ROOM: 'Phòng ghép / Ở chung',
  MEZZANINE_ROOM: 'Phòng có gác lửng',
};

export default function PropertyRoomDetailPage() {
  const { propertyId, roomId } = useParams<{ propertyId: string; roomId: string }>();
  const navigate = useNavigate();

  const [room, setRoom] = useState<Room | null>(null);
  const [tenants, setTenants] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    if (roomId) fetchRoomDetail();
  }, [roomId]);

  const fetchRoomDetail = async () => {
    try {
      setLoading(true);
      const [roomRes, tenantsRes] = await Promise.all([
        roomApi.getRoomDetail(roomId!),
        roomApi.getRoomTenants(roomId!)
      ]);

      // ✅ Quan trọng: Lấy .data từ response của Axios
      setRoom((roomRes as any).data || roomRes);
      setTenants((tenantsRes as any).data || tenantsRes || []);

      console.log('Room detail:', (roomRes as any).data || roomRes); // Để debug
    } catch (error: any) {
      toast.error('Không thể tải thông tin phòng');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteRoom = async () => {
    if (!room) return;
    if (!confirm(`Bạn chắc chắn muốn xóa phòng "${room.name}"?`)) return;

    setDeleting(true);
    try {
      await propertyApi.deleteRoom(room.id);
      toast.success(`Đã xóa phòng ${room.name}`);
      navigate(`/properties/manage/${propertyId}`);
    } catch (error: any) {
      toast.error(error?.response?.data?.message || 'Xóa phòng thất bại');
    } finally {
      setDeleting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!room) {
    return <div className="text-center py-20 text-red-500">Không tìm thấy thông tin phòng.</div>;
  }

  const safetyScore = (room as any).safetyScore;

  // Xử lý amenities (hỗ trợ cả string JSON và array)
  const amenities: string[] = Array.isArray(room.amenities) 
    ? room.amenities 
    : typeof room.amenities === 'string' 
      ? JSON.parse(room.amenities || '[]') 
      : [];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <Link 
          to={`/properties/manage/${propertyId}`}
          className="inline-flex items-center text-sm font-medium text-gray-500 hover:text-primary mb-4"
        >
          <ArrowLeft className="h-4 w-4 mr-1" /> Quay về danh sách phòng
        </Link>

        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Phòng {room.name}</h1>
            <p className="flex items-center text-gray-500 mt-1">
              <MapPin className="h-4 w-4 mr-1" /> 
              {room.propertyAddress || 'Địa chỉ khu trọ'}
            </p>
          </div>

          <div className="flex gap-3">
            <Button onClick={() => navigate(`/properties/manage/${propertyId}/rooms/${room.id}/edit`)} variant="outline">
              <Edit className="h-4 w-4 mr-2" /> Sửa thông tin
            </Button>
            <Button 
              variant="destructive" 
              onClick={handleDeleteRoom} 
              disabled={deleting}
            >
              {deleting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4 mr-2" />}
              Ẩn phòng
            </Button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Cột trái - Ảnh + Mô tả */}
        <div className="lg:col-span-7 space-y-6">
          {/* Ảnh phòng */}
          <div className="bg-white rounded-2xl border overflow-hidden">
            <div className="h-80 bg-gray-100 relative">
              {room.images?.length > 0 ? (
                <img 
                  src={room.images[0]} 
                  alt={`Phòng ${room.name}`} 
                  className="w-full h-full object-cover" 
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-gray-400 text-xl">
                  Chưa có ảnh phòng
                </div>
              )}

              <div className="absolute top-4 right-4">
                <span className={`px-4 py-1.5 rounded-xl text-sm font-bold shadow-md ${
                  room.status === 'AVAILABLE' ? 'bg-green-500 text-white' : 
                  room.status === 'RESERVED' ? 'bg-orange-500 text-white' : 
                  'bg-red-500 text-white'
                }`}>
                  {room.status === 'AVAILABLE' ? 'Đang trống' : 
                   room.status === 'RESERVED' ? 'Đang giữ chỗ' : 'Đã cho thuê'}
                </span>
              </div>
            </div>

            {room.images && room.images.length > 1 && (
              <div className="p-4 grid grid-cols-4 gap-3">
                {room.images.slice(1).map((url, idx) => (
                  <img key={idx} src={url} alt="" className="aspect-video object-cover rounded-lg border" />
                ))}
              </div>
            )}
          </div>

          {/* Mô tả & Điều khoản */}
          <div className="bg-white rounded-2xl border p-6 space-y-6">
            <div>
              <h2 className="text-lg font-semibold mb-3">Mô tả phòng</h2>
              <p className="text-gray-600 leading-relaxed whitespace-pre-line">
                {room.description || 'Chưa có mô tả.'}
              </p>
            </div>

            {room.defaultTerms && (
              <div>
                <h2 className="text-lg font-semibold mb-3">Điều khoản & Nội quy mẫu</h2>
                <div className="bg-blue-50 border border-blue-100 p-4 rounded-xl text-sm text-blue-800 whitespace-pre-line">
                  {room.defaultTerms}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Cột phải - Thông tin + Tiện ích + Khách thuê */}
        <div className="lg:col-span-5 space-y-6">
          {/* Thông số phòng + Tiện ích */}
          <div className="bg-white rounded-2xl border p-6">
            <h2 className="text-lg font-semibold mb-4">Thông tin chi tiết</h2>
            
            <div className="space-y-4">
              <div className="flex justify-between">
                <span className="text-gray-500">Loại phòng</span>
                <span className="font-medium">{ROOM_TYPE_LABELS[room.type] || room.type}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Diện tích</span>
                <span className="font-medium">{room.area} m²</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Giá thuê</span>
                <span className="font-bold text-primary">{room.price.toLocaleString()} đ/tháng</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Số người tối đa</span>
                <span className="font-medium">{room.maxOccupants || 'Không giới hạn'}</span>
              </div>

              {room.hasMezzanine && (
                <div className="flex justify-between">
                  <span className="text-gray-500">Tính năng đặc biệt</span>
                  <span className="text-amber-600 font-medium">Có gác lửng</span>
                </div>
              )}
              {room.hasBalcony && (
                <div className="flex justify-between">
                  <span className="text-gray-500">Tính năng đặc biệt</span>
                  <span className="text-sky-600 font-medium">Có ban công</span>
                </div>
              )}
            </div>

            {/* ==================== TIỆN ÍCH ==================== */}
            {amenities.length > 0 && (
              <div className="mt-8 pt-6 border-t">
                <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                  <CheckSquare className="h-5 w-5 text-primary" />
                  Tiện ích phòng
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {amenities.map((item, index) => (
                    <div 
                      key={index}
                      className="flex items-center gap-2 bg-gray-50 px-4 py-2.5 rounded-lg text-sm text-gray-700 border border-gray-100"
                    >
                      <div className="w-2 h-2 bg-green-500 rounded-full flex-shrink-0" />
                      {item}
                    </div>
                  ))}
                </div>
              </div>
            )}
            {/* ================================================== */}

            {/* AI Safety Score */}
            {safetyScore !== undefined && (
              <div className="mt-8 pt-6 border-t">
                <div className="flex items-center gap-2 mb-2">
                  {safetyScore >= 80 ? (
                    <ShieldCheck className="h-5 w-5 text-green-500" />
                  ) : safetyScore >= 50 ? (
                    <AlertTriangle className="h-5 w-5 text-yellow-500" />
                  ) : (
                    <ShieldAlert className="h-5 w-5 text-red-500" />
                  )}
                  <span className="font-medium">Điểm an toàn AI</span>
                </div>
                <div className="text-3xl font-bold text-gray-900">{safetyScore}/100</div>
              </div>
            )}
          </div>

          {/* Danh sách khách thuê */}
          <div className="bg-white rounded-2xl border p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold flex items-center gap-2">
                <Users className="h-5 w-5" /> Khách thuê hiện tại
              </h2>
              <span className="text-sm text-gray-500">
                {tenants.length} người
              </span>
            </div>

            {tenants.length === 0 ? (
              <div className="text-center py-12 text-gray-400">
                Phòng này hiện chưa có khách thuê nào
              </div>
            ) : (
              <div className="space-y-3">
                {tenants.map((tenant) => (
                  <div key={tenant.id} className="flex items-center gap-4 p-4 bg-gray-50 rounded-xl hover:bg-gray-100 transition">
                    <div className="w-12 h-12 bg-gray-200 rounded-full flex-shrink-0 overflow-hidden">
                      {tenant.avatarUrl ? (
                        <img src={tenant.avatarUrl} alt={tenant.fullName} className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-gray-400 text-xl font-medium">
                          {tenant.fullName?.charAt(0) || 'U'}
                        </div>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-gray-900 truncate">{tenant.fullName}</p>
                      <p className="text-sm text-gray-500 truncate">{tenant.email}</p>
                      {tenant.phoneNumber && (
                        <p className="text-xs text-gray-400">{tenant.phoneNumber}</p>
                      )}
                    </div>
                    <div className="text-right text-xs">
                      <div className={`px-3 py-1 rounded-full inline-block ${
                        tenant.kycStatus === 'VERIFIED' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'
                      }`}>
                        {tenant.kycStatus === 'VERIFIED' ? 'Đã xác thực' : 'Chưa xác thực'}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
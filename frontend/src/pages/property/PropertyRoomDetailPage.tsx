import React, { useEffect, useState, useRef } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { 
  ArrowLeft, Edit, Users, MapPin, ShieldCheck, 
  ShieldAlert, AlertTriangle, Loader2, Trash2, CheckSquare,
  Sparkles, ScrollText, ImagePlus, X, Eye, EyeOff
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { toast } from 'sonner';
import type { Room, User, RoomType } from '@/types/index';
import { propertyApi } from '@/api/propertyApi';
import { roomApi } from '@/api/roomApi'; 

// Danh sách tiện ích phổ biến
const COMMON_AMENITIES = [
  "Máy lạnh", "Tủ lạnh", "Máy giặt", "Nóng lạnh",
  "Giường nệm", "Tủ quần áo", "Ban công", "Kệ bếp",
  "Chỗ để xe", "Thang máy", "Wifi tốc độ cao", "An ninh 24/7",
  "Máy hút mùi", "Sofa", "Smart TV", "Bàn ghế làm việc"
];

// Mapping loại phòng
const ROOM_TYPE_LABELS: Record<RoomType, string> = {
  STUDIO: 'Phòng trọ Studio',
  ONE_BEDROOM: '1 Phòng ngủ',
  TWO_BEDROOM: '2 Phòng ngủ',
  SINGLE_ROOM: 'Phòng đơn',
  SHARED_ROOM: 'Phòng ghép / Ở chung',
  MEZZANINE_ROOM: 'Phòng có gác lửng',
};

// Danh sách gợi ý điều khoản dành cho chủ trọ
const LANDLORD_SUGGESTED_TERMS = [
  "Không nuôi thú cưng (chó, mèo...).",
  "Giữ yên tĩnh chung sau 22h00 đêm.",
  "Báo trước 30 ngày trước khi trả phòng.",
  "Bồi thường 100% nếu làm hỏng tài sản phòng.",
  "Chậm tiền nhà quá 5 ngày phạt 5%."
];

export default function PropertyRoomDetailPage() {
  const { propertyId, roomId } = useParams<{ propertyId: string; roomId: string }>();
  const navigate = useNavigate();

  const [room, setRoom] = useState<Room | null>(null);
  const [tenants, setTenants] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [togglingVisibility, setTogglingVisibility] = useState(false);

  // === State cho Modal Sửa Phòng ===
  const [showEditModal, setShowEditModal] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isGeneratingAI, setIsGeneratingAI] = useState(false);

  const [formData, setFormData] = useState({
    name: '',
    price: '',
    area: '',
    description: '',
    type: 'STUDIO' as RoomType,
    hasMezzanine: false,
    hasBalcony: false,
    maxOccupants: '',
    amenities: [] as string[],
    customAmenitiesInput: '',
    images: [] as string[],
    defaultTerms: ''
  });

  // State upload ảnh
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [previewUrls, setPreviewUrls] = useState<string[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

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

      const roomData = (roomRes as any).data || roomRes;
      setRoom(roomData);
      setTenants((tenantsRes as any).data || tenantsRes || []);
    } catch (error: any) {
      toast.error('Không thể tải thông tin phòng');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  // ==================== CHUẨN BỊ DỮ LIỆU CHO FORM SỬA ====================
  const prepareEditForm = (roomData: any) => {
    let rawAmenities: string[] = [];
    try {
      rawAmenities = Array.isArray(roomData.amenities)
        ? roomData.amenities
        : JSON.parse(roomData.amenities || '[]');
    } catch (e) {
      rawAmenities = [];
    }

    const standardAmenities: string[] = [];
    const customAmenities: string[] = [];

    rawAmenities.forEach((item: string) => {
      if (COMMON_AMENITIES.includes(item)) {
        standardAmenities.push(item);
      } else {
        customAmenities.push(item);
      }
    });

    setFormData({
      name: roomData.name || '',
      price: roomData.price?.toString() || '',
      area: roomData.area?.toString() || '',
      description: roomData.description || '',
      type: roomData.type || 'STUDIO',
      hasMezzanine: roomData.hasMezzanine ?? false,
      hasBalcony: roomData.hasBalcony ?? false,
      maxOccupants: roomData.maxOccupants?.toString() || '',
      amenities: standardAmenities,
      customAmenitiesInput: customAmenities.join(', '),
      images: roomData.images || [],
      defaultTerms: roomData.defaultTerms || ''
    });
  };

  const handleOpenEdit = () => {
    if (!room) return;
    prepareEditForm(room);
    setSelectedFiles([]);
    setPreviewUrls([]);
    setShowEditModal(true);
  };

  // ==================== XỬ LÝ TIỆN ÍCH ====================
  const handleToggleAmenity = (amenity: string) => {
    setFormData(prev => ({
      ...prev,
      amenities: prev.amenities.includes(amenity)
        ? prev.amenities.filter(item => item !== amenity)
        : [...prev.amenities, amenity]
    }));
  };

  const handleAddTerm = (term: string) => {
    if (formData.defaultTerms.includes(term)) {
      toast.info("Điều khoản này đã được thêm rồi!");
      return;
    }
    setFormData(prev => ({
      ...prev,
      defaultTerms: prev.defaultTerms
        ? `${prev.defaultTerms}\n- ${term}`
        : `- ${term}`
    }));
  };

  // ==================== XỬ LÝ ẢNH ====================
  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const filesArray = Array.from(e.target.files).filter(file => file.size <= 5 * 1024 * 1024);
      setSelectedFiles(prev => [...prev, ...filesArray]);
      setPreviewUrls(prev => [...prev, ...filesArray.map(f => URL.createObjectURL(f))]);
    }
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const removeSelectedFile = (idx: number) => {
    setSelectedFiles(prev => prev.filter((_, i) => i !== idx));
    setPreviewUrls(prev => prev.filter((_, i) => i !== idx));
  };

  const removeOldImage = (idx: number) => {
    setFormData(prev => ({
      ...prev,
      images: prev.images.filter((_, i) => i !== idx)
    }));
  };

  // ==================== AI TẠO MÔ TẢ ====================
  const handleGenerateAI = async () => {
    if (!formData.name || !formData.area || !formData.price) {
      toast.warning('Vui lòng nhập Tên, Diện tích và Giá thuê để AI có dữ liệu viết bài!');
      return;
    }
    try {
      setIsGeneratingAI(true);
      const allAmenities = [...formData.amenities, formData.customAmenitiesInput].filter(Boolean).join(', ');
      const keywords = `Phòng ${formData.name}, diện tích ${formData.area}m2, giá ${formData.price} VND/tháng. Tiện ích: ${allAmenities}. Sạch sẽ, an ninh tốt.`;

      const res = await propertyApi.generateRoomDescription(keywords);
      const generatedText = (res as any).data?.description || res;

      setFormData(prev => ({ ...prev, description: generatedText }));
      toast.success('AI đã tạo mô tả thành công!');
    } catch (error) {
      toast.error('Lỗi khi gọi AI. Tính năng đang bảo trì.');
    } finally {
      setIsGeneratingAI(false);
    }
  };

  // ==================== SUBMIT CẬP NHẬT PHÒNG ====================
  const handleSubmitEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name || !formData.price || !formData.area || !roomId) {
      toast.warning('Vui lòng nhập đủ thông tin bắt buộc!');
      return;
    }

    try {
      setIsSubmitting(true);

      let newUrls: string[] = [];
      if (selectedFiles.length > 0) {
        toast.info("Đang tải ảnh lên...");
        const uploadRes = await propertyApi.uploadImages(selectedFiles);
        newUrls = (uploadRes as any).data || uploadRes;
      }

      const parsedCustomAmenities = formData.customAmenitiesInput
        .split(',')
        .map(item => item.trim())
        .filter(item => item.length > 0);

      const finalAmenities = [...formData.amenities, ...parsedCustomAmenities];

      const payload = {
        name: formData.name,
        price: Number(formData.price),
        area: Number(formData.area),
        type: formData.type,
        hasMezzanine: formData.hasMezzanine,
        hasBalcony: formData.hasBalcony,
        maxOccupants: formData.maxOccupants ? Number(formData.maxOccupants) : null,
        description: formData.description,
        amenities: finalAmenities,
        images: [...formData.images, ...newUrls],
        defaultTerms: formData.defaultTerms
      };

      await propertyApi.updateRoom(roomId, payload);
      toast.success('Cập nhật phòng thành công!');

      setShowEditModal(false);
      fetchRoomDetail();
    } catch (error: any) {
      toast.error('Cập nhật phòng thất bại');
      console.error(error);
    } finally {
      setIsSubmitting(false);
    }
  };

  // ==================== ẨN / HIỆN PHÒNG ====================
  const handleToggleVisibility = async () => {
    if (!room) return;

    const isCurrentlyHidden = room.status === 'HIDDEN';
    const actionText = isCurrentlyHidden ? 'hiện' : 'ẩn';
    const targetStatus = isCurrentlyHidden ? 'AVAILABLE' : 'HIDDEN';

    const confirmed = window.confirm(
      `Bạn chắc chắn muốn ${actionText} phòng "${room.name}"?\n\n` +
      (isCurrentlyHidden 
        ? "Phòng sẽ hiển thị lại công khai cho người thuê." 
        : "Phòng sẽ không còn hiển thị công khai.")
    );

    if (!confirmed) return;

    setTogglingVisibility(true);
    try {
      if (isCurrentlyHidden) {
        // Hiện phòng
        await roomApi.updateRoomVisibility(room.id, 'AVAILABLE');
        toast.success(`Đã hiện phòng "${room.name}" thành công!`);
      } else {
        // Ẩn phòng
        await roomApi.updateRoomVisibility(room.id, 'HIDDEN');
        toast.success(`Đã ẩn phòng "${room.name}" thành công!`);
      }

      // Refresh dữ liệu
      await fetchRoomDetail();
    } catch (error: any) {
      const errorMsg = error?.response?.data?.message 
                    || error?.response?.data 
                    || `${actionText} phòng thất bại`;
      toast.error(errorMsg);
      console.error(error);
    } finally {
      setTogglingVisibility(false);
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

  const isHidden = room.status === 'HIDDEN';
  const safetyScore = (room as any).safetyScore;

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
            <Button onClick={handleOpenEdit} variant="outline">
              <Edit className="h-4 w-4 mr-2" /> Sửa thông tin
            </Button>
            
            <Button 
              variant={isHidden ? "default" : "destructive"} 
              onClick={handleToggleVisibility} 
              disabled={togglingVisibility}
            >
              {togglingVisibility ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : isHidden ? (
                <Eye className="h-4 w-4 mr-2" />
              ) : (
                <Trash2 className="h-4 w-4 mr-2" />
              )}
              {isHidden ? 'Hiện phòng' : 'Ẩn phòng'}
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
                  room.status === 'HIDDEN' ? 'bg-gray-500 text-white' :
                  'bg-red-500 text-white'
                }`}>
                  {room.status === 'AVAILABLE' ? 'Đang trống' : 
                   room.status === 'RESERVED' ? 'Đang giữ chỗ' : 
                   room.status === 'HIDDEN' ? 'Đã ẩn' : 'Đã cho thuê'}
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
                <span className="font-medium">{ROOM_TYPE_LABELS[room.type as RoomType] || room.type}</span>
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

            {/* TIỆN ÍCH */}
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

      {/* ====================== MODAL SỬA PHÒNG ====================== */}
      {showEditModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-xl w-full max-w-4xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh]">
            <div className="px-6 py-4 border-b flex justify-between items-center bg-gray-50 flex-shrink-0">
              <h2 className="text-xl font-bold">Cập nhật thông tin phòng</h2>
              <button onClick={() => setShowEditModal(false)} className="text-gray-400 hover:text-gray-600">
                <X className="h-5 w-5" />
              </button>
            </div>
            
            <div className="p-6 overflow-y-auto flex-1">
              <form id="edit-room-form" onSubmit={handleSubmitEdit} className="space-y-6">
                
                {/* Thông tin cơ bản */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Tên phòng (VD: 101) *</label>
                    <input 
                      required 
                      type="text" 
                      value={formData.name} 
                      onChange={e => setFormData({...formData, name: e.target.value})} 
                      className="w-full border border-gray-300 p-2.5 rounded-md focus:ring-2 focus:ring-primary outline-none" 
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Diện tích (m²) *</label>
                    <input 
                      required 
                      type="number" 
                      step="0.1" 
                      value={formData.area} 
                      onChange={e => setFormData({...formData, area: e.target.value})} 
                      className="w-full border border-gray-300 p-2.5 rounded-md focus:ring-2 focus:ring-primary outline-none" 
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Giá thuê (VND) *</label>
                    <input 
                      required 
                      type="number" 
                      value={formData.price} 
                      onChange={e => setFormData({...formData, price: e.target.value})} 
                      className="w-full border border-gray-300 p-2.5 rounded-md focus:ring-2 focus:ring-primary outline-none" 
                    />
                  </div>
                </div>

                {/* Số người tối đa */}
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-1 flex items-center gap-1">
                    <Users className="h-3.5 w-3.5 text-gray-500" /> Số người tối đa
                  </label>
                  <input 
                    type="number" 
                    min="1" 
                    value={formData.maxOccupants} 
                    onChange={e => setFormData({...formData, maxOccupants: e.target.value})} 
                    className="w-full border border-gray-300 p-2.5 rounded-md focus:ring-2 focus:ring-primary outline-none" 
                    placeholder="VD: 3" 
                  />
                </div>

                {/* Loại phòng + Không gian */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1 flex items-center gap-1">
                      <span className="text-gray-500">Loại phòng</span>
                    </label>
                    <select
                      value={formData.type}
                      onChange={e => setFormData({...formData, type: e.target.value as RoomType})}
                      className="w-full border border-gray-300 p-2.5 rounded-md focus:ring-2 focus:ring-primary outline-none bg-white"
                    >
                      {(Object.keys(ROOM_TYPE_LABELS) as RoomType[]).map(key => (
                        <option key={key} value={key}>{ROOM_TYPE_LABELS[key]}</option>
                      ))}
                    </select>
                  </div>
                  <div className="flex items-end">
                    <label className="flex items-center gap-2.5 cursor-pointer bg-amber-50 border border-amber-200 rounded-lg px-4 py-2.5 hover:bg-amber-100 transition w-full">
                      <input
                        type="checkbox"
                        checked={formData.hasMezzanine}
                        onChange={e => setFormData({...formData, hasMezzanine: e.target.checked})}
                        className="rounded border-gray-300 text-amber-600 focus:ring-amber-500 h-4 w-4 cursor-pointer"
                      />
                      <span className="text-sm font-medium text-amber-800">Có gác lửng</span>
                    </label>
                  </div>
                  <div className="flex items-end">
                    <label className="flex items-center gap-2.5 cursor-pointer bg-sky-50 border border-sky-200 rounded-lg px-4 py-2.5 hover:bg-sky-100 transition w-full">
                      <input
                        type="checkbox"
                        checked={formData.hasBalcony}
                        onChange={e => setFormData({...formData, hasBalcony: e.target.checked})}
                        className="rounded border-gray-300 text-sky-600 focus:ring-sky-500 h-4 w-4 cursor-pointer"
                      />
                      <span className="text-sm font-medium text-sky-800">Có ban công</span>
                    </label>
                  </div>
                </div>

                {/* TIỆN ÍCH */}
                <div className="bg-gray-50 p-4 rounded-xl border border-gray-200">
                  <label className="block text-sm font-bold text-gray-800 mb-3 flex items-center gap-2">
                    <CheckSquare className="h-4 w-4 text-primary" /> Tiện ích có sẵn
                  </label>
                  
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 mb-4">
                    {COMMON_AMENITIES.map((amenity) => (
                      <label key={amenity} className="flex items-center gap-2 cursor-pointer group">
                        <input
                          type="checkbox"
                          className="rounded border-gray-300 text-primary focus:ring-primary h-4 w-4 cursor-pointer"
                          checked={formData.amenities.includes(amenity)}
                          onChange={() => handleToggleAmenity(amenity)}
                        />
                        <span className="text-sm text-gray-700 group-hover:text-primary transition-colors">{amenity}</span>
                      </label>
                    ))}
                  </div>

                  <div className="pt-3 border-t border-gray-200">
                    <label className="block text-xs font-medium text-gray-500 mb-1">Tiện ích khác (Ngăn cách bằng dấu phẩy)</label>
                    <input 
                      type="text" 
                      placeholder="VD: Cửa sổ lớn, Máy nước nóng lạnh, Lò vi sóng..." 
                      value={formData.customAmenitiesInput} 
                      onChange={e => setFormData({...formData, customAmenitiesInput: e.target.value})} 
                      className="w-full border border-gray-300 p-2 rounded-md focus:ring-2 focus:ring-primary outline-none text-sm bg-white" 
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {/* AI Mô tả */}
                  <div className="bg-purple-50 p-4 rounded-xl border border-purple-100 flex flex-col">
                    <div className="flex justify-between items-end mb-2">
                      <label className="block text-sm font-bold text-purple-900 flex items-center gap-1">
                        <Sparkles className="h-4 w-4" /> Mô tả phòng
                      </label>
                      <Button 
                        type="button" 
                        size="sm" 
                        onClick={handleGenerateAI} 
                        disabled={isGeneratingAI} 
                        className="bg-purple-600 hover:bg-purple-700 text-white shadow-sm h-8 px-2 text-xs"
                      >
                        {isGeneratingAI ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : <Sparkles className="h-3 w-3 mr-1" />}
                        Tạo bằng AI
                      </Button>
                    </div>
                    <textarea 
                      rows={6} 
                      value={formData.description} 
                      onChange={e => setFormData({...formData, description: e.target.value})} 
                      className="w-full flex-1 border-purple-200 p-3 rounded-md focus:ring-2 focus:ring-purple-400 outline-none bg-white resize-none text-sm" 
                      placeholder="Nhập mô tả..." 
                    />
                    <p className="text-[11px] text-purple-700 mt-2 opacity-80 italic">
                      Mẹo: Nhập Tên, Giá, Diện tích rồi bấm "Tạo bằng AI"
                    </p>
                  </div>

                  {/* Điều khoản & Nội quy mẫu */}
                  <div className="bg-blue-50 p-4 rounded-xl border border-blue-100 flex flex-col">
                    <div className="flex justify-between items-end mb-2">
                      <label className="block text-sm font-bold text-blue-900 flex items-center gap-1">
                        <ScrollText className="h-4 w-4" /> Điều khoản & Nội quy mẫu
                      </label>
                    </div>
                    
                    <div className="flex flex-wrap gap-2 mb-3">
                      {LANDLORD_SUGGESTED_TERMS.map((term, idx) => {
                        const isAdded = formData.defaultTerms.includes(term);
                        return (
                          <span
                            key={idx}
                            onClick={() => !isAdded && handleAddTerm(term)}
                            className={`text-[11px] px-2.5 py-1 rounded-full transition-all shadow-sm flex items-center gap-1 border ${
                              isAdded 
                                ? 'bg-gray-100 text-gray-400 border-gray-200 cursor-not-allowed'
                                : 'bg-white text-blue-700 border-blue-200 hover:bg-blue-100 hover:border-blue-300 cursor-pointer active:scale-95'
                            }`}
                          >
                            <span className={`font-bold ${isAdded ? 'text-gray-400' : 'text-blue-600'}`}>
                              {isAdded ? '✓' : '+'}
                            </span> 
                            {term.substring(0, 30)}...
                          </span>
                        );
                      })}
                    </div>

                    <textarea 
                      rows={6} 
                      value={formData.defaultTerms} 
                      onChange={e => setFormData({...formData, defaultTerms: e.target.value})} 
                      className="w-full flex-1 border-blue-200 p-3 rounded-md focus:ring-2 focus:ring-blue-400 outline-none bg-white resize-none text-sm leading-relaxed" 
                      placeholder="VD: Không nuôi chó mèo. Thanh toán tiền mùng 5 hàng tháng..." 
                    />
                    <p className="text-[11px] text-blue-600 mt-2 italic">
                      Nội dung này sẽ tự động điền vào hợp đồng khi có khách thuê phòng này.
                    </p>
                  </div>
                </div>

                {/* Upload Ảnh */}
                <div className="border-t pt-4">
                  <label className="block text-sm font-medium text-gray-700 mb-2">Hình ảnh Phòng</label>
                  <div 
                    onClick={() => fileInputRef.current?.click()} 
                    className="border-2 border-dashed border-gray-300 bg-gray-50 hover:bg-gray-100 transition rounded-lg p-4 flex flex-col items-center justify-center cursor-pointer"
                  >
                    <ImagePlus className="h-6 w-6 text-gray-400 mb-1" />
                    <span className="text-sm font-medium text-gray-600">Chọn ảnh phòng</span>
                    <input 
                      type="file" 
                      multiple 
                      accept="image/*" 
                      ref={fileInputRef} 
                      onChange={handleImageChange} 
                      className="hidden" 
                    />
                  </div>

                  {(formData.images.length > 0 || previewUrls.length > 0) && (
                    <div className="grid grid-cols-4 sm:grid-cols-6 gap-3 mt-4">
                      {formData.images.map((url, idx) => (
                        <div key={`old-${idx}`} className="relative group aspect-square rounded-lg overflow-hidden border">
                          <img src={url} alt={`old-${idx}`} className="w-full h-full object-cover" />
                          <button 
                            type="button" 
                            onClick={() => removeOldImage(idx)} 
                            className="absolute top-1 right-1 bg-red-500 text-white p-1 rounded-full opacity-0 group-hover:opacity-100 transition"
                          >
                            <X className="h-3 w-3" />
                          </button>
                        </div>
                      ))}
                      {previewUrls.map((url, idx) => (
                        <div key={`new-${idx}`} className="relative group aspect-square rounded-lg overflow-hidden border-2 border-primary border-dashed">
                          <img src={url} alt={`preview-${idx}`} className="w-full h-full object-cover opacity-80" />
                          <button 
                            type="button" 
                            onClick={() => removeSelectedFile(idx)} 
                            className="absolute top-1 right-1 bg-red-500 text-white p-1 rounded-full opacity-0 group-hover:opacity-100 transition"
                          >
                            <X className="h-3 w-3" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </form>
            </div>

            <div className="px-6 py-4 border-t bg-gray-50 flex justify-end gap-3 flex-shrink-0">
              <Button type="button" variant="outline" onClick={() => setShowEditModal(false)} disabled={isSubmitting}>
                Hủy
              </Button>
              <Button type="submit" form="edit-room-form" disabled={isSubmitting} className="min-w-[140px]">
                {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Lưu thay đổi'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
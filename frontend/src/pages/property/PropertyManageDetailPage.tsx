import React, { useEffect, useState, useRef } from 'react';
import { useParams, Link } from 'react-router-dom';
import { 
  MapPin, Plus, Edit, ArrowLeft, Loader2, 
  Sparkles, ImagePlus, X, FileText, FileSignature, CheckSquare, ScrollText,
  Trash2, AlertTriangle, Layers, Copy, ShieldCheck, ShieldAlert, Users,
  Wrench, CheckCircle
} from 'lucide-react';
import type { RoomType } from '@/types/index';
import { propertyApi } from '@/api/propertyApi';
import { roomApi } from '@/api/roomApi';
import { Button } from '@/components/ui/Button';
import StatusBadge from '@/components/shared/StatusBadge';
import { toast } from 'sonner';
import type { Property, Room } from '@/types/index';

// Danh sách các tiện ích phổ biến
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

// ✅ DANH SÁCH GỢI Ý ĐIỀU KHOẢN DÀNH CHO CHỦ TRỌ
const LANDLORD_SUGGESTED_TERMS = [
  "Không nuôi thú cưng (chó, mèo...).",
  "Giữ yên tĩnh chung sau 22h00 đêm.",
  "Báo trước 30 ngày trước khi trả phòng.",
  "Bồi thường 100% nếu làm hỏng tài sản phòng.",
  "Chậm tiền nhà quá 5 ngày phạt 5%."
];

export default function PropertyManageDetailPage() {
  const { id } = useParams<{ id: string }>();
  
  const [property, setProperty] = useState<Property | null>(null);
  const [rooms, setRooms] = useState<Room[]>([]);
  const [loading, setLoading] = useState(true);

  // --- STATE CHO MODAL PHÒNG ---
  const [showModal, setShowModal] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isGeneratingAI, setIsGeneratingAI] = useState(false);
  const [aiTone, setAiTone] = useState<'SEO' | 'GENZ' | 'PRO'>('SEO');
  const [aiContentPreview, setAiContentPreview] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<number | string | null>(null);

  // --- STATE XÓA PHÒNG ---
  const [deleteRoomConfirm, setDeleteRoomConfirm] = useState<Room | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // --- STATE BẢO TRÌ PHÒNG ---
  const [isMaintenanceLoading, setIsMaintenanceLoading] = useState(false);
  const [maintenanceRoomId, setMaintenanceRoomId] = useState<number | string | null>(null);

  // --- MODAL XÁC NHẬN BẢO TRÌ ---
  const [showMaintenanceConfirm, setShowMaintenanceConfirm] = useState(false);
  const [pendingMaintenanceAction, setPendingMaintenanceAction] = useState<{
    roomId: number | string;
    roomName: string;
    type: 'start' | 'complete';
  } | null>(null);

  // --- MODAL CẢNH BÁO KHÔNG ĐƯỢC BẢO TRÌ ---
  const [showCannotMaintenanceModal, setShowCannotMaintenanceModal] = useState(false);
  const [cannotMaintenanceRoom, setCannotMaintenanceRoom] = useState<{name: string; status: string} | null>(null);

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

  // --- STATE UPLOAD ẢNH ---
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [previewUrls, setPreviewUrls] = useState<string[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (id) fetchData();
  }, [id]);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [propRes, roomsRes] = await Promise.all([
        propertyApi.getDetail(id!),
        propertyApi.getRooms(id!)
      ]);
      setProperty((propRes as any).data || propRes);
      setRooms((roomsRes as any).data || roomsRes);
    } catch (error) {
      toast.error('Không thể tải dữ liệu phòng');
    } finally {
      setLoading(false);
    }
  };

  // Kiểm tra có được phép bắt đầu bảo trì không
  const canStartMaintenance = (room: Room): boolean => {
    return room.status === 'AVAILABLE' || room.status === 'MAINTENANCE';
  };

  // Mở modal xác nhận bảo trì
  const openMaintenanceConfirm = (room: Room, type: 'start' | 'complete') => {
    if (type === 'start' && !canStartMaintenance(room)) {
      setCannotMaintenanceRoom({
        name: room.name,
        status: room.status
      });
      setShowCannotMaintenanceModal(true);
      return;
    }

    setPendingMaintenanceAction({ 
      roomId: room.id, 
      roomName: room.name, 
      type 
    });
    setShowMaintenanceConfirm(true);
  };

  // Thực hiện hành động bảo trì
  const executeMaintenanceAction = async () => {
    if (!pendingMaintenanceAction) return;

    const { roomId, roomName, type } = pendingMaintenanceAction;
    
    setShowMaintenanceConfirm(false);
    setMaintenanceRoomId(roomId);
    setIsMaintenanceLoading(true);

    try {
      if (type === 'start') {
        await roomApi.updateRoomVisibility(roomId, 'MAINTENANCE');
        toast.success(`Phòng "${roomName}" đã chuyển sang chế độ bảo trì!`);
      } else {
        await roomApi.updateRoomVisibility(roomId, 'AVAILABLE');
        toast.success(`Đã hoàn thành bảo trì phòng "${roomName}"! Phòng đã sẵn sàng cho thuê.`);
      }
      fetchData();
    } catch (error: any) {
      toast.error(error?.response?.data?.message || 'Không thể cập nhật trạng thái bảo trì');
    } finally {
      setIsMaintenanceLoading(false);
      setMaintenanceRoomId(null);
      setPendingMaintenanceAction(null);
    }
  };

  // --- MỞ MODAL THÊM PHÒNG ---
  const handleOpenCreate = () => {
    setEditingId(null);
    setFormData({ 
      name: '', price: '', area: '', description: '', 
      type: 'STUDIO' as RoomType,
      hasMezzanine: false, hasBalcony: false,
      maxOccupants: '',
      amenities: [], customAmenitiesInput: '', images: [],
      defaultTerms: '' 
    });
    setSelectedFiles([]); 
    setPreviewUrls([]);
    setShowModal(true);
  };

  // --- NHÂN BẢN PHÒNG ---
  const handleDuplicate = async (room: any) => {
    if (!room) {
      toast.error('Không tìm thấy dữ liệu phòng để sao chép');
      return;
    }

    setEditingId(null);

    let rawAmenities: string[] = [];
    try {
      rawAmenities = Array.isArray(room.amenities) 
        ? room.amenities 
        : JSON.parse(room.amenities || '[]');
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
      name: '', 
      price: room.price?.toString() || '', 
      area: room.area?.toString() || '',
      description: room.description || '', 
      type: room.type || 'STUDIO',
      hasMezzanine: room.hasMezzanine ?? false,
      hasBalcony: room.hasBalcony ?? false,
      maxOccupants: room.maxOccupants?.toString() || '',
      amenities: standardAmenities,
      customAmenitiesInput: customAmenities.join(', '), 
      images: [],
      defaultTerms: room.defaultTerms || '' 
    });

    setSelectedFiles([]); 
    setPreviewUrls([]);
    setShowModal(true);
    
    toast.info('Đã sao chép thông tin! Vui lòng nhập Số phòng mới.');
  };

  const handleOpenEdit = (room: any) => { 
    setEditingId(room.id);
    
    const standardAmenities: string[] = [];
    const customAmenities: string[] = [];
    
    (room.amenities || []).forEach((item: string) => {
      if (COMMON_AMENITIES.includes(item)) {
        standardAmenities.push(item);
      } else {
        customAmenities.push(item);
      }
    });

    setFormData({
      name: room.name, 
      price: room.price.toString(), 
      area: room.area.toString(),
      description: room.description || '', 
      type: room.type || 'STUDIO',
      hasMezzanine: room.hasMezzanine ?? false,
      hasBalcony: room.hasBalcony ?? false,
      maxOccupants: room.maxOccupants?.toString() || '',
      amenities: standardAmenities,
      customAmenitiesInput: customAmenities.join(', '), 
      images: room.images || [],
      defaultTerms: room.defaultTerms || '' 
    });
    setSelectedFiles([]); 
    setPreviewUrls([]);
    setShowModal(true);
  };

  // --- XỬ LÝ CHECKBOX TIỆN ÍCH ---
  const handleToggleAmenity = (amenity: string) => {
    setFormData(prev => {
      const isSelected = prev.amenities.includes(amenity);
      return {
        ...prev,
        amenities: isSelected 
          ? prev.amenities.filter(item => item !== amenity) 
          : [...prev.amenities, amenity] 
      };
    });
  };

  // ✅ XỬ LÝ THÊM ĐIỀU KHOẢN GỢI Ý
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

  // --- XỬ LÝ ẢNH ---
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
    setFormData(prev => ({ ...prev, images: prev.images.filter((_, i) => i !== idx) }));
  };

  // --- TÍCH HỢP AI TẠO MÔ TẢ ---
  const handleGenerateAI = async () => {
    if (!formData.name || !formData.area || !formData.price) {
      toast.warning('Vui lòng nhập Tên, Diện tích và Giá thuê để AI có dữ liệu viết bài!');
      return;
    }
    try {
      setIsGeneratingAI(true);
      const allAmenities = [...formData.amenities, formData.customAmenitiesInput].filter(Boolean).join(', ');
      
      let tonePrompt = "Mô tả chuẩn SEO, hấp dẫn, dễ đọc.";
      if (aiTone === 'GENZ') tonePrompt = "Giọng văn gần gũi, thân thiện, dùng ngôn ngữ trẻ trung phù hợp sinh viên.";
      if (aiTone === 'PRO') tonePrompt = "Phong cách chuyên nghiệp, lịch sự, nhắm tới người đi làm hoặc gia đình nhỏ.";

      const keywords = `Tên phòng hoặc số phòng: ${formData.name}. Diện tích: ${formData.area}m2. Giá thuê: ${formData.price} VND/tháng. \nTiện ích có sẵn: ${allAmenities}.\nYêu cầu viết: ${tonePrompt}`;
      
      const res = await propertyApi.generateRoomDescription(keywords);
      const generatedText = (res as any).data?.description || res; 
      
      setAiContentPreview(generatedText); // Bật preview modal
    } catch (error) {
      toast.error('Lỗi khi gọi AI. Tính năng đang bảo trì.');
    } finally {
      setIsGeneratingAI(false);
    }
  };

  const handleAcceptAiContent = () => {
    if (aiContentPreview) {
      setFormData(prev => ({ ...prev, description: aiContentPreview }));
      setAiContentPreview(null);
      toast.success('Đã áp dụng nội dung AI!');
    }
  };

  // --- LƯU PHÒNG ---
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name || !formData.price || !formData.area) {
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

      if (editingId) {
        await propertyApi.updateRoom(editingId, payload);
        toast.success('Cập nhật phòng thành công!');
      } else {
        await propertyApi.createRoom(id!, payload);
        toast.success('Thêm phòng mới thành công!');
      }
      
      setShowModal(false);
      fetchData(); 
    } catch (error) {
      toast.error(editingId ? 'Cập nhật thất bại' : 'Thêm mới thất bại');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading) return <div className="flex justify-center py-20"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;
  if (!property) return <div className="text-center py-20">Không tìm thấy khu trọ.</div>;

  return (
    <div className="space-y-6">
      {/* --- HEADER --- */}
      <div>
        <Link to="/landlord/properties" className="inline-flex items-center text-sm font-medium text-gray-500 hover:text-primary mb-4 transition">
          <ArrowLeft className="h-4 w-4 mr-1" /> Về danh sách khu trọ
        </Link>
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{property.name}</h1>
            <p className="flex items-center text-gray-500 mt-1"><MapPin className="h-4 w-4 mr-1" /> {property.address}</p>
          </div>
          <Button onClick={handleOpenCreate} className="flex items-center gap-2">
            <Plus className="h-4 w-4" /> Thêm phòng mới
          </Button>
        </div>
      </div>

      {/* --- DANH SÁCH PHÒNG --- */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 mt-6">
        {rooms.length === 0 ? (
          <div className="col-span-full py-16 text-center bg-gray-50 border-2 border-dashed rounded-xl">
            <h3 className="text-lg font-medium text-gray-900 mb-1">Chưa có phòng nào</h3>
            <p className="text-gray-500 mb-4">Khu trọ này hiện đang trống.</p>
            <Button onClick={handleOpenCreate} variant="outline">Thêm phòng ngay</Button>
          </div>
        ) : (
          rooms.map(room => (
            <div 
              key={room.id} 
              className="bg-white rounded-xl border overflow-hidden hover:shadow-lg transition flex flex-col group cursor-pointer"
              onClick={() => window.location.href = `/landlord/properties/${id}/rooms/${room.id}`}
            >
              {/* Ảnh phòng */}
              <div className="h-40 bg-gray-200 relative">
                {room.images && room.images.length > 0 ? (
                  <img src={room.images[0]} alt="Room" className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-gray-400 bg-gray-100">Chưa có ảnh</div>
                )}
                
                {/* Trạng thái phòng */}
                <span className={`absolute top-2 right-2 px-3 py-1 rounded-md text-xs font-bold shadow-sm flex items-center gap-1 ${
                  room.status === 'AVAILABLE' ? 'bg-green-500 text-white' : 
                  room.status === 'RENTED' ? 'bg-blue-600 text-white' :
                  room.status === 'MAINTENANCE' ? 'bg-orange-500 text-white' :
                  room.status === 'RESERVED' ? 'bg-amber-500 text-white' : 
                  'bg-gray-500 text-white'
                }`}>
                  {room.status === 'AVAILABLE' && '🟢 Trống'}
                  {room.status === 'RENTED' && '🔵 Đã thuê'}
                  {room.status === 'MAINTENANCE' && (
                    <>
                      <Wrench className="h-3.5 w-3.5" /> Đang bảo trì
                    </>
                  )}
                  {room.status === 'RESERVED' && '🟠 Giữ chỗ'}
                  {room.status === 'HIDDEN' && 'Ẩn'}
                </span>

                {/* Nhãn trạng thái duyệt */}
                <div className="absolute top-2 left-2 flex flex-col gap-1">
                  {room.approvalStatus === 'PENDING' && (
                    <span className="px-2 py-0.5 bg-yellow-500/90 text-white text-[10px] font-bold rounded-md shadow-sm backdrop-blur-sm">
                      CHỜ DUYỆT
                    </span>
                  )}
                  {room.approvalStatus === 'REJECTED' && (
                    <span className="px-2 py-0.5 bg-red-500/90 text-white text-[10px] font-bold rounded-md shadow-sm backdrop-blur-sm">
                      BỊ TỪ CHỐI
                    </span>
                  )}
                </div>
              </div>

              {/* Thông tin phòng */}
              <div className="p-4 flex-1 flex flex-col">
                <h3 className="text-xl font-bold text-gray-900 mb-1 group-hover:text-primary transition-colors">
                  Phòng {room.name}
                </h3>

                <div className="flex flex-wrap items-center gap-1.5 mb-3">
                  <span className="text-xs font-medium text-gray-500">
                    {ROOM_TYPE_LABELS[(room.type as RoomType) || 'STUDIO']}
                  </span>
                  {room.hasMezzanine && <StatusBadge label="Gác lửng" tone="warning" className="text-[10px] font-medium" />}
                  {room.hasBalcony && <StatusBadge label="Ban công" tone="info" className="text-[10px] font-medium" />}
                </div>

                <div className="space-y-1.5 text-sm text-gray-600 mb-4 flex-1">
                  <p className="flex justify-between">
                    <span>Giá thuê:</span> 
                    <strong className="text-primary">{room.price?.toLocaleString()}đ</strong>
                  </p>
                  <p className="flex justify-between">
                    <span>Diện tích:</span> 
                    <strong className="text-gray-900">{room.area} m²</strong>
                  </p>
                  <p className="text-xs text-gray-500 mt-2 line-clamp-2" title={room.amenities?.join(', ')}>
                    Tiện ích: {room.amenities?.length ? room.amenities.join(', ') : 'Chưa cập nhật'}
                  </p>
                </div>

                {/* AI Safety Score */}
                {(room as any).safetyScore != null && (
                  <div className="mb-3 flex items-center gap-2 text-xs">
                    {(room as any).safetyScore >= 80 ? (
                      <span className="flex items-center gap-1 text-green-700 bg-green-50 px-2 py-1 rounded border border-green-200">
                        <ShieldCheck className="h-3 w-3" /> AI: {(room as any).safetyScore}/100
                      </span>
                    ) : (room as any).safetyScore >= 50 ? (
                      <span className="flex items-center gap-1 text-yellow-700 bg-yellow-50 px-2 py-1 rounded border border-yellow-200">
                        <AlertTriangle className="h-3 w-3" /> AI: {(room as any).safetyScore}/100
                      </span>
                    ) : (
                      <span className="flex items-center gap-1 text-red-700 bg-red-50 px-2 py-1 rounded border border-red-200">
                        <ShieldAlert className="h-3 w-3" /> AI: {(room as any).safetyScore}/100
                      </span>
                    )}
                  </div>
                )}

                {/* NÚT THAO TÁC */}
                <div className="flex gap-2 border-t pt-4 mt-auto flex-wrap" onClick={e => e.stopPropagation()}>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="flex-1 text-blue-600 border-blue-200 hover:bg-blue-50"
                    onClick={(e) => { e.stopPropagation(); handleOpenEdit(room); }}
                  >
                    <Edit className="h-4 w-4 mr-1.5" /> Sửa
                  </Button>

                  {/* NÚT BẢO TRÌ / HOÀN THÀNH BẢO TRÌ */}
                  {room.status === 'MAINTENANCE' ? (
                    <Button
                      variant="outline"
                      size="sm"
                      className="flex-1 text-emerald-600 border-emerald-200 hover:bg-emerald-50"
                      onClick={(e) => { 
                        e.stopPropagation(); 
                        openMaintenanceConfirm(room, 'complete');
                      }}
                      disabled={isMaintenanceLoading && maintenanceRoomId === room.id}
                    >
                      {isMaintenanceLoading && maintenanceRoomId === room.id ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <>
                          <CheckCircle className="h-4 w-4 mr-1.5" /> Hoàn thành
                        </>
                      )}
                    </Button>
                  ) : (
                    <Button
                      variant="outline"
                      size="sm"
                      className="flex-1 text-orange-600 border-orange-200 hover:bg-orange-50"
                      onClick={(e) => { 
                        e.stopPropagation(); 
                        openMaintenanceConfirm(room, 'start');
                      }}
                      disabled={isMaintenanceLoading && maintenanceRoomId === room.id}
                    >
                      {isMaintenanceLoading && maintenanceRoomId === room.id ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <>
                          <Wrench className="h-4 w-4 mr-1.5" /> Bảo trì
                        </>
                      )}
                    </Button>
                  )}

                  {room.status === 'AVAILABLE' ? (
                    <Link to={`/landlord/contracts/create?roomId=${room.id}`} className="flex-1" onClick={e => e.stopPropagation()}>
                      <Button variant="outline" size="sm" className="w-full text-green-600 border-green-200 hover:bg-green-50">
                        <FileSignature className="h-4 w-4 mr-1.5" /> Tạo HĐ
                      </Button>
                    </Link>
                  ) : (
                    <Link to={`/landlord/contracts/${room.id}`} className="flex-1" onClick={e => e.stopPropagation()}>
                      <Button variant="outline" size="sm" className="w-full text-purple-600 border-purple-200 hover:bg-purple-50">
                        <FileText className="h-4 w-4 mr-1.5" /> Xem HĐ
                      </Button>
                    </Link>
                  )}

                  <Button
                    variant="outline"
                    size="sm"
                    className="text-violet-500 border-violet-200 hover:bg-violet-50 px-2"
                    onClick={(e) => { e.stopPropagation(); handleDuplicate(room); }}
                    title="Nhân bản phòng này"
                  >
                    <Copy className="h-4 w-4" />
                  </Button>

                  <Button
                    variant="outline"
                    size="sm"
                    className="text-red-500 border-red-200 hover:bg-red-50 px-2"
                    onClick={(e) => { e.stopPropagation(); setDeleteRoomConfirm(room); }}
                    title="Xóa phòng này"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* --- MODAL THÊM/SỬA PHÒNG --- */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-xl w-full max-w-4xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh]">
            <div className="px-6 py-4 border-b flex justify-between items-center bg-gray-50 flex-shrink-0">
              <h2 className="text-xl font-bold">{editingId ? 'Cập nhật phòng' : 'Thêm phòng mới'}</h2>
              <button onClick={() => setShowModal(false)} className="text-gray-400 hover:text-gray-600"><X className="h-5 w-5" /></button>
            </div>
            
            <div className="p-6 overflow-y-auto flex-1">
              <form id="room-form" onSubmit={handleSubmit} className="space-y-6">
                
                {/* Thông tin cơ bản */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Tên phòng (VD: 101) *</label>
                    <input required type="text" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} className="w-full border border-gray-300 p-2.5 rounded-md focus:ring-2 focus:ring-primary outline-none" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Diện tích (m²) *</label>
                    <input required type="number" step="0.1" value={formData.area} onChange={e => setFormData({...formData, area: e.target.value})} className="w-full border border-gray-300 p-2.5 rounded-md focus:ring-2 focus:ring-primary outline-none" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Giá thuê (VND) *</label>
                    <input required type="number" value={formData.price} onChange={e => setFormData({...formData, price: e.target.value})} className="w-full border border-gray-300 p-2.5 rounded-md focus:ring-2 focus:ring-primary outline-none" />
                  </div>
                </div>

                {/* Số người tối đa */}
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-1 flex items-center gap-1">
                    <Users className="h-3.5 w-3.5 text-gray-500" /> Số người tối đa
                  </label>
                  <input type="number" min="1" value={formData.maxOccupants} onChange={e => setFormData({...formData, maxOccupants: e.target.value})} className="w-full border border-gray-300 p-2.5 rounded-md focus:ring-2 focus:ring-primary outline-none" placeholder="VD: 3" />
                </div>

                {/* Loại phòng + Không gian */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1 flex items-center gap-1">
                      <Layers className="h-3.5 w-3.5 text-gray-500" /> Loại phòng
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
                    <div className="flex justify-between items-end mb-2 border-b border-purple-100 pb-2">
                      <label className="block text-sm font-bold text-purple-900 flex items-center gap-1"><Sparkles className="h-4 w-4" /> Copilot Viết Mô Tả</label>
                    </div>
                    
                    <div className="mb-3 flex flex-wrap items-center gap-2">
                      <span className="text-xs text-purple-800 font-medium">Giọng văn:</span>
                      <select 
                        value={aiTone} 
                        onChange={e => setAiTone(e.target.value as any)}
                        className="text-xs border border-purple-200 rounded px-2 py-1 bg-white outline-none text-purple-900 focus:ring-1 focus:ring-purple-400"
                      >
                         <option value="SEO">🔥 Tiêu chuẩn (Chuẩn SEO)</option>
                         <option value="GENZ">🎓 Sinh viên (Gần gũi, GenZ)</option>
                         <option value="PRO">💼 Chuyên nghiệp (Dành cho Căn hộ)</option>
                      </select>
                      
                      <Button type="button" size="sm" onClick={handleGenerateAI} disabled={isGeneratingAI} className="ml-auto bg-purple-600 hover:bg-purple-700 text-white shadow-sm h-7 px-2.5 text-xs rounded-md">
                        {isGeneratingAI ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" /> : <Sparkles className="h-3.5 w-3.5 mr-1" />}
                        Tạo nội dung ngay
                      </Button>
                    </div>

                    <textarea rows={5} value={formData.description} onChange={e => setFormData({...formData, description: e.target.value})} className="w-full flex-1 border-purple-200 p-3 rounded-md focus:ring-2 focus:ring-purple-400 outline-none bg-white resize-none text-sm leading-relaxed" placeholder="Bạn có thể tự nhập mô tả hoặc sử dụng AI để tạo tự động..." />
                    <p className="text-[11px] text-purple-700 mt-2 opacity-80 italic">💡 Copilot sẽ quét Tên phòng, Giá, Diện tích và Tiện ích để tự động viết bài quảng cáo thay bạn.</p>
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
                      placeholder="VD: Không nuôi chó mèo. Thanh toán tiền mùng 5 hàng tháng. Giữ vệ sinh chung..." 
                    />
                    <p className="text-[11px] text-blue-600 mt-2 italic">Nội dung này sẽ tự động điền vào hợp đồng khi có khách thuê phòng này.</p>
                  </div>
                </div>

                {/* Upload Ảnh */}
                <div className="border-t pt-4">
                  <label className="block text-sm font-medium text-gray-700 mb-2">Hình ảnh Phòng</label>
                  <div onClick={() => fileInputRef.current?.click()} className="border-2 border-dashed border-gray-300 bg-gray-50 hover:bg-gray-100 transition rounded-lg p-4 flex flex-col items-center justify-center cursor-pointer">
                    <ImagePlus className="h-6 w-6 text-gray-400 mb-1" />
                    <span className="text-sm font-medium text-gray-600">Chọn ảnh phòng</span>
                    <input type="file" multiple accept="image/*" ref={fileInputRef} onChange={handleImageChange} className="hidden" />
                  </div>

                  {(formData.images.length > 0 || previewUrls.length > 0) && (
                    <div className="grid grid-cols-4 sm:grid-cols-6 gap-3 mt-4">
                      {formData.images.map((url, idx) => (
                        <div key={`old-${idx}`} className="relative group aspect-square rounded-lg overflow-hidden border">
                          <img src={url} alt={`old-${idx}`} className="w-full h-full object-cover" />
                          <button type="button" onClick={() => removeOldImage(idx)} className="absolute top-1 right-1 bg-red-500 text-white p-1 rounded-full opacity-0 group-hover:opacity-100 transition"><X className="h-3 w-3" /></button>
                        </div>
                      ))}
                      {previewUrls.map((url, idx) => (
                        <div key={`new-${idx}`} className="relative group aspect-square rounded-lg overflow-hidden border-2 border-primary border-dashed">
                          <img src={url} alt={`preview-${idx}`} className="w-full h-full object-cover opacity-80" />
                          <button type="button" onClick={() => removeSelectedFile(idx)} className="absolute top-1 right-1 bg-red-500 text-white p-1 rounded-full opacity-0 group-hover:opacity-100 transition"><X className="h-3 w-3" /></button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </form>
            </div>

            <div className="px-6 py-4 border-t bg-gray-50 flex justify-end gap-3 flex-shrink-0">
              <Button type="button" variant="outline" onClick={() => setShowModal(false)} disabled={isSubmitting}>Hủy</Button>
              <Button type="submit" form="room-form" disabled={isSubmitting} className="min-w-[140px]">
                {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : (editingId ? 'Lưu thay đổi' : 'Lưu phòng mới')}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* DIALOG XÁC NHẬN XÓA PHÒNG */}
      {deleteRoomConfirm && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in">
          <div className="bg-white rounded-2xl w-full max-w-sm p-6 shadow-2xl animate-in zoom-in-95">
            <div className="flex flex-col items-center text-center">
              <div className="p-3 bg-red-50 rounded-full mb-4">
                <AlertTriangle className="h-8 w-8 text-red-500" />
              </div>
              <h3 className="text-lg font-bold text-gray-900 mb-1">Xóa phòng?</h3>
              <p className="text-sm text-gray-500 mb-1">Bạn có chắc muốn xóa phòng</p>
              <p className="font-semibold text-gray-900 mb-3">“{deleteRoomConfirm.name}”?</p>
              <p className="text-xs text-red-500 bg-red-50 px-3 py-2 rounded-lg border border-red-100">
                ⚠️ Hành động này không thể hoàn tác. Phòng đang có hợp đồng sẽ không thể xóa.
              </p>
            </div>
            <div className="flex gap-3 mt-6">
              <Button variant="outline" className="flex-1" onClick={() => setDeleteRoomConfirm(null)} disabled={isDeleting}>Hủy</Button>
              <Button className="flex-1 bg-red-600 hover:bg-red-700 text-white" onClick={() => {
                // handleDeleteRoom function was missing in original, added here for completeness
                if (!deleteRoomConfirm) return;
                setIsDeleting(true);
                propertyApi.deleteRoom(deleteRoomConfirm.id)
                  .then(() => {
                    toast.success(`Đã xóa phòng “${deleteRoomConfirm.name}”!`);
                    setDeleteRoomConfirm(null);
                    fetchData();
                  })
                  .catch((error: any) => {
                    toast.error(error?.response?.data?.message || 'Xóa phòng thất bại.');
                  })
                  .finally(() => setIsDeleting(false));
              }} disabled={isDeleting}>
                {isDeleting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Trash2 className="h-4 w-4 mr-2" />}
                Xóa phòng
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL XÁC NHẬN BẢO TRÌ */}
      {showMaintenanceConfirm && pendingMaintenanceAction && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in">
          <div className="bg-white rounded-2xl w-full max-w-sm p-6 shadow-2xl">
            <div className="flex flex-col items-center text-center">
              <div className={`p-3 rounded-full mb-4 ${pendingMaintenanceAction.type === 'start' ? 'bg-orange-50' : 'bg-emerald-50'}`}>
                {pendingMaintenanceAction.type === 'start' ? 
                  <Wrench className="h-8 w-8 text-orange-500" /> : 
                  <CheckCircle className="h-8 w-8 text-emerald-500" />
                }
              </div>
              
              <h3 className="text-lg font-bold text-gray-900 mb-1">
                {pendingMaintenanceAction.type === 'start' ? 'Bắt đầu bảo trì phòng?' : 'Hoàn thành bảo trì phòng?'}
              </h3>
              
              <p className="text-sm text-gray-600 mb-1">Phòng: <span className="font-semibold">"{pendingMaintenanceAction.roomName}"</span></p>

              <p className="text-xs text-gray-500 bg-gray-50 p-3 rounded-lg border border-gray-100">
                {pendingMaintenanceAction.type === 'start' 
                  ? 'Phòng sẽ không hiển thị cho khách thuê trong thời gian bảo trì.' 
                  : 'Phòng sẽ trở về trạng thái Trống và có thể cho thuê lại.'}
              </p>
            </div>

            <div className="flex gap-3 mt-6">
              <Button 
                variant="outline" 
                className="flex-1" 
                onClick={() => setShowMaintenanceConfirm(false)}
                disabled={isMaintenanceLoading}
              >
                Hủy
              </Button>
              <Button 
                className={`flex-1 ${pendingMaintenanceAction.type === 'start' ? 'bg-orange-600 hover:bg-orange-700' : 'bg-emerald-600 hover:bg-emerald-700'} text-white`}
                onClick={executeMaintenanceAction}
                disabled={isMaintenanceLoading}
              >
                {isMaintenanceLoading ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                ) : (
                  pendingMaintenanceAction.type === 'start' ? 'Xác nhận Bảo trì' : 'Xác nhận Hoàn thành'
                )}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL CẢNH BÁO KHÔNG ĐƯỢC BẢO TRÌ */}
      {showCannotMaintenanceModal && cannotMaintenanceRoom && (
        <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl w-full max-w-md p-6 shadow-2xl">
            <div className="flex flex-col items-center text-center">
              <div className="p-4 bg-red-50 rounded-full mb-4">
                <AlertTriangle className="h-10 w-10 text-red-500" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-2">Không thể bắt đầu bảo trì</h3>
              <p className="text-gray-600 mb-1">Phòng <span className="font-semibold">"{cannotMaintenanceRoom.name}"</span></p>
              <p className="text-sm text-red-600 bg-red-50 p-4 rounded-xl border border-red-100">
                Phòng hiện đang ở trạng thái <strong>
                  {cannotMaintenanceRoom.status === 'RENTED' ? 'ĐANG CHO THUÊ' : 'ĐÃ ĐẶT CỌC'}
                </strong>
              </p>
            </div>

            <div className="mt-6">
              <Button 
                onClick={() => {
                  setShowCannotMaintenanceModal(false);
                  setCannotMaintenanceRoom(null);
                }}
                className="w-full"
              >
                Tôi đã hiểu
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* --- MODAL XEM TRƯỚC NỘI DUNG AI (PREVIEW) --- */}
      {aiContentPreview && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-xl w-full max-w-2xl overflow-hidden shadow-2xl flex flex-col">
            <div className="bg-purple-50 px-5 py-4 border-b border-purple-100 flex justify-between items-center flex-shrink-0">
               <h3 className="text-lg font-bold text-purple-900 flex items-center gap-2">
                 <Sparkles className="h-5 w-5 text-purple-600" />
                 Bản nháp từ Copilot
               </h3>
               <button onClick={() => setAiContentPreview(null)} className="text-gray-400 hover:text-gray-600 p-1"><X className="h-5 w-5" /></button>
            </div>
            
            <div className="p-6 bg-gray-50 flex-1 overflow-y-auto max-h-[60vh]">
               <div className="bg-white border rounded-xl p-5 shadow-sm text-sm leading-relaxed text-gray-800 whitespace-pre-line relative">
                  <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-purple-100/50 flex flex-col items-center pointer-events-none select-none">
                     <Sparkles className="h-24 w-24 mb-2" />
                     <span className="font-black text-3xl tracking-widest uppercase">AI Generated</span>
                  </div>
                  <div className="relative z-10">{aiContentPreview}</div>
               </div>
            </div>

            <div className="p-4 border-t bg-white flex justify-between items-center">
               <Button 
                 variant="outline" 
                 onClick={handleGenerateAI}
                 disabled={isGeneratingAI}
                 className="text-purple-600 hover:bg-purple-50"
               >
                 {isGeneratingAI ? <Loader2 className="w-4 h-4 animate-spin mr-2"/> : <Sparkles className="w-4 h-4 mr-2" />}
                 Thử lại văn phong khác
               </Button>
               
               <div className="flex gap-3">
                 <Button variant="ghost" onClick={() => setAiContentPreview(null)}>Hủy bỏ</Button>
                 <Button className="bg-purple-600 hover:bg-purple-700 font-bold" onClick={handleAcceptAiContent}>
                   <CheckCircle className="w-4 h-4 mr-2" />
                   Sử dụng nội dung này
                 </Button>
               </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

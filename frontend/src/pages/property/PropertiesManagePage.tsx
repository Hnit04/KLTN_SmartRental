import React, { useEffect, useState, useRef } from 'react';
import { Link } from 'react-router-dom';
import { 
  Building, MapPin, Plus, Loader2, Edit, X, ImagePlus, 
  LocateFixed, AlertTriangle, Home, CheckCircle,
  Sparkles, EyeOff, Eye, ChevronRight, ChevronLeft,
  Zap, Droplets, Wifi, FileText
} from 'lucide-react';
import { propertyApi } from '@/api/propertyApi';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { PageHeader } from '@/components/ui/PageHeader';
import { EmptyState } from '@/components/ui/EmptyState';
import { Skeleton } from '@/components/ui/Skeleton';
import StatusBadge from '@/components/shared/StatusBadge';
import { toast } from 'sonner';
import type { Property } from '@/types/index';
import UpgradePromptModal from '@/components/subscription/UpgradePromptModal';
import { vipApi } from '@/api/vipApi';
import { useAutoSaveForm } from '@/hooks/useAutoSaveForm';
import { CurrencyInput } from '@/components/ui/CurrencyInput';

// Danh sách 63 tỉnh/thành phố Việt Nam
const VIETNAM_CITIES = [
  "An Giang", "Bà Rịa - Vũng Tàu", "Bắc Giang", "Bắc Kạn", "Bạc Liêu",
  "Bắc Ninh", "Bến Tre", "Bình Định", "Bình Dương", "Bình Phước",
  "Bình Thuận", "Cà Mau", "Cần Thơ", "Cao Bằng", "Đắk Lắk",
  "Đắk Nông", "Điện Biên", "Đồng Nai", "Đồng Tháp", "Gia Lai",
  "Hà Giang", "Hà Nam", "Hà Nội", "Hà Tĩnh", "Hải Dương",
  "Hải Phòng", "Hậu Giang", "Hòa Bình", "Hưng Yên", "Khánh Hòa",
  "Kiên Giang", "Kon Tum", "Lai Châu", "Lâm Đồng", "Lạng Sơn",
  "Lào Cai", "Long An", "Nam Định", "Nghệ An", "Ninh Bình",
  "Ninh Thuận", "Phú Thọ", "Phú Yên", "Quảng Bình", "Quảng Nam",
  "Quảng Ngãi", "Quảng Ninh", "Quảng Trị", "Sóc Trăng", "Sơn La",
  "Tây Ninh", "Thái Bình", "Thái Nguyên", "Thanh Hóa", "Thừa Thiên - Huế",
  "Tiền Giang", "Hồ Chí Minh", "Trà Vinh", "Tuyên Quang", "Vĩnh Long",
  "Vĩnh Phúc", "Yên Bái", "Đà Nẵng"
];

export default function PropertiesManagePage() {
  const getPropertyStatusBadge = (status?: string) => {
    switch (status) {
      case 'PENDING':
        return <StatusBadge label="Chờ duyệt" tone="warning" className="text-[10px] font-bold uppercase" />;
      case 'APPROVED':
        return <StatusBadge label="Đã duyệt" tone="success" className="text-[10px] font-bold uppercase" />;
      case 'REJECTED':
        return <StatusBadge label="Bị từ chối" tone="danger" className="text-[10px] font-bold uppercase" />;
      case 'HIDDEN':
        return <StatusBadge label="Đang ẩn" tone="neutral" className="text-[10px] font-bold uppercase" />;
      default:
        return <StatusBadge label={status || 'Không rõ'} tone="neutral" className="text-[10px] font-bold uppercase" />;
    }
  };

  const [properties, setProperties] = useState<Property[]>([]);
  const [loading, setLoading] = useState(true);

  // --- STATE CHO MODAL THÊM/SỬA KHU TRỌ ---
  const [showModal, setShowModal] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [editingId, setEditingId] = useState<number | string | null>(null);
  const [isFetchingLocation, setIsFetchingLocation] = useState(false); 
  const [propStep, setPropStep] = useState(1);
  
  // --- STATE CẬP NHẬT TRẠNG THÁI (ẨN/HIỆN) ---
  const [statusConfirm, setStatusConfirm] = useState<Property | null>(null);
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);

  // --- STATE CHO VIP LIMIT ---
  const [vipLimit, setVipLimit] = useState<{
    isOpen: boolean; limitType: string; currentTier: string; currentCount: number; maxAllowed: number; message: string;
  }>({ isOpen: false, limitType: '', currentTier: '', currentCount: 0, maxAllowed: 0, message: '' });
  
  const INITIAL_PROPERTY_DATA = {
    name: '', city: '', district: '', address: '',
    elecPrice: '', waterPrice: '', internetPrice: '', description: '',
    latitude: undefined as number | undefined,
    longitude: undefined as number | undefined,
    images: [] as string[],
    version: undefined as number | undefined
  };

  const { formData, setFormData, clearDraft } = useAutoSaveForm(
    'draft_property_form',
    INITIAL_PROPERTY_DATA,
    showModal && !editingId
  );

  // --- STATE CHO UPLOAD ẢNH ---
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [previewUrls, setPreviewUrls] = useState<string[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetchProperties();
  }, []);

  const fetchProperties = async () => {
    try {
      const res = await propertyApi.getMyProperties();
      setProperties((res as any).data || res);
    } catch (error) {
      toast.error('Không thể tải danh sách khu trọ');
    } finally {
      setLoading(false);
    }
  };

  // Mở modal Thêm mới
  const handleOpenCreate = async () => {
    try {
      const res = await vipApi.getMyPlan();
      const plan = (res as any).data || res;
      
      // Kiểm tra giới hạn khu trọ
      if (plan.maxProperties !== -1 && plan.currentPropertyCount >= plan.maxProperties) {
        setVipLimit({
          isOpen: true,
          limitType: 'PROPERTY',
          currentTier: plan.tier,
          currentCount: plan.currentPropertyCount,
          maxAllowed: plan.maxProperties,
          message: `Gói ${plan.tier} chỉ cho phép tạo tối đa ${plan.maxProperties} khu trọ.`
        });
        return; // Dừng lại, không mở modal
      }
    } catch (error) {
      console.error("Lỗi khi kiểm tra gói VIP:", error);
      // Vẫn tiếp tục mở modal nếu lỗi để không chặn người dùng do lỗi mạng
    }

    setEditingId(null);
    setEditingId(null);
    // Lưu ý: Không reset form ở đây để useAutoSaveForm có thể khôi phục draft khi showModal = true
    // setFormData(INITIAL_PROPERTY_DATA);
    setSelectedFiles([]);
    setPreviewUrls([]);
    setPropStep(1);
    setShowModal(true);
  };

  // Mở modal Sửa
  const handleOpenEdit = (property: Property) => {
    setEditingId(property.id);
    setFormData({
      name: property.name || '', city: property.city || '', district: property.district || '', address: property.address || '',
      elecPrice: property.elecPrice?.toString() || '', waterPrice: property.waterPrice?.toString() || '',
      internetPrice: property.internetPrice?.toString() || '', description: property.description || '',
      latitude: property.latitude ?? undefined,
      longitude: property.longitude ?? undefined,
      images: property.images || [],
      version: property.version
    });
    setSelectedFiles([]);
    setPreviewUrls([]);
    setPropStep(1);
    setShowModal(true);
  };

  const handleStatusChangeConfirmed = async () => {
  if (!statusConfirm) return;
  setIsUpdatingStatus(true);
  
  const isHiding = statusConfirm.status !== 'HIDDEN'; 
  const newStatus = isHiding ? 'HIDDEN' : 'APPROVED';
  const actionText = isHiding ? 'ẩn' : 'hiển thị lại';

  try {
    if (isHiding) {
      const roomsRes = await propertyApi.getRooms(statusConfirm.id);
      const rooms = (roomsRes as any).data || roomsRes;

      const hasActiveRoom = rooms.some((room: any) => 
        room.status === 'RENTED' || room.status === 'RESERVED'
      );

      if (hasActiveRoom) {
        toast.error(`Không thể ẩn khu trọ vì hiện đang có phòng có người thuê hoặc đã đặt cọc!`);
        setStatusConfirm(null);
        return; // Dừng thực hiện tiếp
      }
    }

    await propertyApi.updatePropertyStatus(statusConfirm.id, newStatus);
    toast.success(`Đã ${actionText} khu trọ “${statusConfirm.name}”!`);
    
    setStatusConfirm(null);
    fetchProperties(); 
  } catch (error: any) {
    const errorMsg = error?.response?.data?.message || `Thao tác ${actionText} thất bại.`;
    toast.error(errorMsg);
  } finally {
    setIsUpdatingStatus(false);
  }
};

  const handleGetLocation = () => {
    if (!navigator.geolocation) {
      toast.error("Trình duyệt của bạn không hỗ trợ lấy vị trí.");
      return;
    }

    setIsFetchingLocation(true);
    const toastId = toast.loading("Đạng lấy định vị... Vui lòng chờ!");

    const watchId = navigator.geolocation.watchPosition(
      async (position) => {
        navigator.geolocation.clearWatch(watchId);

        try {
          const lat = position.coords.latitude;
          const lon = position.coords.longitude;

          const response = await propertyApi.reverseGeocode(lat, lon);
          
          let data = (response as any).data || response;
          if (typeof data === 'string') {
            data = JSON.parse(data);
          }

          if (data) {
            const addr = data.address || {};
            const fullAddress = (data.display_name || data.formatted_address || "").toLowerCase();
            
            const street = addr.road || addr.pedestrian || '';
            const houseNumber = addr.house_number ? `${addr.house_number} ` : '';
            
            const removeAccents = (str: string) => {
              if (!str) return '';
              return str.toString().normalize('NFD')
                        .replace(/[\u0300-\u036f]/g, '')
                        .replace(/đ/g, 'd').replace(/Đ/g, 'D');
            };

            const normalizeCitySearch = (s: string) => {
              if (!s) return '';
              let res = removeAccents(s.toLowerCase());
              res = res.replace(/^(thanh pho|tinh|tp\.?|quan|huyen|thi xa)\s+/i, '')
                       .replace(/\s+(city|province|town|municipality)$/i, '')
                       .replace(/-/g, ' ') 
                       .trim();
              return res;
            };

            const candidateCities = [
              addr.state, addr.city, addr.province, addr.town, addr.county, addr.region
            ].filter(Boolean);
            
            let matchedCity = '';
            
            for (const candidate of candidateCities) {
              const stripped = normalizeCitySearch(candidate);
              const found = VIETNAM_CITIES.find(city => {
                const opt = normalizeCitySearch(city);
                return opt === stripped || opt.includes(stripped) || stripped.includes(opt);
              });
              if (found) { 
                matchedCity = found; 
                break; 
              }
            }

            if (!matchedCity && fullAddress) {
               const noAccentFullAddr = removeAccents(fullAddress);
               const foundFallback = VIETNAM_CITIES.find(city => {
                 return noAccentFullAddr.includes(normalizeCitySearch(city));
               });
               if (foundFallback) {
                 matchedCity = foundFallback;
               }
            }
            
            const rawCity = addr.city || '';
            const rawDistrict = addr.county || addr.suburb || addr.city_district || addr.district || '';
            let finalDistrict = rawDistrict;
            if (rawCity && normalizeCitySearch(rawCity) !== normalizeCitySearch(matchedCity)) {
              finalDistrict = rawCity;
            }
            const stripPrefixOnly = (s: string) => s ? s.replace(/^(Thành phố|Tỉnh|Tp\.?|Quận|Huyện|Thị xã)\s+/i, '').trim() : '';
            
            setFormData(prev => ({
              ...prev,
              city: matchedCity,
              district: stripPrefixOnly(finalDistrict),
              address: `${houseNumber}${street}`.trim() || fullAddress.split(',')[0],
              latitude: lat,
              longitude: lon
            }));
            
            if (matchedCity) {
              toast.success("Đã lấy được vị trí hiện tại!", { id: toastId });
            } else {
              toast.warning(`Đã lấy tọa độ nhưng chưa tự nhận diện được tỉnh.`, { id: toastId });
            }
          }
        } catch (error) {
          console.error("Lỗi Geocode:", error);
          toast.error("Không thể phân tích địa chỉ từ tọa độ.", { id: toastId });
        } finally {
          setIsFetchingLocation(false);
        }
      },
      (error) => {
        navigator.geolocation.clearWatch(watchId);
        setIsFetchingLocation(false);
        
        let errorMsg = "Lỗi không xác định khi lấy vị trí.";
        if (error.code === 1) errorMsg = "Bị từ chối! Hãy bật định vị trên thiết bị và cấp quyền.";
        else if (error.code === 2) errorMsg = "Không thể xác định tọa độ GPS của thiết bị này.";
        else if (error.code === 3) errorMsg = "Quá thời gian định vị. Vui lòng thử lại.";

        toast.error(errorMsg, { id: toastId });
      },
      { enableHighAccuracy: false, timeout: 15000, maximumAge: 0 }
    );
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const filesArray = Array.from(e.target.files);
      const validFiles = filesArray.filter(file => file.size <= 5 * 1024 * 1024);
      if (validFiles.length < filesArray.length) {
        toast.warning("Một số ảnh quá lớn (>5MB) đã bị bỏ qua.");
      }
      setSelectedFiles(prev => [...prev, ...validFiles]);
      const newPreviews = validFiles.map(file => URL.createObjectURL(file));
      setPreviewUrls(prev => [...prev, ...newPreviews]);
    }
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const removeSelectedFile = (index: number) => {
    setSelectedFiles(prev => prev.filter((_, i) => i !== index));
    setPreviewUrls(prev => prev.filter((_, i) => i !== index));
  };

  const removeOldImage = (index: number) => {
    setFormData(prev => ({
      ...prev,
      images: prev.images.filter((_, i) => i !== index)
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name || !formData.address || !formData.city) {
      toast.warning('Vui lòng nhập Tên, Tỉnh/TP và Địa chỉ!');
      return;
    }

    try {
      setIsSubmitting(true);
      
      let newlyUploadedUrls: string[] = [];
      if (selectedFiles.length > 0) {
        toast.info("Đang tải ảnh lên hệ thống...");
        const uploadRes = await propertyApi.uploadImages(selectedFiles);
        newlyUploadedUrls = (uploadRes as any).data || uploadRes; 
      }

      const finalImagesList = [...formData.images, ...newlyUploadedUrls];

      const payload = {
        name: formData.name, city: formData.city, district: formData.district, address: formData.address,
        description: formData.description,
        latitude: formData.latitude,
        longitude: formData.longitude,
        elecPrice: Number(formData.elecPrice) || 0, waterPrice: Number(formData.waterPrice) || 0, internetPrice: Number(formData.internetPrice) || 0,
        images: finalImagesList,
        version: editingId ? formData.version : undefined
      };

      if (editingId) {
        await propertyApi.updateProperty(editingId, payload);
        toast.success('Cập nhật khu trọ thành công!');
      } else {
        await propertyApi.createProperty(payload);
        toast.success('Thêm khu trọ mới thành công! Admin sẽ kiểm duyệt trước khi hiển thị công khai.');
        clearDraft();
      }
      
      setShowModal(false);
      fetchProperties(); 
    } catch (error: any) {
      const errResp = error.response;
      const errData = errResp?.data;

      if (errResp?.status === 409 && errData?.code === 'CONFLICT_RESOURCE_VERSION') {
        setIsSubmitting(false);
        toast.error('Dữ liệu đã được thay đổi ở nơi khác. Vui lòng tải lại trước khi lưu.', {
          action: {
            label: 'Tải lại',
            onClick: () => { 
              fetchProperties(); 
              setShowModal(false); 
            }
          },
          duration: 8000
        });
        return;
      }

      if (errData?.type === 'VIP_LIMIT_EXCEEDED' || errData?.code === 'VIP_LIMIT_EXCEEDED') {
        setShowModal(false);
        setVipLimit({
          isOpen: true,
          limitType: errData.limitType,
          currentTier: errData.currentTier,
          currentCount: errData.currentCount,
          maxAllowed: errData.maxAllowed,
          message: errData.message,
        });
      } else {
        const msg = errData?.message || (editingId ? 'Cập nhật thất bại' : 'Thêm mới thất bại');
        toast.error(msg);
      }
      console.error(error);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-6 pb-10">
        <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
          <div className="space-y-2">
            <Skeleton className="h-9 w-56 rounded-lg" />
            <Skeleton className="h-4 w-72 max-w-full rounded-md" />
          </div>
          <Skeleton className="h-10 w-40 rounded-lg" />
        </div>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <Skeleton key={i} className="h-[320px] rounded-2xl" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-10">
      <PageHeader
        title="Khu trọ của tôi"
        description="Quản lý tòa nhà, khu trọ và truy cập nhanh vào từng danh sách phòng."
        actions={
          <Button onClick={handleOpenCreate} className="gap-2 shadow-soft">
            <Plus className="h-4 w-4" /> Thêm khu trọ
          </Button>
        }
      />

      {properties.length === 0 ? (
        <EmptyState
          icon={Building}
          title="Chưa có khu trọ"
          description="Tạo khu trọ đầu tiên để thêm phòng và đăng tin cho khách thuê."
          action={
            <Button onClick={handleOpenCreate} className="gap-2 shadow-soft">
              <Plus className="h-4 w-4" /> Thêm khu trọ
            </Button>
          }
        />
      ) : (
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 md:gap-5 lg:grid-cols-3">
        {properties.map((property) => (
          <Card key={property.id} className={`group relative flex flex-col overflow-hidden border-border/80 shadow-soft transition-all duration-200 hover:shadow-card ${property.status === 'HIDDEN' ? 'opacity-75 grayscale-[0.5]' : ''}`}>
            {/* Nút sửa */}
            <button onClick={() => handleOpenEdit(property)} className="absolute top-2 right-10 z-10 bg-white/90 p-1.5 rounded-md shadow opacity-0 group-hover:opacity-100 transition hover:bg-blue-50 text-blue-600">
              <Edit className="h-4 w-4" />
            </button>
            
            {/* Nút Ẩn/Hiện */}
            <button
              onClick={() => setStatusConfirm(property)}
              className={`absolute top-2 right-2 z-10 bg-white/90 p-1.5 rounded-md shadow opacity-0 group-hover:opacity-100 transition ${property.status === 'HIDDEN' ? 'hover:bg-green-50 text-green-600' : 'hover:bg-orange-50 text-orange-500'}`}
              title={property.status === 'HIDDEN' ? "Hiện lại khu trọ" : "Ẩn khu trọ"}
            >
              {property.status === 'HIDDEN' ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
            </button>

            {/* Ảnh bìa */}
            <div className="h-40 bg-gray-200 relative">
              {property.images && property.images.length > 0 ? (
                <img src={property.images[0]} alt="cover" className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-gray-400"><Building className="h-10 w-10 opacity-50" /></div>
              )}

              {/* NHÃN TRẠNG THÁI */}
              <div className="absolute top-2 left-2 flex gap-1">
                {getPropertyStatusBadge(property.status)}
              </div>
            </div>

            <div className="p-5 flex-1 flex flex-col">
              {(property.status === 'REJECTED' || (property as any).approvalStatus === 'REJECTED') && property.moderationReason && (
                <div className="mb-3 flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 p-2 text-xs text-red-700">
                  <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0" />
                  <div>
                    <p className="font-semibold">Lý do từ chối:</p>
                    <p className="line-clamp-2">{property.moderationReason}</p>
                  </div>
                </div>
              )}
              <h3 className="text-lg font-bold text-gray-900 mb-1 truncate pr-14">{property.name}</h3>
              <div className="flex items-start gap-1.5 text-sm text-gray-500 mb-3 h-10">
                <MapPin className="h-4 w-4 flex-shrink-0 mt-0.5" />
                <span className="line-clamp-2">{property.address}, {property.district}, {property.city}</span>
              </div>

              <div className="flex gap-3 text-xs mb-4">
                <div className="flex items-center gap-1 text-gray-500">
                  <Home className="h-3.5 w-3.5" />
                  <span>{(property as any).totalRooms ?? '?'} phòng</span>
                </div>
                <div className="flex items-center gap-1 text-green-600 font-medium">
                  <CheckCircle className="h-3.5 w-3.5" />
                  <span>{(property as any).availableRooms ?? '?'} trống</span>
                </div>
              </div>

              <div className="mt-auto">
                <Link to={`/landlord/properties/${property.id}`}><Button variant="secondary" className="w-full">Quản lý phòng</Button></Link>
              </div>
            </div>
          </Card>
        ))}
      </div>
      )}

      {/* MODAL THÊM / SỬA KHU TRỌ */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-xl w-full max-w-2xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh]">
            <div className="px-6 py-4 border-b flex flex-col bg-muted/40 flex-shrink-0 relative">
              <button onClick={() => setShowModal(false)} className="absolute top-4 right-4 text-gray-400 hover:text-gray-600"><X className="h-5 w-5" /></button>
              <h2 className="text-xl font-bold text-gray-800 mb-4">{editingId ? 'Cập nhật Khu trọ' : 'Thêm Khu trọ mới'}</h2>
              
              {/* Stepper Header */}
              <div className="flex items-center justify-between relative">
                <div className="absolute left-0 top-1/2 -translate-y-1/2 w-full h-1 bg-gray-200 rounded-full z-0"></div>
                <div 
                  className="absolute left-0 top-1/2 -translate-y-1/2 h-1 bg-primary rounded-full z-0 transition-all duration-300" 
                  style={{ width: `${((propStep - 1) / 2) * 100}%` }}
                ></div>
                
                <div className="relative z-10 flex flex-col items-center gap-1 cursor-pointer" onClick={() => setPropStep(1)}>
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm transition-colors ${propStep >= 1 ? 'bg-primary text-white' : 'bg-gray-200 text-gray-500'}`}>1</div>
                  <span className={`text-[10px] font-medium ${propStep >= 1 ? 'text-primary' : 'text-gray-500'}`}>Cơ bản</span>
                </div>
                <div className="relative z-10 flex flex-col items-center gap-1 cursor-pointer" onClick={() => { if(formData.name && formData.city && formData.address) setPropStep(2); else toast.warning('Điền đủ thông tin cơ bản trước') }}>
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm transition-colors ${propStep >= 2 ? 'bg-primary text-white' : 'bg-gray-200 text-gray-500'}`}>2</div>
                  <span className={`text-[10px] font-medium ${propStep >= 2 ? 'text-primary' : 'text-gray-500'}`}>Bảng giá</span>
                </div>
                <div className="relative z-10 flex flex-col items-center gap-1 cursor-pointer" onClick={() => { if(formData.name && formData.city && formData.address) setPropStep(3); else toast.warning('Điền đủ thông tin cơ bản trước') }}>
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm transition-colors ${propStep >= 3 ? 'bg-primary text-white' : 'bg-gray-200 text-gray-500'}`}>3</div>
                  <span className={`text-[10px] font-medium ${propStep >= 3 ? 'text-primary' : 'text-gray-500'}`}>Hình ảnh</span>
                </div>
              </div>
            </div>
            
            <div className="p-6 overflow-y-auto flex-1">
              <form id="property-form" onSubmit={(e) => {
                e.preventDefault();
                if (propStep < 3) {
                  if (propStep === 1 && (!formData.name || !formData.city || !formData.address)) {
                    toast.warning('Vui lòng điền đủ thông tin bắt buộc (*)');
                    return;
                  }
                  setPropStep(propStep + 1);
                } else {
                  handleSubmit(e);
                }
              }} className="space-y-4">
                
                {/* STEP 1: Thông tin cơ bản */}
                {propStep === 1 && (
                  <div className="space-y-4 animate-in slide-in-from-right-4">
                    <div className="bg-blue-50/50 p-4 rounded-lg border border-blue-100 mb-2">
                      <h3 className="font-semibold text-blue-900 flex items-center gap-2 mb-1"><Building className="h-4 w-4" /> Thông tin Khu trọ</h3>
                      <p className="text-xs text-blue-700">Nhập thông tin địa chỉ chính xác để khách thuê dễ dàng tìm kiếm.</p>
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Tên khu trọ / Tòa nhà *</label>
                      <input type="text" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} className="w-full border p-2.5 rounded-md focus:ring-2 focus:ring-primary outline-none" placeholder="VD: Trọ Sinh Viên KTX..." />
                    </div>
                    
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Tỉnh / Thành phố *</label>
                        <select
                          className="w-full border p-2.5 rounded-md focus:ring-2 focus:ring-primary outline-none bg-white"
                          value={formData.city}
                          onChange={e => {
                            const selectedCity = e.target.value;
                            setFormData(prev => {
                              const newData = { ...prev, city: selectedCity };
                              // Gợi ý giá dịch vụ cơ bản theo khu vực
                              if (!prev.elecPrice && !prev.waterPrice && !prev.internetPrice) {
                                if (selectedCity === 'Hồ Chí Minh' || selectedCity === 'Hà Nội' || selectedCity === 'Đà Nẵng') {
                                  newData.elecPrice = '3500';
                                  newData.waterPrice = '20000';
                                  newData.internetPrice = '100000';
                                } else if (selectedCity) {
                                  newData.elecPrice = '3000';
                                  newData.waterPrice = '15000';
                                  newData.internetPrice = '50000';
                                }
                              }
                              return newData;
                            });
                          }}
                        >
                          <option value="">-- Chọn Tỉnh/TP --</option>
                          {VIETNAM_CITIES.map(city => (
                            <option key={city} value={city}>{city}</option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Quận / Huyện</label>
                        <input type="text" value={formData.district} onChange={e => setFormData({...formData, district: e.target.value})} className="w-full border p-2.5 rounded-md focus:ring-2 focus:ring-primary outline-none" placeholder="VD: Gò Vấp" />
                      </div>
                    </div>
                    <div>
                      <div className="flex justify-between items-end mb-1">
                        <label className="block text-sm font-medium text-gray-700">Địa chỉ chi tiết *</label>
                        <button 
                          type="button" 
                          onClick={handleGetLocation}
                          disabled={isFetchingLocation}
                          className="text-xs font-bold text-blue-600 hover:text-blue-800 flex items-center gap-1 bg-blue-50 px-2 py-1 rounded transition-colors"
                        >
                          {isFetchingLocation ? <Loader2 className="h-3 w-3 animate-spin" /> : <LocateFixed className="h-3 w-3" />}
                          {isFetchingLocation ? "Đang định vị..." : "Lấy vị trí hiện tại"}
                        </button>
                      </div>
                      <input type="text" value={formData.address} onChange={e => setFormData({...formData, address: e.target.value})} className="w-full border p-2.5 rounded-md focus:ring-2 focus:ring-primary outline-none" placeholder="Số nhà, tên đường..." />
                    </div>
                  </div>
                )}

                {/* STEP 2: Giá dịch vụ */}
                {propStep === 2 && (
                  <div className="space-y-4 animate-in slide-in-from-right-4">
                    <div className="bg-amber-50/50 p-4 rounded-lg border border-amber-100 mb-2">
                      <h3 className="font-semibold text-amber-900 flex items-center gap-2 mb-1"><Zap className="h-4 w-4" /> Bảng giá dịch vụ</h3>
                      <p className="text-xs text-amber-700">Thiết lập giá điện, nước, internet mặc định cho cả khu trọ.</p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div className="bg-white p-4 rounded-lg border">
                        <label className="text-sm font-medium text-gray-700 flex items-center gap-2 mb-2"><Zap className="h-4 w-4 text-yellow-500" /> Giá điện (đ/kWh)</label>
                        <CurrencyInput value={formData.elecPrice} onChange={val => setFormData({...formData, elecPrice: val})} className="w-full border p-2.5 rounded-md focus:ring-2 focus:ring-primary outline-none" placeholder="VD: 3.500" />
                      </div>
                      <div className="bg-white p-4 rounded-lg border">
                        <label className="text-sm font-medium text-gray-700 flex items-center gap-2 mb-2"><Droplets className="h-4 w-4 text-blue-500" /> Giá nước (đ/m3)</label>
                        <CurrencyInput value={formData.waterPrice} onChange={val => setFormData({...formData, waterPrice: val})} className="w-full border p-2.5 rounded-md focus:ring-2 focus:ring-primary outline-none" placeholder="VD: 20.000" />
                      </div>
                      <div className="bg-white p-4 rounded-lg border">
                        <label className="text-sm font-medium text-gray-700 flex items-center gap-2 mb-2"><Wifi className="h-4 w-4 text-gray-500" /> Internet (đ/tháng)</label>
                        <CurrencyInput value={formData.internetPrice} onChange={val => setFormData({...formData, internetPrice: val})} className="w-full border p-2.5 rounded-md focus:ring-2 focus:ring-primary outline-none" placeholder="VD: 100.000" />
                      </div>
                    </div>
                  </div>
                )}

                {/* STEP 3: Hình ảnh & Mô tả */}
                {propStep === 3 && (
                  <div className="space-y-4 animate-in slide-in-from-right-4">
                    <div className="bg-purple-50/50 p-4 rounded-lg border border-purple-100 mb-2">
                      <h3 className="font-semibold text-purple-900 flex items-center gap-2 mb-1"><FileText className="h-4 w-4" /> Hình ảnh & Mô tả</h3>
                      <p className="text-xs text-purple-700">Thêm hình ảnh tổng quan và mô tả để thu hút khách thuê.</p>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Hình ảnh Khu trọ</label>
                      
                      <div 
                        onClick={() => fileInputRef.current?.click()}
                        className="border-2 border-dashed border-primary/50 bg-primary/5 hover:bg-primary/10 transition rounded-lg p-6 flex flex-col items-center justify-center cursor-pointer"
                      >
                        <ImagePlus className="h-8 w-8 text-primary mb-2" />
                        <span className="text-sm font-medium text-primary">Nhấn để chọn ảnh từ máy</span>
                        <span className="text-xs text-gray-500 mt-1">Hỗ trợ JPG, PNG (Tối đa 5MB/ảnh)</span>
                        <input 
                          type="file" multiple accept="image/*" 
                          ref={fileInputRef} onChange={handleImageChange} className="hidden" 
                        />
                      </div>

                      {(formData.images.length > 0 || previewUrls.length > 0) && (
                        <div className="grid grid-cols-4 gap-3 mt-4">
                          {formData.images.map((url, idx) => (
                            <div key={`old-${idx}`} className="relative group aspect-square rounded-lg overflow-hidden border bg-gray-100">
                              <img src={url} alt={`old-${idx}`} className="w-full h-full object-cover" />
                              <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                <button type="button" onClick={() => removeOldImage(idx)} className="bg-red-500 text-white p-1.5 rounded-full hover:bg-red-600 transition">
                                  <X className="h-4 w-4" />
                                </button>
                              </div>
                              <span className="absolute bottom-1 left-1 text-[10px] bg-black/60 text-white px-1.5 py-0.5 rounded">Đã lưu</span>
                            </div>
                          ))}

                          {previewUrls.map((url, idx) => (
                            <div key={`new-${idx}`} className="relative group aspect-square rounded-lg overflow-hidden border-2 border-primary border-dashed bg-blue-50">
                              <img src={url} alt={`preview-${idx}`} className="w-full h-full object-cover opacity-80" />
                              <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                <button type="button" onClick={() => removeSelectedFile(idx)} className="bg-red-500 text-white p-1.5 rounded-full hover:bg-red-600 transition">
                                  <X className="h-4 w-4" />
                                </button>
                              </div>
                              <span className="absolute bottom-1 left-1 text-[10px] bg-primary text-white px-1.5 py-0.5 rounded shadow">Mới</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1 mt-4">Mô tả chung</label>
                      <textarea 
                        rows={4} 
                        value={formData.description} 
                        onChange={e => setFormData({...formData, description: e.target.value})} 
                        className="w-full border p-2.5 rounded-md focus:ring-2 focus:ring-primary outline-none resize-none" 
                        placeholder="VD: Khu trọ an ninh, có camera 24/7. Giá thuê các phòng từ 1tr5 - 3tr..."
                      />
                      <p className="text-xs text-blue-600 mt-1.5 flex items-start gap-1 bg-blue-50 p-2.5 rounded-md border border-blue-100">
                        <Sparkles className="h-3.5 w-3.5 flex-shrink-0 mt-0.5 text-blue-500" /> 
                        <span><strong>Mẹo:</strong> Nhập chi tiết tiện ích để Admin duyệt bài nhanh hơn!</span>
                      </p>
                    </div>
                  </div>
                )}
              </form>
            </div>

            {/* Modal Footer Actions */}
            <div className="px-6 py-4 border-t bg-muted/40 flex justify-between gap-3 flex-shrink-0">
              {propStep > 1 ? (
                <Button type="button" variant="outline" onClick={() => setPropStep(propStep - 1)} disabled={isSubmitting}>
                  <ChevronLeft className="h-4 w-4 mr-1" /> Quay lại
                </Button>
              ) : (
                <Button type="button" variant="ghost" onClick={() => setShowModal(false)} disabled={isSubmitting} className="text-gray-500">
                  Hủy bỏ
                </Button>
              )}
              
              {propStep < 3 ? (
                <Button type="submit" form="property-form" className="min-w-[120px] bg-primary">
                  Tiếp tục <ChevronRight className="h-4 w-4 ml-1" />
                </Button>
              ) : (
                <Button type="submit" form="property-form" disabled={isSubmitting} className="min-w-[140px] bg-green-600 hover:bg-green-700">
                  {isSubmitting && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                  {isSubmitting ? 'Đang lưu...' : (editingId ? 'Lưu thay đổi' : 'Hoàn tất & Tạo')}
                </Button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* MODAL XÁC NHẬN ẨN / HIỆN LẠI KHU TRỌ */}
      {statusConfirm && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in">
          <div className="bg-white rounded-2xl w-full max-w-sm p-6 shadow-2xl animate-in zoom-in-95">
            <div className="flex flex-col items-center text-center">
              <div className={`p-3 rounded-full mb-4 ${statusConfirm.status === 'HIDDEN' ? 'bg-green-50' : 'bg-orange-50'}`}>
                {statusConfirm.status === 'HIDDEN' ? <Eye className="h-8 w-8 text-green-500" /> : <EyeOff className="h-8 w-8 text-orange-500" />}
              </div>
              <h3 className="text-lg font-bold text-gray-900 mb-1">
                {statusConfirm.status === 'HIDDEN' ? 'Hiển thị lại khu trọ?' : 'Tạm ẩn khu trọ?'}
              </h3>
              <p className="text-sm text-gray-500 mb-1">
                Xác nhận thay đổi trạng thái cho
              </p>
              <p className="font-semibold text-gray-900 mb-2">"{statusConfirm.name}"?</p>
              
              <p className={`text-xs px-3 py-2 rounded-lg border ${statusConfirm.status === 'HIDDEN' ? 'bg-green-50 text-green-600 border-green-100' : 'bg-orange-50 text-orange-600 border-orange-100'}`}>
                {statusConfirm.status === 'HIDDEN' 
                  ? 'Khu trọ sẽ xuất hiện trở lại trong danh sách tìm kiếm của khách thuê.' 
                  : 'Khu trọ sẽ bị ẩn khỏi danh sách tìm kiếm công khai nhưng bạn vẫn có thể quản lý.'}
              </p>
            </div>
            <div className="flex gap-3 mt-6">
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => setStatusConfirm(null)}
                disabled={isUpdatingStatus}
              >
                Hủy
              </Button>
              <Button
                className={`flex-1 text-white ${statusConfirm.status === 'HIDDEN' ? 'bg-green-600 hover:bg-green-700' : 'bg-orange-500 hover:bg-orange-600'}`}
                onClick={handleStatusChangeConfirmed}
                disabled={isUpdatingStatus}
              >
                {isUpdatingStatus ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : (statusConfirm.status === 'HIDDEN' ? 'Hiện lại ngay' : 'Ẩn khu trọ')}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL NHẮC NÂNG CẤP VIP */}
      <UpgradePromptModal
        isOpen={vipLimit.isOpen}
        onClose={() => setVipLimit(prev => ({ ...prev, isOpen: false }))}
        limitType={vipLimit.limitType}
        currentTier={vipLimit.currentTier}
        currentCount={vipLimit.currentCount}
        maxAllowed={vipLimit.maxAllowed}
        message={vipLimit.message}
      />
    </div>
  );
}
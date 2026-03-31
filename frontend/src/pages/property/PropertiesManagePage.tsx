import React, { useEffect, useState, useRef } from 'react';
import { Link } from 'react-router-dom';
import { Building, MapPin, Plus, Loader2, Edit, X, ImagePlus, LocateFixed, Trash2, AlertTriangle, Home, CheckCircle, Sparkles } from 'lucide-react';
import { propertyApi } from '@/api/propertyApi';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { toast } from 'sonner';
import type { Property } from '@/types/index';

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
  const [properties, setProperties] = useState<Property[]>([]);
  const [loading, setLoading] = useState(true);

  // --- STATE CHO MODAL THÊM/SỬA KHU TRỌ ---
  const [showModal, setShowModal] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [editingId, setEditingId] = useState<number | string | null>(null);
  const [isFetchingLocation, setIsFetchingLocation] = useState(false); // State định vị
  
  // --- STATE XOÁ KHU TRỌ ---
  const [deleteConfirm, setDeleteConfirm] = useState<Property | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  
  const [formData, setFormData] = useState({
    name: '', city: '', district: '', address: '',
    elecPrice: '', waterPrice: '', internetPrice: '', description: '',
    latitude: undefined as number | undefined,
    longitude: undefined as number | undefined,
    images: [] as string[] // Chứa các URL ảnh đã upload thành công hoặc ảnh cũ
  });

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
  const handleOpenCreate = () => {
    setEditingId(null);
    setFormData({ 
      name: '', city: '', district: '', address: '', 
      elecPrice: '', waterPrice: '', internetPrice: '', description: '',
      latitude: undefined, longitude: undefined,
      images: [] 
    });
    setSelectedFiles([]);
    setPreviewUrls([]);
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
      images: property.images || []
    });
    setSelectedFiles([]);
    setPreviewUrls([]);
    setShowModal(true);
  };

  // Xác nhận và thực hiện xóa khu trọ
  const handleDeleteConfirmed = async () => {
    if (!deleteConfirm) return;
    setIsDeleting(true);
    try {
      await propertyApi.deleteProperty(deleteConfirm.id);
      toast.success(`Đã xóa khu trọ “${deleteConfirm.name}”!`);
      setDeleteConfirm(null);
      fetchProperties();
    } catch (error: any) {
      toast.error(error?.response?.data?.message || 'Xóa thất bại. Khu trọ có thể đang có phòng và hợp đồng. ');
    } finally {
      setIsDeleting(false);
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
        // Có tọa độ -> Lập tức tắt theo dõi để tiết kiệm tài nguyên
        navigator.geolocation.clearWatch(watchId);

        try {
          const lat = position.coords.latitude;
          const lon = position.coords.longitude;

          // 1. GỌI VỀ BACKEND SPRING BOOT
          const response = await propertyApi.reverseGeocode(lat, lon);
          
          let data = (response as any).data || response;
          if (typeof data === 'string') {
            data = JSON.parse(data);
          }

          // 🔥 BẮT TẬN TAY API TRẢ VỀ GÌ
          console.log("=== DỮ LIỆU ĐỊA CHỈ TỪ API ===", data);

          if (data) {
            const addr = data.address || {};
            const fullAddress = (data.display_name || data.formatted_address || "").toLowerCase();
            
            const street = addr.road || addr.pedestrian || '';
            const houseNumber = addr.house_number ? `${addr.house_number} ` : '';
            
            // Helper 1: Xóa dấu Tiếng Việt cực mạnh
            const removeAccents = (str: string) => {
              if (!str) return '';
              return str.toString().normalize('NFD')
                        .replace(/[\u0300-\u036f]/g, '')
                        .replace(/đ/g, 'd').replace(/Đ/g, 'D');
            };

            // Helper 2: Chuẩn hóa cắt bỏ cả Tiếng Việt lẫn Tiếng Anh ("City", "Province")
            const normalizeCitySearch = (s: string) => {
              if (!s) return '';
              let res = removeAccents(s.toLowerCase());
              res = res.replace(/^(thanh pho|tinh|tp\.?|quan|huyen|thi xa)\s+/i, '')
                       .replace(/\s+(city|province|town|municipality)$/i, '')
                       .replace(/-/g, ' ') // Xử lý vụ Bà Rịa - Vũng Tàu
                       .trim();
              return res;
            };

            const candidateCities = [
              addr.state, addr.city, addr.province, addr.town, addr.county, addr.region
            ].filter(Boolean);
            
            let matchedCity = '';
            
            // CHIẾN THUẬT 1: Tìm trong các biến trả về của API
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

            // CHIẾN THUẬT 2 (Vũ khí cuối): Quét toàn bộ chuỗi địa chỉ dài nếu Chiến thuật 1 xịt
            if (!matchedCity && fullAddress) {
               const noAccentFullAddr = removeAccents(fullAddress);
               const foundFallback = VIETNAM_CITIES.find(city => {
                 return noAccentFullAddr.includes(normalizeCitySearch(city));
               });
               if (foundFallback) {
                 matchedCity = foundFallback;
               }
            }
            
            // Xử lý Quận/Huyện
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

  // --- XỬ LÝ ẢNH TRƯỚC KHI UPLOAD ---
  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const filesArray = Array.from(e.target.files);
      
      // Lọc file quá nặng (VD: giới hạn 5MB)
      const validFiles = filesArray.filter(file => file.size <= 5 * 1024 * 1024);
      if (validFiles.length < filesArray.length) {
        toast.warning("Một số ảnh quá lớn (>5MB) đã bị bỏ qua.");
      }

      setSelectedFiles(prev => [...prev, ...validFiles]);
      
      // Tạo URL ảo để xem trước
      const newPreviews = validFiles.map(file => URL.createObjectURL(file));
      setPreviewUrls(prev => [...prev, ...newPreviews]);
    }
    // Reset input để có thể chọn lại cùng 1 file
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

  // --- SUBMIT FORM VÀ UPLOAD LÊN CLOUDINARY ---
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name || !formData.address || !formData.city) {
      toast.warning('Vui lòng nhập Tên, Tỉnh/TP và Địa chỉ!');
      return;
    }

    try {
      setIsSubmitting(true);
      
      // 1. Nếu có file ảnh mới được chọn -> Gọi API đẩy file lên Spring Boot -> Cloudinary
      let newlyUploadedUrls: string[] = [];
      if (selectedFiles.length > 0) {
        toast.info("Đang tải ảnh lên hệ thống...");
        const uploadRes = await propertyApi.uploadImages(selectedFiles);
        newlyUploadedUrls = (uploadRes as any).data || uploadRes; 
      }

      // 2. Gom URL ảnh cũ và URL ảnh vừa upload thành công
      const finalImagesList = [...formData.images, ...newlyUploadedUrls];

      // 3. Chuẩn bị Payload
      const payload = {
        name: formData.name, city: formData.city, district: formData.district, address: formData.address,
        description: formData.description,
        latitude: formData.latitude,
        longitude: formData.longitude,
        elecPrice: Number(formData.elecPrice) || 0, waterPrice: Number(formData.waterPrice) || 0, internetPrice: Number(formData.internetPrice) || 0,
        images: finalImagesList 
      };

      // 4. Lưu vào Database
      if (editingId) {
        await propertyApi.updateProperty(editingId, payload);
        toast.success('Cập nhật khu trọ thành công!');
      } else {
        await propertyApi.createProperty(payload);
        toast.success('Thêm khu trọ mới thành công!');
      }
      
      setShowModal(false);
      fetchProperties(); 
    } catch (error: any) {
      const msg = error.response?.data?.message || (editingId ? 'Cập nhật thất bại' : 'Thêm mới thất bại');
      toast.error(msg);
      console.error(error);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading) return <div className="flex justify-center items-center h-64"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;

  return (
    <div className="space-y-6">
      {/* Header và List */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Khu trọ của tôi</h1>
          <p className="text-muted-foreground mt-1">Quản lý danh sách các tòa nhà, khu trọ</p>
        </div>
        <Button onClick={handleOpenCreate} className="flex items-center gap-2"><Plus className="h-4 w-4" /> Thêm Khu trọ</Button>
      </div>

      {/* DANH SÁCH KHU TRỌ */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {properties.map((property) => (
          <Card key={property.id} className="overflow-hidden hover:shadow-md transition-shadow group relative flex flex-col">
            {/* Nút sửa */}
            <button onClick={() => handleOpenEdit(property)} className="absolute top-2 right-10 z-10 bg-white/90 p-1.5 rounded-md shadow opacity-0 group-hover:opacity-100 transition hover:bg-blue-50 text-blue-600">
              <Edit className="h-4 w-4" />
            </button>
            {/* Nút xóa */}
            <button
              onClick={() => setDeleteConfirm(property)}
              className="absolute top-2 right-2 z-10 bg-white/90 p-1.5 rounded-md shadow opacity-0 group-hover:opacity-100 transition hover:bg-red-50 text-red-500"
            >
              <Trash2 className="h-4 w-4" />
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
                {property.status === 'PENDING' && (
                  <span className="px-2 py-0.5 bg-yellow-500/90 text-white text-[10px] font-bold rounded-md flex items-center gap-1 shadow-sm backdrop-blur-sm">
                    <Loader2 className="h-2.5 w-2.5 animate-spin" /> CHỜ DUYỆT
                  </span>
                )}
                {property.status === 'APPROVED' && (
                  <span className="px-2 py-0.5 bg-green-500/90 text-white text-[10px] font-bold rounded-md flex items-center gap-1 shadow-sm backdrop-blur-sm">
                    <CheckCircle className="h-2.5 w-2.5" /> ĐÃ DUYỆT
                  </span>
                )}
                {property.status === 'REJECTED' && (
                  <span className="px-2 py-0.5 bg-red-500/90 text-white text-[10px] font-bold rounded-md flex items-center gap-1 shadow-sm backdrop-blur-sm">
                    <AlertTriangle className="h-2.5 w-2.5" /> BỊ TỪ CHỐI
                  </span>
                )}
              </div>
            </div>

            {/* Nội dung */}
            <div className="p-5 flex-1 flex flex-col">
              <h3 className="text-lg font-bold text-gray-900 mb-1 truncate pr-6">{property.name}</h3>
              <div className="flex items-start gap-1.5 text-sm text-gray-500 mb-3 h-10">
                <MapPin className="h-4 w-4 flex-shrink-0 mt-0.5" />
                <span className="line-clamp-2">{property.address}, {property.district}, {property.city}</span>
              </div>

              {/* THỐNG KÊ NHÀNH */}
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
                <Link to={`/properties/manage/${property.id}`}><Button variant="secondary" className="w-full">Quản lý phòng</Button></Link>
              </div>
            </div>
          </Card>
        ))}
      </div>

      {/* ========================================= */}
      {/* MODAL THÊM / SỬA KHU TRỌ */}
      {/* ========================================= */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-xl w-full max-w-2xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh]">
            <div className="px-6 py-4 border-b flex justify-between items-center bg-gray-50 flex-shrink-0">
              <h2 className="text-xl font-bold text-gray-800">{editingId ? 'Cập nhật Khu trọ' : 'Thêm Khu trọ mới'}</h2>
              <button onClick={() => setShowModal(false)} className="text-gray-400 hover:text-gray-600"><X className="h-5 w-5" /></button>
            </div>
            
            <div className="p-6 overflow-y-auto flex-1">
              <form id="property-form" onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Tên khu trọ / Tòa nhà *</label>
                  <input required type="text" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} className="w-full border p-2.5 rounded-md focus:ring-2 focus:ring-primary outline-none" />
                </div>
                
                {/* --- KHU VỰC NHẬP ĐỊA CHỈ & LẤY VỊ TRÍ --- */}
                {/* --- KHỌI NHẬP ĐỊA CHỄ VÀ LẤY VỊ TRÍ --- */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Tỉnh / Thành phố *</label>
                    <select
                      required
                      className="w-full border p-2.5 rounded-md focus:ring-2 focus:ring-primary outline-none bg-white"
                      value={formData.city}
                      onChange={e => setFormData({...formData, city: e.target.value})}
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
                  <input required type="text" value={formData.address} onChange={e => setFormData({...formData, address: e.target.value})} className="w-full border p-2.5 rounded-md focus:ring-2 focus:ring-primary outline-none" placeholder="Số nhà, tên đường..." />
                </div>

                <div className="grid grid-cols-3 gap-4 bg-gray-50 p-4 rounded-lg border">
                  <div><label className="text-sm font-medium">Giá điện (đ/kWh)</label><input type="number" value={formData.elecPrice} onChange={e => setFormData({...formData, elecPrice: e.target.value})} className="w-full border p-2 rounded-md outline-none" /></div>
                  <div><label className="text-sm font-medium">Giá nước (đ/m3)</label><input type="number" value={formData.waterPrice} onChange={e => setFormData({...formData, waterPrice: e.target.value})} className="w-full border p-2 rounded-md outline-none" /></div>
                  <div><label className="text-sm font-medium">Internet (đ/tháng)</label><input type="number" value={formData.internetPrice} onChange={e => setFormData({...formData, internetPrice: e.target.value})} className="w-full border p-2 rounded-md outline-none" /></div>
                </div>

                {/* --- KHU VỰC UPLOAD ẢNH --- */}
                <div className="mt-6 border-t pt-4">
                  <label className="block text-sm font-medium text-gray-700 mb-2">Hình ảnh Khu trọ</label>
                  
                  {/* Nút chọn ảnh */}
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

                  {/* Lưới hiển thị ảnh (Cả cũ và mới) */}
                  {(formData.images.length > 0 || previewUrls.length > 0) && (
                    <div className="grid grid-cols-4 gap-3 mt-4">
                      
                      {/* Hiển thị ảnh cũ */}
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

                      {/* Hiển thị ảnh mới chọn */}
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
                    placeholder="VD: Khu trọ an ninh, có camera 24/7. Giá thuê các phòng từ 1tr5 - 3tr. Liên hệ xem phòng giờ hành chính (gọi trước 30p)..."
                  />
                  <p className="text-xs text-blue-600 mt-1.5 flex items-start gap-1 bg-blue-50 p-2.5 rounded-md border border-blue-100">
                    <Sparkles className="h-3.5 w-3.5 flex-shrink-0 mt-0.5 text-blue-500" /> 
                    <span><strong>Mẹo duyệt bài nhanh:</strong> Hệ thống AI sẽ chấm điểm độ chi tiết của bạn. Bạn hãy nhập rõ khoảng giá, tiện ích và nội quy để nhận điểm AI cao, giúp Admin duyệt bài của bạn ngay lập tức!</span>
                  </p>
                </div>
              </form>
            </div>

            <div className="px-6 py-4 border-t bg-gray-50 flex justify-end gap-3 flex-shrink-0">
              <Button type="button" variant="outline" onClick={() => setShowModal(false)} disabled={isSubmitting}>Hủy</Button>
              <Button type="submit" form="property-form" disabled={isSubmitting} className="min-w-[140px] bg-primary">
                {isSubmitting && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                {isSubmitting ? (selectedFiles.length > 0 ? 'Đang tải ảnh...' : 'Đang lưu...') : (editingId ? 'Lưu thay đổi' : 'Tạo khu trọ')}
              </Button>
            </div>
            
          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/* DIALOG XÁC NHẬN XÓA KHU TRỌ */}
      {/* ============================================================ */}
      {deleteConfirm && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in">
          <div className="bg-white rounded-2xl w-full max-w-sm p-6 shadow-2xl animate-in zoom-in-95">
            <div className="flex flex-col items-center text-center">
              <div className="p-3 bg-red-50 rounded-full mb-4">
                <AlertTriangle className="h-8 w-8 text-red-500" />
              </div>
              <h3 className="text-lg font-bold text-gray-900 mb-1">Xóa khu trọ?</h3>
              <p className="text-sm text-gray-500 mb-1">
                Bạn có chắc muốn xóa khu trọ
              </p>
              <p className="font-semibold text-gray-900 mb-2">"{ deleteConfirm.name}"?</p>
              <p className="text-xs text-red-500 bg-red-50 px-3 py-2 rounded-lg border border-red-100">
                ⚠️ Hành động này không thể hoàn tác. Tất cả phòng trong khu trọ này cũng sẽ bị xóa.
              </p>
            </div>
            <div className="flex gap-3 mt-6">
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => setDeleteConfirm(null)}
                disabled={isDeleting}
              >
                Hủy
              </Button>
              <Button
                className="flex-1 bg-red-600 hover:bg-red-700 text-white"
                onClick={handleDeleteConfirmed}
                disabled={isDeleting}
              >
                {isDeleting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Trash2 className="h-4 w-4 mr-2" />}
                Xóa vĩnh viễn
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
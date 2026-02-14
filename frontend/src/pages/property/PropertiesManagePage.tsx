import React, { useEffect, useState, useRef } from 'react';
import { Link } from 'react-router-dom';
import { Building, MapPin, Plus, Loader2, Edit, X, Camera, ImagePlus } from 'lucide-react';
import { propertyApi } from '@/api/propertyApi';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { toast } from 'sonner';
import type { Property } from '@/types/index';

export default function PropertiesManagePage() {
  const [properties, setProperties] = useState<Property[]>([]);
  const [loading, setLoading] = useState(true);

  // --- STATE CHO MODAL THÊM/SỬA KHU TRỌ ---
  const [showModal, setShowModal] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [editingId, setEditingId] = useState<number | string | null>(null);
  
  const [formData, setFormData] = useState({
    name: '', city: '', district: '', address: '',
    elecPrice: '', waterPrice: '', internetPrice: '', description: '',
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
      elecPrice: '', waterPrice: '', internetPrice: '', description: '', images: [] 
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
      images: property.images || [] // Load ảnh cũ từ DB
    });
    setSelectedFiles([]);
    setPreviewUrls([]); // Clear file preview chưa upload
    setShowModal(true);
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
        // axiosClient trả về data ở res.data hoặc trả thẳng res tùy cấu hình interceptor của bạn
        newlyUploadedUrls = (uploadRes as any).data || uploadRes; 
      }

      // 2. Gom URL ảnh cũ và URL ảnh vừa upload thành công
      const finalImagesList = [...formData.images, ...newlyUploadedUrls];

      // 3. Chuẩn bị Payload
      const payload = {
        name: formData.name, city: formData.city, district: formData.district, address: formData.address,
        description: formData.description,
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
    } catch (error) {
      toast.error(editingId ? 'Cập nhật thất bại' : 'Thêm mới thất bại');
      console.error(error);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading) return <div className="flex justify-center items-center h-64"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;

  return (
    <div className="space-y-6">
      {/* Header và List (Giữ nguyên như cũ) */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Khu trọ của tôi</h1>
          <p className="text-muted-foreground mt-1">Quản lý danh sách các tòa nhà, khu trọ</p>
        </div>
        <Button onClick={handleOpenCreate} className="flex items-center gap-2"><Plus className="h-4 w-4" /> Thêm Khu trọ</Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {properties.map((property) => (
          <Card key={property.id} className="overflow-hidden hover:shadow-md transition-shadow group relative flex flex-col">
            <button onClick={() => handleOpenEdit(property)} className="absolute top-2 right-2 z-10 bg-white/90 p-1.5 rounded-md shadow opacity-0 group-hover:opacity-100 transition hover:bg-blue-50 text-blue-600">
              <Edit className="h-4 w-4" />
            </button>
            <div className="h-40 bg-gray-200 relative">
              {property.images && property.images.length > 0 ? (
                <img src={property.images[0]} alt="cover" className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-gray-400"><Building className="h-10 w-10 opacity-50" /></div>
              )}
            </div>
            <div className="p-5 flex-1 flex flex-col">
              <h3 className="text-lg font-bold text-gray-900 mb-1 truncate pr-6">{property.name}</h3>
              <div className="flex items-start gap-1.5 text-sm text-gray-500 mb-3 h-10">
                <MapPin className="h-4 w-4 flex-shrink-0 mt-0.5" />
                <span className="line-clamp-2">{property.address}, {property.district}, {property.city}</span>
              </div>
              <div className="mt-auto">
                <Link to={`/properties/manage/${property.id}`}><Button variant="secondary" className="w-full">Quản lý phòng</Button></Link>
              </div>
            </div>
          </Card>
        ))}
      </div>

      {/* ========================================= */}
      {/* MODAL THÊM / SỬA KHU TRỌ (BỔ SUNG UPLOAD) */}
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
                {/* ... Các trường nhập liệu (Tên, Địa chỉ, Giá) vẫn giữ nguyên ... */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Tên khu trọ / Tòa nhà *</label>
                  <input required type="text" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} className="w-full border p-2.5 rounded-md focus:ring-2 focus:ring-primary outline-none" />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Tỉnh / Thành phố *</label>
                    <input required type="text" value={formData.city} onChange={e => setFormData({...formData, city: e.target.value})} className="w-full border p-2.5 rounded-md focus:ring-2 focus:ring-primary outline-none" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Quận / Huyện</label>
                    <input type="text" value={formData.district} onChange={e => setFormData({...formData, district: e.target.value})} className="w-full border p-2.5 rounded-md focus:ring-2 focus:ring-primary outline-none" />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Địa chỉ chi tiết *</label>
                  <input required type="text" value={formData.address} onChange={e => setFormData({...formData, address: e.target.value})} className="w-full border p-2.5 rounded-md focus:ring-2 focus:ring-primary outline-none" />
                </div>
                <div className="grid grid-cols-3 gap-4 bg-gray-50 p-4 rounded-lg border">
                  <div><label className="text-sm font-medium">Giá điện (đ/kWh)</label><input type="number" value={formData.elecPrice} onChange={e => setFormData({...formData, elecPrice: e.target.value})} className="w-full border p-2 rounded-md outline-none" /></div>
                  <div><label className="text-sm font-medium">Giá nước (đ/m3)</label><input type="number" value={formData.waterPrice} onChange={e => setFormData({...formData, waterPrice: e.target.value})} className="w-full border p-2 rounded-md outline-none" /></div>
                  <div><label className="text-sm font-medium">Internet (đ/tháng)</label><input type="number" value={formData.internetPrice} onChange={e => setFormData({...formData, internetPrice: e.target.value})} className="w-full border p-2 rounded-md outline-none" /></div>
                </div>

                {/* --- KHU VỰC UPLOAD ẢNH --- */}
                <div className="mt-6 border-t pt-4">
                  <label className="block text-sm font-medium text-gray-700 mb-2">Hình ảnh Khu trọ</label>
                  
                  {/* Nút chọn ảnh (ẩn input file đi cho đẹp) */}
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
                      
                      {/* Hiển thị ảnh cũ (đã có URL trên Cloudinary) */}
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

                      {/* Hiển thị ảnh mới chọn (sắp upload) */}
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
                  <textarea rows={3} value={formData.description} onChange={e => setFormData({...formData, description: e.target.value})} className="w-full border p-2.5 rounded-md focus:ring-2 focus:ring-primary outline-none" />
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
    </div>
  );
}
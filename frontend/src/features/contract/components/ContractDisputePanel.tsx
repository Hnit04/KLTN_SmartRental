import React, { useState, useRef } from 'react';
import { Button } from '@/components/ui/Button';
import { Textarea } from '@/components/ui/Textarea';
import { Input } from '@/components/ui/Input';
import { Label } from '@/components/ui/Label';
import { AlertTriangle, UploadCloud, X, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { contractApi } from '@/api/contractApi';

const CLOUDINARY_UPLOAD_PRESET = "smart_rental";
const CLOUDINARY_CLOUD_NAME = "dzpr0fscq";
const UPLOAD_URL = `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/image/upload`;

interface ContractDisputePanelProps {
  contractId: number;
  onSuccess: () => void;
}

export default function ContractDisputePanel({ contractId, onSuccess }: ContractDisputePanelProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [violationType, setViolationType] = useState('');
  const [evidenceUrls, setEvidenceUrls] = useState<string[]>([]);
  const [description, setDescription] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    if (evidenceUrls.length + files.length > 5) {
      toast.error("Chỉ được tải lên tối đa 5 hình ảnh bằng chứng.");
      return;
    }

    setIsUploading(true);
    const newImages: string[] = [];

    try {
      for (let i = 0; i < files.length; i++) {
        const formData = new FormData();
        formData.append("file", files[i]);
        formData.append("upload_preset", CLOUDINARY_UPLOAD_PRESET);

        const res = await fetch(UPLOAD_URL, {
          method: "POST",
          body: formData,
        });

        if (!res.ok) throw new Error("Upload failed");

        const data = await res.json();
        newImages.push(data.secure_url);
      }

      setEvidenceUrls(prev => [...prev, ...newImages]);
      toast.success("Tải ảnh bằng chứng thành công.");
    } catch (error) {
      console.error("Upload error:", error);
      toast.error("Lỗi khi tải ảnh lên. Vui lòng thử lại.");
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!violationType || !description) {
      toast.warning("Vui lòng nhập loại vi phạm và mô tả chi tiết.");
      return;
    }

    try {
      setIsSubmitting(true);
      await contractApi.openDispute(contractId, {
        violationType,
        evidenceUrls: evidenceUrls.length > 0 ? evidenceUrls : undefined,
        description
      });
      toast.success("Khởi tạo tranh chấp thành công!");
      setIsOpen(false);
      onSuccess();
    } catch (error: any) {
      console.error("Dispute error:", error);
      toast.error(error?.response?.data?.message || "Lỗi khi khởi tạo tranh chấp.");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) {
    return (
      <Button
        variant="destructive"
        className="w-full mt-4 flex items-center gap-2 border-red-600 text-red-600 hover:bg-red-50 bg-white"
        onClick={() => setIsOpen(true)}
      >
        <AlertTriangle className="w-4 h-4" /> Báo Cáo Vi Phạm / Khởi Tạo Tranh Chấp
      </Button>
    );
  }

  return (
    <div className="mt-4 p-4 border border-red-200 bg-red-50 rounded-xl space-y-4">
      <h3 className="font-bold text-red-700 flex items-center gap-2">
        <AlertTriangle className="w-5 h-5" /> Khởi Tạo Tranh Chấp
      </h3>
      <p className="text-sm text-red-600">
        Vui lòng cung cấp thông tin chi tiết và bằng chứng (nếu có) để Ban Quản Trị xem xét và giải quyết.
      </p>

      <form onSubmit={handleSubmit} className="space-y-4 bg-white p-4 rounded-lg border border-red-100">
        <div>
          <Label htmlFor="violationType">Loại vi phạm</Label>
          <Input 
            id="violationType" 
            placeholder="VD: Không hoàn cọc, phá hoại tài sản,..."
            value={violationType}
            onChange={(e) => setViolationType(e.target.value)}
            disabled={isSubmitting}
          />
        </div>
        
        <div>
          <Label htmlFor="description">Mô tả chi tiết</Label>
          <Textarea 
            id="description" 
            placeholder="Trình bày rõ sự việc xảy ra..."
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            disabled={isSubmitting}
            className="h-24"
          />
        </div>

        <div>
          <Label>Bằng chứng (Hình ảnh/Video)</Label>
          <div className="mt-2 space-y-3">
            {evidenceUrls.length > 0 && (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {evidenceUrls.map((url, index) => (
                  <div key={index} className="relative group rounded-lg overflow-hidden border border-gray-200">
                    <img src={url} alt={`Evidence ${index + 1}`} className="w-full h-24 object-cover" />
                    <button
                      type="button"
                      onClick={() => setEvidenceUrls(prev => prev.filter((_, i) => i !== index))}
                      className="absolute top-1 right-1 bg-red-500 text-white p-1 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                ))}
              </div>
            )}
            
            {evidenceUrls.length < 5 && (
              <Button 
                type="button" 
                variant="outline" 
                onClick={() => fileInputRef.current?.click()}
                disabled={isUploading}
                className="w-full h-24 border-dashed border-2 flex flex-col gap-2 text-gray-500"
              >
                {isUploading ? <Loader2 className="w-6 h-6 animate-spin" /> : <UploadCloud className="w-6 h-6" />}
                <span>{isUploading ? 'Đang tải lên...' : 'Tải ảnh lên'}</span>
              </Button>
            )}
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleImageUpload}
              accept="image/*"
              multiple
              className="hidden"
            />
          </div>
        </div>

        <div className="flex gap-3 pt-2">
          <Button type="button" variant="outline" className="flex-1" onClick={() => setIsOpen(false)}>
            Hủy
          </Button>
          <Button type="submit" className="flex-1 bg-red-600 hover:bg-red-700 text-white" isLoading={isSubmitting || isUploading}>
            Gửi Yêu Cầu
          </Button>
        </div>
      </form>
    </div>
  );
}

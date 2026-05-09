import React, { useState, useRef } from "react";
import { X, Flag, AlertTriangle, Upload, XCircle, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { toast } from "sonner";
import type { Room } from "@/types/index";
import { reportApi } from "@/api/reportApi";

// Cloudinary config
const CLOUDINARY_UPLOAD_PRESET = "smart_rental";
const CLOUDINARY_CLOUD_NAME = "dzpr0fscq";
const UPLOAD_URL = `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/image/upload`;

interface ReportRoomModalProps {
  isOpen: boolean;
  onClose: () => void;
  room: Room;
}

const REPORT_REASONS = [
  "Lừa đảo / Phòng không có thật",
  "Giá thuê/Chi phí không đúng thực tế",
  "Hình ảnh không đúng với phòng thực tế",
  "Chủ trọ có thái độ không tốt / Lừa gạt",
  "Khác (Vui lòng nhập chi tiết bên dưới)"
];

export default function ReportRoomModal({ isOpen, onClose, room }: ReportRoomModalProps) {
  const [reason, setReason] = useState<string>("");
  const [details, setDetails] = useState<string>("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [evidenceImages, setEvidenceImages] = useState<string[]>([]);
  const [isUploading, setIsUploading] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    if (evidenceImages.length + files.length > 3) {
      toast.error("Chỉ được tải lên tối đa 3 hình ảnh bằng chứng.");
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

      setEvidenceImages(prev => [...prev, ...newImages]);
      toast.success("Tải ảnh bằng chứng thành công.");
    } catch (error) {
      console.error("Upload error:", error);
      toast.error("Lỗi khi tải ảnh lên. Vui lòng thử lại.");
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const removeImage = (indexToRemove: number) => {
    setEvidenceImages(prev => prev.filter((_, idx) => idx !== indexToRemove));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!reason) {
      toast.error("Vui lòng chọn lý do báo cáo.");
      return;
    }

    if (reason.includes("Khác") && details.trim().length < 20) {
      toast.error("Vui lòng nhập ít nhất 20 ký tự mô tả chi tiết.");
      return;
    }

    setIsSubmitting(true);
    try {
      await reportApi.createReport({
        roomId: room.id,
        reason,
        details: details || undefined,
        evidenceUrls: evidenceImages.length > 0 ? evidenceImages : undefined,
      });
      toast.success("Cảm ơn bạn đã báo cáo. Chúng tôi sẽ xử lý trong thời gian sớm nhất!");
      onClose();
      setReason("");
      setDetails("");
      setEvidenceImages([]);
    } catch (err: any) {
      // axiosClient interceptor đã toast.error message từ backend rồi
      console.error("Report error:", err);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 p-4 animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl w-full max-w-lg overflow-hidden shadow-2xl flex flex-col max-h-[90vh]">

        {/* Header */}
        <div className="px-6 py-4 border-b flex justify-between items-center bg-red-50 relative shrink-0">
          <div className="flex items-center gap-2 text-red-700">
            <Flag className="h-5 w-5" />
            <h2 className="text-lg font-bold">Báo cáo phòng trọ</h2>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-red-400 hover:text-red-600 hover:bg-red-100 rounded-full transition"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto flex-1 bg-gray-50">
          <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-3 flex gap-3 mb-5">
            <AlertTriangle className="h-5 w-5 text-yellow-600 shrink-0" />
            <p className="text-sm text-yellow-800">
              Vui lòng báo cáo đúng sự thật. Nếu cố tình báo cáo sai nhiều lần, tài khoản của bạn có thể bị tước quyền hoặc bị khóa.
            </p>
          </div>

          <form id="report-form" onSubmit={handleSubmit} className="space-y-5">
            {/* Target Room */}
            <div>
              <p className="text-sm font-medium text-gray-500 mb-1">Đang báo cáo phòng:</p>
              <div className="font-bold text-gray-900 bg-white border px-3 py-2 rounded-lg">
                Phòng {room.name} {room.propertyName ? `- ${room.propertyName}` : ''}
              </div>
            </div>

            {/* Reasons */}
            <div>
              <p className="text-sm font-bold text-gray-800 mb-2">1. Lý do báo cáo <span className="text-red-500">*</span></p>
              <div className="space-y-2 bg-white p-3 rounded-xl border">
                {REPORT_REASONS.map((r, idx) => (
                  <label key={idx} className="flex items-start gap-2.5 cursor-pointer p-2 hover:bg-gray-50 rounded-lg transition group">
                    <input
                      type="radio"
                      name="reportReason"
                      value={r}
                      checked={reason === r}
                      onChange={(e) => setReason(e.target.value)}
                      className="mt-0.5 text-red-600 focus:ring-red-500 cursor-pointer"
                    />
                    <span className="text-sm text-gray-700 group-hover:text-gray-900">{r}</span>
                  </label>
                ))}
              </div>
            </div>

            {/* Details */}
            <div>
              <p className="text-sm font-bold text-gray-800 mb-2">2. Mô tả chi tiết {reason.includes("Khác") && <span className="text-red-500">*</span>}</p>
              <textarea
                rows={4}
                value={details}
                onChange={(e) => setDetails(e.target.value)}
                placeholder="Mô tả cụ thể vấn đề bạn gặp phải (tối thiểu 20 ký tự nếu chọn 'Khác')..."
                className="w-full border-gray-300 rounded-xl p-3 text-sm focus:ring-red-500 focus:border-red-500 outline-none resize-none"
              />
            </div>

            {/* Evidence Images */}
            <div>
              <div className="flex justify-between items-center mb-2">
                <p className="text-sm font-bold text-gray-800">3. Hình ảnh bằng chứng <span className="text-xs font-normal text-gray-500">(Tùy chọn)</span></p>
                <span className="text-xs text-gray-500">{evidenceImages.length}/3 ảnh</span>
              </div>

              <div className="bg-white p-4 rounded-xl border border-dashed border-gray-300">
                {evidenceImages.length > 0 && (
                  <div className="flex gap-3 mb-3 overflow-x-auto pb-1">
                    {evidenceImages.map((url, idx) => (
                      <div key={idx} className="relative h-20 w-20 shrink-0 rounded-lg overflow-hidden border">
                        <img src={url} alt={`evidence-${idx}`} className="w-full h-full object-cover" />
                        <button
                          type="button"
                          onClick={() => removeImage(idx)}
                          className="absolute top-1 right-1 bg-red-500 text-white rounded-full p-0.5 hover:bg-red-600 transition shadow-sm"
                        >
                          <XCircle className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                {evidenceImages.length < 3 && (
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={isUploading}
                    className="w-full py-3 flex flex-col items-center justify-center gap-2 border-2 border-dashed border-red-200 rounded-lg bg-red-50 text-red-600 hover:bg-red-100 transition disabled:opacity-50"
                  >
                    {isUploading ? <Loader2 className="h-5 w-5 animate-spin" /> : <Upload className="h-5 w-5" />}
                    <span className="text-xs font-semibold">{isUploading ? 'Đang tải lên...' : 'Tải lên hình ảnh bằng chứng'}</span>
                  </button>
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
          </form>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t bg-white flex justify-end gap-3 shrink-0">
          <Button type="button" variant="ghost" onClick={onClose} disabled={isSubmitting}>
            Hủy bỏ
          </Button>
          <Button
            type="submit"
            form="report-form"
            disabled={isSubmitting || isUploading}
            className="bg-red-600 hover:bg-red-700 min-w-[120px]"
          >
            {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Flag className="h-4 w-4 mr-2" />}
            {isSubmitting ? 'Đang gửi...' : 'Gửi Báo Cáo'}
          </Button>
        </div>

      </div>
    </div>
  );
}

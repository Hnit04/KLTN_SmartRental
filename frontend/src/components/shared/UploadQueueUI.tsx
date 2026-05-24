import { useRef } from 'react';
import { ImagePlus, X, RefreshCw, CheckCircle, Loader2, AlertCircle } from 'lucide-react';
import type { QueueItem } from '@/hooks/useUploadQueue';

interface UploadQueueUIProps {
  /** Danh sách items từ useUploadQueue */
  items: QueueItem[];
  /** Callback khi user chọn file mới */
  onAddFiles: (files: File[]) => void;
  /** Callback xóa 1 item */
  onRemove: (id: string) => void;
  /** Callback retry 1 item lỗi */
  onRetry: (id: string) => void;
  /** Label hiển thị phía trên */
  label?: string;
  /** Cho phép chọn nhiều file */
  multiple?: boolean;
  /** Accept type cho input file */
  accept?: string;
}

export default function UploadQueueUI({
  items,
  onAddFiles,
  onRemove,
  onRetry,
  label = 'Ảnh',
  multiple = true,
  accept = 'image/*',
}: UploadQueueUIProps) {
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      onAddFiles(Array.from(files));
    }
    // Reset input để cho chọn lại cùng file
    if (inputRef.current) inputRef.current.value = '';
  };

  return (
    <div className="space-y-2">
      {/* Label + Add button */}
      <div className="flex items-center justify-between">
        <label className="block text-sm font-medium text-gray-700">{label}</label>
        <span className="text-xs text-gray-400">{items.length} ảnh</span>
      </div>

      {/* Grid */}
      <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-2">
        {/* Existing items */}
        {items.map(item => (
          <div
            key={item.id}
            className="relative aspect-square rounded-lg overflow-hidden border border-gray-200 group bg-gray-50"
          >
            {/* Preview image */}
            <img
              src={item.preview}
              alt="preview"
              className="w-full h-full object-cover"
              loading="lazy"
              decoding="async"
            />

            {/* Overlay: uploading */}
            {item.status === 'uploading' && (
              <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                <Loader2 className="h-6 w-6 text-white animate-spin" />
              </div>
            )}

            {/* Overlay: pending */}
            {item.status === 'pending' && (
              <div className="absolute inset-0 bg-black/30 flex items-center justify-center">
                <Loader2 className="h-5 w-5 text-white/80 animate-spin" />
              </div>
            )}

            {/* Badge: success */}
            {item.status === 'success' && (
              <div className="absolute top-1 right-1">
                <CheckCircle className="h-5 w-5 text-green-500 drop-shadow-md" />
              </div>
            )}

            {/* Overlay: error */}
            {item.status === 'error' && (
              <div className="absolute inset-0 bg-red-900/40 flex flex-col items-center justify-center gap-1.5">
                <AlertCircle className="h-5 w-5 text-white" />
                <button
                  type="button"
                  onClick={() => onRetry(item.id)}
                  className="flex items-center gap-1 px-2 py-1 bg-white/90 rounded text-xs font-medium text-red-600 hover:bg-white transition-colors"
                >
                  <RefreshCw className="h-3 w-3" />
                  Thử lại
                </button>
              </div>
            )}

            {/* Remove button (always visible on hover, or always for errors) */}
            <button
              type="button"
              onClick={() => onRemove(item.id)}
              className={`absolute top-1 left-1 p-0.5 rounded-full bg-black/50 text-white hover:bg-black/70 transition-colors ${
                item.status === 'error' ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'
              }`}
              title="Xóa ảnh"
              aria-label="Xóa ảnh"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        ))}

        {/* Add button */}
        <button
          type="button"
          aria-label="Thêm ảnh"
          onClick={() => inputRef.current?.click()}
          className="aspect-square rounded-lg border-2 border-dashed border-gray-300 hover:border-primary hover:bg-primary/5 transition-colors flex flex-col items-center justify-center gap-1 text-gray-400 hover:text-primary"
        >
          <ImagePlus className="h-6 w-6" />
          <span className="text-[10px] font-medium">Thêm ảnh</span>
        </button>
      </div>

      {/* Hidden file input */}
      <input
        ref={inputRef}
        type="file"
        accept={accept}
        multiple={multiple}
        onChange={handleFileChange}
        className="hidden"
      />

      {/* Error summary */}
      {items.some(it => it.status === 'error') && (
        <p className="text-xs text-red-500 flex items-center gap-1">
          <AlertCircle className="h-3.5 w-3.5" />
          Có {items.filter(it => it.status === 'error').length} ảnh lỗi. Vui lòng Thử lại hoặc Xóa trước khi lưu.
        </p>
      )}
    </div>
  );
}

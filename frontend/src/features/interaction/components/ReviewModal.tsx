import { useState } from 'react';
import { Star, X, Send, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { toast } from 'sonner';
import { reviewApi } from '@/api/reviewApi';

interface ReviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  contractId: number;
  roomName: string;
  onSuccess?: () => void; // Hàm gọi lại khi review thành công để refresh data
}

export default function ReviewModal({ isOpen, onClose, contractId, roomName, onSuccess }: ReviewModalProps) {
  const [rating, setRating] = useState(5); // Mặc định 5 sao
  const [comment, setComment] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async () => {
    if (rating === 0) {
      toast.warning("Vui lòng chọn số sao đánh giá!");
      return;
    }
    if (!comment.trim()) {
      toast.warning("Vui lòng nhập vài dòng cảm nhận nhé!");
      return;
    }

    try {
      setIsSubmitting(true);
      await reviewApi.createReview({ contractId, rating, comment });
      toast.success("Cảm ơn bạn đã đánh giá!");
      if (onSuccess) onSuccess();
      onClose();
    } catch (error: any) {
      toast.error(error.response?.data || "Có lỗi xảy ra, không thể gửi đánh giá.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 animate-in fade-in">
      <div className="bg-white rounded-2xl w-full max-w-md overflow-hidden shadow-2xl animate-in zoom-in-95 relative flex flex-col">
        {/* Nút tắt */}
        <button onClick={onClose} className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 bg-gray-100 rounded-full p-1.5 transition-colors">
          <X className="h-5 w-5" />
        </button>

        <div className="p-6 text-center border-b border-gray-100">
          <h2 className="text-xl font-bold text-gray-900">Đánh giá trải nghiệm</h2>
          <p className="text-sm text-gray-500 mt-1">Phòng {roomName}</p>
        </div>

        <div className="p-6 flex flex-col items-center">
          {/* Chọn Sao */}
          <div className="flex gap-2 mb-6">
            {[1, 2, 3, 4, 5].map((star) => (
              <Star
                key={star}
                className={`h-10 w-10 cursor-pointer transition-all hover:scale-110 ${
                  star <= rating ? 'fill-yellow-400 text-yellow-400' : 'text-gray-300'
                }`}
                onClick={() => setRating(star)}
              />
            ))}
          </div>

          {/* Ô nhập Text */}
          <textarea
            className="w-full border border-gray-200 rounded-xl p-4 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 resize-none"
            rows={4}
            placeholder="Chia sẻ cảm nhận của bạn về phòng trọ, chủ nhà, an ninh, tiện ích..."
            value={comment}
            onChange={(e) => setComment(e.target.value)}
          ></textarea>
        </div>

        <div className="p-4 bg-gray-50 border-t flex gap-3">
          <Button variant="outline" className="flex-1 rounded-xl" onClick={onClose}>Hủy</Button>
          <Button 
            className="flex-1 bg-primary text-white hover:bg-primary/90 rounded-xl" 
            onClick={handleSubmit}
            disabled={isSubmitting}
          >
            {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Send className="h-4 w-4 mr-2" />}
            Gửi đánh giá
          </Button>
        </div>
      </div>
    </div>
  );
}
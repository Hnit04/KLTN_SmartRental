import { useEffect, useState, useRef } from 'react';
import { vipApi } from '@/api/vipApi';
import { X, CheckCircle2, Clock, Copy, AlertCircle, PartyPopper } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { toast } from 'sonner';
import VipBadge from '@/components/shared/VipBadge';

interface VipPaymentModalProps {
  tier: string;
  orderId: number;
  qrUrl: string;
  amount: string;
  addInfo: string;
  onClose: () => void;
  onSuccess: () => void;
}

export default function VipPaymentModal({ tier, orderId, qrUrl, amount, addInfo, onClose, onSuccess }: VipPaymentModalProps) {
  const [status, setStatus] = useState<'waiting' | 'success' | 'expired'>('waiting');
  const [timeLeft, setTimeLeft] = useState(15 * 60); // 15 phút
  const pollingRef = useRef<ReturnType<typeof setInterval>>();
  const countdownRef = useRef<ReturnType<typeof setInterval>>();

  useEffect(() => {
    // Polling mỗi 5 giây
    pollingRef.current = setInterval(async () => {
      try {
        const res = await vipApi.getOrderStatus(orderId);
        const data = (res as any).data || res;
        if (data.status === 'PAID') {
          setStatus('success');
          clearInterval(pollingRef.current);
          clearInterval(countdownRef.current);
          toast.success('Thanh toán thành công!');
        } else if (data.status === 'EXPIRED') {
          setStatus('expired');
          clearInterval(pollingRef.current);
          clearInterval(countdownRef.current);
        }
      } catch (e) {
        console.error('Polling error', e);
      }
    }, 5000);

    // Countdown
    countdownRef.current = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          setStatus('expired');
          clearInterval(pollingRef.current);
          clearInterval(countdownRef.current);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => {
      clearInterval(pollingRef.current);
      clearInterval(countdownRef.current);
    };
  }, [orderId]);

  const formatTime = (s: number) => {
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${m.toString().padStart(2, '0')}:${sec.toString().padStart(2, '0')}`;
  };

  const copyContent = () => {
    navigator.clipboard.writeText(addInfo);
    toast.success('Đã copy nội dung chuyển khoản!');
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4" onClick={onClose}>
      <div
        className="bg-white rounded-2xl w-full max-w-md overflow-hidden shadow-2xl animate-in zoom-in-95 duration-200"
        onClick={e => e.stopPropagation()}
      >
        {/* HEADER */}
        <div className="flex items-center justify-between px-6 py-4 border-b bg-gradient-to-r from-indigo-50 to-violet-50">
          <div className="flex items-center gap-2.5">
            <VipBadge tier={tier} size="md" />
            <h2 className="text-base font-bold text-gray-900">Nâng cấp VIP</h2>
          </div>
          <button className="p-1.5 hover:bg-gray-100 rounded-lg transition" onClick={onClose}>
            <X className="h-4 w-4 text-gray-400" />
          </button>
        </div>

        {/* BODY */}
        <div className="p-6">
          {status === 'success' ? (
            /* SUCCESS STATE */
            <div className="text-center py-6 animate-in zoom-in-50 duration-500">
              <div className="w-20 h-20 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-4 animate-bounce">
                <CheckCircle2 className="h-10 w-10 text-emerald-500" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-2">Chúc mừng! 🎉</h3>
              <p className="text-gray-500 text-sm mb-1">
                Bạn đã nâng cấp thành công lên gói
              </p>
              <VipBadge tier={tier} size="lg" />
              <p className="text-xs text-gray-400 mt-3">
                Gói có hiệu lực 30 ngày kể từ bây giờ.
              </p>
              <Button
                className="mt-6 w-full h-11 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold"
                onClick={onSuccess}
              >
                <PartyPopper className="h-4 w-4 mr-2" /> Bắt đầu sử dụng
              </Button>
            </div>
          ) : status === 'expired' ? (
            /* EXPIRED STATE */
            <div className="text-center py-6">
              <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <AlertCircle className="h-8 w-8 text-gray-400" />
              </div>
              <h3 className="text-lg font-bold text-gray-900 mb-2">Đơn hàng đã hết hạn</h3>
              <p className="text-sm text-gray-500 mb-6">
                Vui lòng tạo đơn hàng mới để tiếp tục.
              </p>
              <Button variant="outline" className="rounded-xl" onClick={onClose}>Đóng</Button>
            </div>
          ) : (
            /* WAITING STATE */
            <>
              {/* QR Code */}
              <div className="bg-white border-2 border-dashed border-indigo-200 rounded-xl p-4 flex flex-col items-center mb-5">
                <img src={qrUrl} alt="QR Code" className="w-52 h-52 object-contain" />
                <div className="mt-3 text-center">
                  <p className="text-xs text-gray-400 mb-1">Số tiền</p>
                  <p className="text-2xl font-bold text-gray-900">{Number(amount).toLocaleString('vi-VN')}đ</p>
                </div>
              </div>

              {/* Transfer info */}
              <div className="bg-indigo-50/50 rounded-xl p-4 mb-4 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-gray-500">Nội dung CK</span>
                  <button
                    className="flex items-center gap-1 text-xs text-indigo-600 hover:text-indigo-800 font-medium"
                    onClick={copyContent}
                  >
                    <Copy className="h-3 w-3" /> Copy
                  </button>
                </div>
                <p className="font-mono font-bold text-sm text-gray-900 bg-white rounded-lg px-3 py-2 border text-center select-all">
                  {addInfo}
                </p>
              </div>

              {/* Timer + polling indicator */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-sm text-gray-500">
                  <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
                  Đang chờ xác nhận...
                </div>
                <div className="flex items-center gap-1.5 text-sm">
                  <Clock className="h-3.5 w-3.5 text-gray-400" />
                  <span className={`font-mono font-bold ${timeLeft < 60 ? 'text-red-500' : 'text-gray-700'}`}>
                    {formatTime(timeLeft)}
                  </span>
                </div>
              </div>

              {/* Progress bar */}
              <div className="mt-3 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-indigo-400 to-violet-500 rounded-full transition-all duration-1000"
                  style={{ width: `${(timeLeft / (15 * 60)) * 100}%` }}
                />
              </div>

              {/* Instructions */}
              <div className="mt-5 text-xs text-gray-400 space-y-1">
                <p>📱 Mở app ngân hàng → Quét mã QR</p>
                <p>✅ Kiểm tra nội dung chuyển khoản: <span className="font-bold text-gray-600">{addInfo}</span></p>
                <p>⏳ Hệ thống sẽ tự xác nhận sau 10-30 giây</p>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

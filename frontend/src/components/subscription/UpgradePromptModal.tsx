import { Crown, X, ArrowRight, Home, DoorOpen, Image, Sparkles, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { useNavigate } from 'react-router-dom';
import { useEffect, useState } from 'react';

interface UpgradePromptModalProps {
  isOpen: boolean;
  onClose: () => void;
  limitType: string;   // PROPERTY | ROOM | PROPERTY_IMAGE | ROOM_IMAGE
  currentTier: string;
  currentCount: number;
  maxAllowed: number;
  message?: string;
}

const LIMIT_CONFIG: Record<string, { icon: React.ReactNode; title: string; unit: string }> = {
  PROPERTY: { icon: <Home className="h-6 w-6" />, title: 'Giới hạn khu trọ', unit: 'khu trọ' },
  ROOM: { icon: <DoorOpen className="h-6 w-6" />, title: 'Giới hạn phòng', unit: 'phòng' },
  PROPERTY_IMAGE: { icon: <Image className="h-6 w-6" />, title: 'Giới hạn ảnh khu trọ', unit: 'ảnh' },
  ROOM_IMAGE: { icon: <Image className="h-6 w-6" />, title: 'Giới hạn ảnh phòng', unit: 'ảnh' },
};

const NEXT_TIER: Record<string, { name: string; emoji: string; price: string; gradient: string; border: string; text: string }> = {
  FREE: { name: 'SILVER', emoji: '🥈', price: '79.000đ/tháng', gradient: 'from-slate-100 to-blue-50', border: 'border-slate-300', text: 'text-slate-800' },
  SILVER: { name: 'GOLD', emoji: '🥇', price: '199.000đ/tháng', gradient: 'from-amber-100 to-orange-50', border: 'border-amber-300', text: 'text-amber-800' },
  GOLD: { name: 'PLATINUM', emoji: '💎', price: '399.000đ/tháng', gradient: 'from-violet-100 to-purple-50', border: 'border-violet-300', text: 'text-violet-800' },
  PLATINUM: { name: 'PLATINUM', emoji: '💎', price: '', gradient: '', border: '', text: '' },
};

export default function UpgradePromptModal({ isOpen, onClose, limitType, currentTier, currentCount, maxAllowed, message }: UpgradePromptModalProps) {
  const navigate = useNavigate();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    if (isOpen) {
      const timer = setTimeout(() => setMounted(true), 100);
      return () => clearTimeout(timer);
    } else {
      setMounted(false);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const config = LIMIT_CONFIG[limitType] || LIMIT_CONFIG.PROPERTY;
  const nextTier = NEXT_TIER[currentTier] || NEXT_TIER.FREE;

  const progressPercent = maxAllowed > 0 ? Math.min(100, (currentCount / maxAllowed) * 100) : 100;
  const displayProgress = mounted ? progressPercent : 0;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-md p-4 transition-all duration-300 animate-in fade-in" onClick={onClose}>
      <div
        className="bg-white rounded-3xl w-full max-w-md overflow-hidden shadow-2xl animate-in zoom-in-95 fade-in duration-300"
        onClick={e => e.stopPropagation()}
      >
        {/* Header - Sleek Dark Premium Look */}
        <div className="bg-gradient-to-br from-slate-900 via-slate-800 to-indigo-950 px-6 py-8 text-white text-center relative overflow-hidden">
          {/* Decorative background circles */}
          <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-full blur-2xl -mr-10 -mt-10" />
          <div className="absolute bottom-0 left-0 w-24 h-24 bg-indigo-500/20 rounded-full blur-xl -ml-8 -mb-8" />
          
          <button className="absolute top-4 right-4 p-1.5 hover:bg-white/20 rounded-full transition-colors z-10" onClick={onClose}>
            <X className="h-5 w-5 text-slate-300" />
          </button>
          
          <div className="w-16 h-16 bg-white/10 backdrop-blur-md rounded-2xl flex items-center justify-center mx-auto mb-4 border border-white/20 shadow-lg relative z-10">
            <div className="absolute inset-0 bg-indigo-500/30 blur-md rounded-2xl animate-pulse" />
            <div className="relative z-10">
              {config.icon}
            </div>
          </div>
          <h3 className="font-extrabold text-xl relative z-10 tracking-tight">{config.title}</h3>
          <p className="text-sm text-slate-300 mt-1 relative z-10">Bạn đã đạt giới hạn của gói hiện tại</p>
        </div>

        {/* Body */}
        <div className="p-7">
          {/* Usage bar */}
          <div className="mb-6">
            <div className="flex justify-between items-end mb-2">
              <span className="text-sm font-medium text-slate-500">Đã sử dụng</span>
              <div className="text-right">
                <span className="font-black text-xl text-slate-900">{currentCount}</span>
                <span className="text-sm font-semibold text-slate-500"> / {maxAllowed} {config.unit}</span>
              </div>
            </div>
            <div className="h-4 bg-slate-100 rounded-full overflow-hidden p-0.5 border border-slate-200">
              <div
                className="h-full bg-gradient-to-r from-red-500 to-rose-500 rounded-full transition-all duration-1000 ease-out relative overflow-hidden"
                style={{ width: `${displayProgress}%` }}
              >
                <div className="absolute inset-0 bg-white/20 w-full h-full animate-[shimmer_2s_infinite] -skew-x-12" />
              </div>
            </div>
            <div className="flex items-center gap-1.5 mt-2.5 text-xs font-bold text-rose-500 bg-rose-50 px-2.5 py-1.5 rounded-lg w-fit">
              <AlertTriangle className="h-3.5 w-3.5" />
              Cần nâng cấp để tiếp tục
            </div>
          </div>

          {/* Message */}
          {message && (
            <p className="text-sm text-slate-600 mb-6 bg-slate-50 rounded-xl p-3.5 border border-slate-100 leading-relaxed">
              {message}
            </p>
          )}

          {/* Upgrade CTA Card */}
          {currentTier !== 'PLATINUM' && (
            <div className={`rounded-2xl p-4 mb-6 border-2 bg-gradient-to-r ${nextTier.gradient} ${nextTier.border} relative overflow-hidden group cursor-pointer hover:shadow-md transition-all`}
                 onClick={() => { onClose(); navigate('/landlord/vip'); }}>
              <div className="absolute right-0 top-0 h-full w-32 bg-white/40 blur-3xl transform translate-x-full group-hover:-translate-x-full transition-transform duration-1000 ease-in-out" />
              
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="text-3xl bg-white p-2 rounded-xl shadow-sm border border-white/50">{nextTier.emoji}</div>
                  <div>
                    <p className={`font-black text-sm uppercase tracking-wider ${nextTier.text}`}>Lên {nextTier.name}</p>
                    <p className="text-xs font-medium text-slate-600 mt-0.5">{nextTier.price}</p>
                  </div>
                </div>
                <div className="w-8 h-8 rounded-full bg-white flex items-center justify-center shadow-sm text-slate-400 group-hover:text-indigo-600 group-hover:bg-indigo-50 transition-colors">
                  <ArrowRight className="h-4 w-4" />
                </div>
              </div>
            </div>
          )}

          {/* Buttons */}
          <div className="flex gap-3">
            <Button variant="outline" className="flex-1 h-12 rounded-xl font-semibold border-slate-200 text-slate-600 hover:bg-slate-50 hover:text-slate-900" onClick={onClose}>
              Để sau
            </Button>
            {currentTier !== 'PLATINUM' && (
              <Button
                className="flex-[1.5] h-12 rounded-xl font-bold bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-700 hover:to-violet-700 text-white shadow-lg shadow-indigo-200 transition-all hover:-translate-y-0.5 gap-2"
                onClick={() => {
                  onClose();
                  navigate('/landlord/vip');
                }}
              >
                <Sparkles className="h-4 w-4" /> Nâng cấp VIP
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

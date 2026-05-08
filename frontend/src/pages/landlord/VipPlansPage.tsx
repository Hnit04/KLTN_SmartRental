import { useEffect, useState, useRef } from 'react';
import { vipApi } from '@/api/vipApi';
import { useAuth } from '@/context/AuthContext';
import { Crown, Check, X, Zap, ChevronDown, History, Sparkles, Shield, Star, Image, Home, DoorOpen, Bot } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import VipPaymentModal from '@/components/subscription/VipPaymentModal';
import VipBadge from '@/components/shared/VipBadge';

const TIERS = ['FREE', 'SILVER', 'GOLD', 'PLATINUM'] as const;
type TierName = typeof TIERS[number];

const TIER_CONFIG: Record<TierName, {
  label: string; emoji: string; gradient: string; border: string;
  headerBg: string; btnClass: string; popular?: boolean;
}> = {
  FREE: {
    label: 'Miễn phí', emoji: '🆓',
    gradient: 'from-gray-50 to-white', border: 'border-gray-200',
    headerBg: 'bg-gray-100', btnClass: 'bg-gray-200 text-gray-500 cursor-default',
  },
  SILVER: {
    label: 'Silver', emoji: '🥈',
    gradient: 'from-slate-50 to-blue-50/30', border: 'border-slate-300',
    headerBg: 'bg-gradient-to-r from-slate-200 to-blue-100',
    btnClass: 'bg-slate-700 hover:bg-slate-800 text-white shadow-md',
  },
  GOLD: {
    label: 'Gold', emoji: '🥇',
    gradient: 'from-amber-50/50 to-orange-50/30', border: 'border-amber-300',
    headerBg: 'bg-gradient-to-r from-amber-200 to-yellow-100',
    btnClass: 'bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white shadow-lg shadow-amber-200',
    popular: true,
  },
  PLATINUM: {
    label: 'Platinum', emoji: '💎',
    gradient: 'from-violet-50/50 to-purple-50/30', border: 'border-violet-300',
    headerBg: 'bg-gradient-to-r from-violet-300 to-purple-200',
    btnClass: 'bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-700 hover:to-purple-700 text-white shadow-lg shadow-violet-200',
  },
};

// Danh sách quyền lợi hiển thị
const BENEFIT_ROWS: { icon: React.ReactNode; label: string; key: string }[] = [
  { icon: <Home className="h-4 w-4" />, label: 'Số khu trọ', key: 'maxProperties' },
  { icon: <DoorOpen className="h-4 w-4" />, label: 'Phòng / khu trọ', key: 'maxRoomsPerProperty' },
  { icon: <Image className="h-4 w-4" />, label: 'Ảnh / khu trọ', key: 'maxImagesPerProperty' },
  { icon: <Image className="h-4 w-4" />, label: 'Ảnh / phòng', key: 'maxImagesPerRoom' },
  { icon: <span className="text-sm">🌐</span>, label: 'Ảnh 360° / phòng', key: 'maxPanoramaPerRoom' },
  { icon: <Bot className="h-4 w-4" />, label: 'AI tạo mô tả', key: 'aiDescMonthlyLimit' },
  { icon: <Zap className="h-4 w-4" />, label: 'Boost tìm kiếm', key: 'searchBoost' },
  { icon: <Shield className="h-4 w-4" />, label: 'Hỗ trợ ưu tiên', key: 'prioritySupport' },
];

function formatValue(key: string, val: any): string {
  if (key === 'prioritySupport') return val ? '✅' : '❌';
  if (key === 'searchBoost') return val > 0 ? `+${val} điểm` : '❌';
  if (typeof val === 'number' && val === -1) return '♾️ Không giới hạn';
  if (typeof val === 'number' && val === 0) return '❌';
  if (key === 'aiDescMonthlyLimit') return `${val} lần/tháng`;
  return `${val}`;
}

export default function VipPlansPage() {
  const { user } = useAuth();
  const [plans, setPlans] = useState<any[]>([]);
  const [myPlan, setMyPlan] = useState<any>(null);
  const [history, setHistory] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [paymentModal, setPaymentModal] = useState<{ tier: string; orderId: number; qrUrl: string; amount: string; addInfo: string } | null>(null);
  const [purchasing, setPurchasing] = useState<string | null>(null);
  const [showHistory, setShowHistory] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setIsLoading(true);
      const [plansRes, myPlanRes, historyRes] = await Promise.all([
        vipApi.getPlans(),
        vipApi.getMyPlan().catch(() => null),
        vipApi.getHistory().catch(() => null),
      ]);
      setPlans((plansRes as any).data || plansRes);
      if (myPlanRes) setMyPlan((myPlanRes as any).data || myPlanRes);
      if (historyRes) setHistory((historyRes as any).data || historyRes);
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  };

  const handlePurchase = async (tier: string) => {
    if (tier === 'FREE') return;
    try {
      setPurchasing(tier);
      const res = await vipApi.purchaseVip(tier);
      const data = (res as any).data || res;
      setPaymentModal({
        tier,
        orderId: data.orderId,
        qrUrl: data.qrUrl,
        amount: data.amount,
        addInfo: data.addInfo,
      });
    } catch (e: any) {
      alert(e?.response?.data?.error || 'Có lỗi xảy ra');
    } finally {
      setPurchasing(null);
    }
  };

  const onPaymentSuccess = () => {
    setPaymentModal(null);
    loadData();
  };

  const currentTier = myPlan?.tier || 'FREE';

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-32">
        <div className="relative">
          <div className="w-16 h-16 border-4 border-violet-100 rounded-full" />
          <Crown className="absolute inset-0 m-auto h-7 w-7 text-violet-500 animate-pulse" />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-[80vh] animate-in fade-in duration-300">
      {/* HERO HEADER */}
      <div className="bg-gradient-to-br from-indigo-600 via-violet-600 to-purple-700 text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 sm:py-14">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-3 mb-3">
                <div className="p-3 bg-white/15 backdrop-blur-sm rounded-2xl">
                  <Crown className="h-7 w-7" />
                </div>
                <h1 className="text-3xl sm:text-4xl font-bold">Gói VIP SmartRental</h1>
              </div>
              <p className="text-white/70 text-sm sm:text-base max-w-lg">
                Nâng cấp để đăng thêm khu trọ, mở khóa AI tạo mô tả, và tiếp cận nhiều khách thuê hơn.
              </p>
            </div>
            {myPlan && currentTier !== 'FREE' && (
              <div className="bg-white/10 backdrop-blur-sm border border-white/20 rounded-2xl px-5 py-3 text-center">
                <VipBadge tier={currentTier} size="lg" />
                <p className="text-xs text-white/60 mt-1">
                  Hết hạn: {myPlan.endDate ? new Date(myPlan.endDate).toLocaleDateString('vi-VN') : '—'}
                </p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* PRICING CARDS */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 -mt-8 pb-12">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 lg:gap-5">
          {TIERS.map((tierName, idx) => {
            const config = TIER_CONFIG[tierName];
            const plan = plans.find((p: any) => p.tier === tierName);
            const isCurrent = currentTier === tierName;
            const isUpgrade = TIERS.indexOf(tierName) > TIERS.indexOf(currentTier as TierName);

            return (
              <div
                key={tierName}
                className={`relative rounded-2xl border-2 bg-gradient-to-b ${config.gradient} ${config.border} overflow-hidden transition-all duration-300 hover:shadow-xl hover:-translate-y-1 flex flex-col ${config.popular ? 'lg:scale-105 lg:z-10 shadow-lg' : 'shadow-sm'}`}
                style={{ animationDelay: `${idx * 100}ms` }}
              >
                {/* Popular ribbon */}
                {config.popular && (
                  <div className="absolute top-0 right-0 bg-gradient-to-r from-amber-500 to-orange-500 text-white text-[10px] font-bold px-3 py-1 rounded-bl-xl shadow-sm">
                    PHỔ BIẾN NHẤT
                  </div>
                )}

                {/* Header */}
                <div className={`${config.headerBg} px-5 py-4`}>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-2xl">{config.emoji}</span>
                    <h3 className="text-lg font-bold text-gray-900">{config.label}</h3>
                  </div>
                  <div className="flex items-baseline gap-1">
                    <span className="text-3xl font-extrabold text-gray-900">
                      {plan?.price ? `${(plan.price / 1000).toFixed(0)}K` : '0đ'}
                    </span>
                    {plan?.price > 0 && <span className="text-sm text-gray-500">/tháng</span>}
                  </div>
                </div>

                {/* Benefits */}
                <div className="flex-1 px-5 py-4 space-y-2.5">
                  {BENEFIT_ROWS.map((row) => {
                    const val = plan?.[row.key];
                    const isDisabled = val === 0 || val === false;
                    const isUnlimited = val === -1;

                    return (
                      <div key={row.key} className={`flex items-center gap-2.5 text-sm ${isDisabled ? 'text-gray-400' : 'text-gray-700'}`}>
                        <div className={`w-5 h-5 rounded-full flex items-center justify-center shrink-0 ${
                          isDisabled ? 'bg-gray-100' : isUnlimited ? 'bg-violet-100 text-violet-600' : 'bg-emerald-100 text-emerald-600'
                        }`}>
                          {isDisabled ? <X className="h-3 w-3" /> : <Check className="h-3 w-3" />}
                        </div>
                        <span className="flex-1">{row.label}</span>
                        <span className={`font-semibold text-xs ${isUnlimited ? 'text-violet-600' : isDisabled ? 'text-gray-300' : 'text-gray-800'}`}>
                          {formatValue(row.key, val)}
                        </span>
                      </div>
                    );
                  })}
                </div>

                {/* CTA */}
                <div className="px-5 pb-5">
                  {isCurrent ? (
                    <div className="w-full h-11 rounded-xl bg-emerald-50 border-2 border-emerald-200 text-emerald-700 font-bold text-sm flex items-center justify-center gap-2">
                      <Check className="h-4 w-4" /> Đang sử dụng
                    </div>
                  ) : isUpgrade ? (
                    <Button
                      className={`w-full h-11 rounded-xl font-bold text-sm ${config.btnClass}`}
                      onClick={() => handlePurchase(tierName)}
                      disabled={purchasing === tierName}
                    >
                      {purchasing === tierName ? (
                        <span className="animate-pulse">Đang tạo đơn...</span>
                      ) : (
                        <>
                          <Sparkles className="h-4 w-4 mr-1.5" /> Nâng cấp ngay
                        </>
                      )}
                    </Button>
                  ) : (
                    <div className="w-full h-11 rounded-xl bg-gray-50 border border-gray-200 text-gray-400 font-medium text-sm flex items-center justify-center">
                      Gói thấp hơn
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* CURRENT PLAN STATS */}
        {myPlan && (
          <div className="mt-10 bg-white border rounded-2xl p-6 shadow-sm">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div>
                <h3 className="font-bold text-gray-900 flex items-center gap-2 mb-1">
                  <Crown className="h-5 w-5 text-violet-500" />
                  Gói hiện tại: <VipBadge tier={currentTier} size="md" />
                </h3>
                <p className="text-sm text-gray-500">
                  {currentTier === 'FREE'
                    ? 'Bạn đang sử dụng gói miễn phí với giới hạn cơ bản.'
                    : `Hiệu lực đến ${myPlan.endDate ? new Date(myPlan.endDate).toLocaleDateString('vi-VN') : '—'}`
                  }
                </p>
              </div>
              <div className="flex gap-4">
                <div className="bg-gray-50 rounded-xl px-4 py-2 text-center">
                  <p className="text-lg font-bold text-gray-900">{myPlan.currentPropertyCount || 0}</p>
                  <p className="text-[10px] text-gray-400 font-medium">/ {myPlan.maxProperties === -1 ? '♾️' : myPlan.maxProperties} khu trọ</p>
                </div>
                <div className="bg-gray-50 rounded-xl px-4 py-2 text-center">
                  <p className="text-lg font-bold text-indigo-600">+{myPlan.searchBoost || 0}</p>
                  <p className="text-[10px] text-gray-400 font-medium">Boost điểm</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* PAYMENT HISTORY */}
        {history.filter((h: any) => h.status === 'PAID').length > 0 && (
          <div className="mt-6">
            <button
              className="flex items-center gap-2 text-sm font-semibold text-gray-600 hover:text-gray-900 transition mb-3"
              onClick={() => setShowHistory(!showHistory)}
            >
              <History className="h-4 w-4" />
              Lịch sử thanh toán ({history.filter((h: any) => h.status === 'PAID').length})
              <ChevronDown className={`h-4 w-4 transition ${showHistory ? 'rotate-180' : ''}`} />
            </button>
            {showHistory && (
              <div className="bg-white border rounded-xl overflow-hidden">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-gray-50 border-b">
                      <th className="text-left px-4 py-3 text-gray-500 font-medium">Mã</th>
                      <th className="text-left px-4 py-3 text-gray-500 font-medium">Gói</th>
                      <th className="text-left px-4 py-3 text-gray-500 font-medium">Số tiền</th>
                      <th className="text-left px-4 py-3 text-gray-500 font-medium">Trạng thái</th>
                      <th className="text-left px-4 py-3 text-gray-500 font-medium">Ngày</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {history.filter((h: any) => h.status === 'PAID').map((h: any) => (
                      <tr key={h.id} className="hover:bg-gray-50/50">
                        <td className="px-4 py-3 font-mono text-xs text-gray-500">#{h.id}</td>
                        <td className="px-4 py-3"><VipBadge tier={h.tier} size="sm" /></td>
                        <td className="px-4 py-3 font-semibold">{Number(h.amount).toLocaleString('vi-VN')}đ</td>
                        <td className="px-4 py-3">
                          <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                            h.status === 'PAID' ? 'bg-emerald-100 text-emerald-700' :
                            h.status === 'PENDING' ? 'bg-amber-100 text-amber-700' :
                            'bg-gray-100 text-gray-500'
                          }`}>
                            {h.status === 'PAID' ? 'Đã thanh toán' : h.status === 'PENDING' ? 'Chờ TT' : 'Hết hạn'}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-gray-500 text-xs">
                          {h.createdAt ? new Date(h.createdAt).toLocaleDateString('vi-VN') : '—'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Payment Modal */}
      {paymentModal && (
        <VipPaymentModal
          tier={paymentModal.tier}
          orderId={paymentModal.orderId}
          qrUrl={paymentModal.qrUrl}
          amount={paymentModal.amount}
          addInfo={paymentModal.addInfo}
          onClose={() => setPaymentModal(null)}
          onSuccess={onPaymentSuccess}
        />
      )}
    </div>
  );
}

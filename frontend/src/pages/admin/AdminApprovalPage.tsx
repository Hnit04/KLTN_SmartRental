import { useEffect, useState } from 'react';
import { propertyApi } from '@/api/propertyApi';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import StatusBadge from '@/components/shared/StatusBadge';
import { toast } from 'sonner';
import { 
  Loader2, CheckCircle, XCircle, Building, MapPin, ExternalLink, 
  ShieldCheck, AlertTriangle, ShieldAlert, ArrowUpDown, X, MessageSquare,
  Home, DoorOpen
} from 'lucide-react';
import type { Property, Room } from '@/types/index';
import { Link } from 'react-router-dom';

type TabType = 'properties' | 'rooms';
type SortType = 'newest' | 'score_asc' | 'score_desc';

export default function AdminApprovalPage() {
  const [activeTab, setActiveTab] = useState<TabType>('properties');
  const [pendingProperties, setPendingProperties] = useState<Property[]>([]);
  const [pendingRooms, setPendingRooms] = useState<Room[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState<number | null>(null);
  const [sortBy, setSortBy] = useState<SortType>('newest');

  // Reject dialog state
  const [rejectTarget, setRejectTarget] = useState<{ type: 'property' | 'room'; id: number; name: string } | null>(null);
  const [rejectReason, setRejectReason] = useState('');
  const [isRejecting, setIsRejecting] = useState(false);

  useEffect(() => {
    fetchData();
  }, [activeTab]);

  const fetchData = async () => {
    setLoading(true);
    try {
      if (activeTab === 'properties') {
        const res = await propertyApi.getPendingProperties();
        setPendingProperties((res as any).data || res);
      } else {
        const res = await propertyApi.getPendingRooms();
        setPendingRooms((res as any).data || res);
      }
    } catch (error) {
      toast.error('Không thể tải danh sách chờ duyệt');
    } finally {
      setLoading(false);
    }
  };

  // Sort helper
  const sortItems = <T extends { safetyScore?: number | null; id?: number }>(items: T[]): T[] => {
    return [...items].sort((a, b) => {
      if (sortBy === 'score_asc') return (a.safetyScore || 0) - (b.safetyScore || 0);
      if (sortBy === 'score_desc') return (b.safetyScore || 0) - (a.safetyScore || 0);
      return (b.id || 0) - (a.id || 0); // newest
    });
  };

  // --- PROPERTY ACTIONS ---
  const handleApproveProperty = async (id: number) => {
    try {
      setSubmitting(id);
      await propertyApi.approveProperty(id);
      toast.success('Đã duyệt khu trọ thành công!');
      fetchData();
    } catch (error) {
      toast.error('Duyệt thất bại');
    } finally {
      setSubmitting(null);
    }
  };

  // --- ROOM ACTIONS ---
  const handleApproveRoom = async (id: number) => {
    try {
      setSubmitting(id);
      await propertyApi.approveRoom(id);
      toast.success('Đã duyệt phòng thành công!');
      fetchData();
    } catch (error) {
      toast.error('Duyệt thất bại');
    } finally {
      setSubmitting(null);
    }
  };

  // --- REJECT WITH REASON ---
  const openRejectDialog = (type: 'property' | 'room', id: number, name: string) => {
    setRejectTarget({ type, id, name });
    setRejectReason('');
  };

  const handleConfirmReject = async () => {
    if (!rejectTarget) return;
    setIsRejecting(true);
    try {
      if (rejectTarget.type === 'property') {
        await propertyApi.rejectProperty(rejectTarget.id, rejectReason || undefined);
        toast.success('Đã từ chối khu trọ');
      } else {
        await propertyApi.rejectRoom(rejectTarget.id, rejectReason || undefined);
        toast.success('Đã từ chối phòng');
      }
      setRejectTarget(null);
      fetchData();
    } catch (error) {
      toast.error('Thao tác thất bại');
    } finally {
      setIsRejecting(false);
    }
  };

  // --- AI SCORE BADGE ---
  const AiScoreBadge = ({ score, reason }: { score?: number | null; reason?: string | null }) => {
    const s = score || 0;
    return (
      <div className={`mt-4 p-3 rounded-lg border ${
        s < 50 ? 'bg-red-50 border-red-200' : 'bg-gray-50 border-gray-100'
      }`}>
        <div className="flex items-center justify-between mb-1">
          <span className="text-xs font-semibold text-gray-600 uppercase tracking-wider">Kiểm duyệt AI</span>
          <span className={`text-sm font-bold ${
            s >= 80 ? 'text-green-600' : s >= 50 ? 'text-yellow-600' : 'text-red-600'
          }`}>
            {s}/100
          </span>
        </div>
        <div className="flex items-center gap-2">
          {s >= 80 ? (
            <div className="flex items-center gap-1">
              <ShieldCheck className="h-3 w-3 text-green-700" />
              <StatusBadge label="Do an toan cao" tone="success" className="text-[11px]" />
            </div>
          ) : s >= 50 ? (
            <div className="flex items-center gap-1">
              <AlertTriangle className="h-3 w-3 text-amber-700" />
              <StatusBadge label="Can xem ky noi dung" tone="warning" className="text-[11px]" />
            </div>
          ) : (
            <div className="flex items-center gap-1">
              <ShieldAlert className="h-3 w-3 text-red-700" />
              <StatusBadge label="Nguy co vi pham cao" tone="danger" className="text-[11px]" />
            </div>
          )}
          <span className="text-[10px] text-gray-400 italic font-normal">
            Dựa trên phân tích tự động từ AI
          </span>
        </div>
        {reason && (
          <div className="mt-2 text-xs text-gray-600 bg-white border border-gray-100 p-2 rounded">
            <span className="font-semibold text-gray-700">Lý do chấm điểm:</span> {reason}
          </div>
        )}
      </div>
    );
  };

  // --- ACTION BUTTONS ---
  const ActionButtons = ({ id, name, type }: { id: number; name: string; type: 'property' | 'room' }) => (
    <div className="flex flex-col gap-2">
      <Button 
        onClick={() => type === 'property' ? handleApproveProperty(id) : handleApproveRoom(id)}
        disabled={submitting === id}
        className="bg-green-600 hover:bg-green-700 text-white min-w-[120px]"
      >
        {submitting === id ? <Loader2 className="h-4 w-4 animate-spin" /> : <><CheckCircle className="h-4 w-4 mr-2" /> Duyệt tin</>}
      </Button>
      <Button 
        onClick={() => openRejectDialog(type, id, name)}
        disabled={submitting === id}
        variant="outline"
        className="border-red-200 text-red-600 hover:bg-red-50 min-w-[120px]"
      >
        {submitting === id ? <Loader2 className="h-4 w-4 animate-spin" /> : <><XCircle className="h-4 w-4 mr-2" /> Từ chối</>}
      </Button>
      {type === 'property' && (
        <Link to={`/properties/${id}`} target="_blank">
          <Button variant="ghost" size="sm" className="w-full text-blue-600">
            <ExternalLink className="h-4 w-4 mr-2" /> Xem chi tiết
          </Button>
        </Link>
      )}
    </div>
  );

  if (loading) return (
    <div className="flex justify-center items-center h-64">
      <Loader2 className="h-8 w-8 animate-spin text-primary" />
    </div>
  );

  return (
    <div className="container mx-auto py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Duyệt tin đăng</h1>
        <p className="text-gray-500 mt-2">Duyệt các khu trọ và phòng trọ mới đăng hoặc vừa cập nhật thông tin.</p>
      </div>

      {/* TABS */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex gap-1 bg-gray-100 p-1 rounded-lg">
          <button
            onClick={() => setActiveTab('properties')}
            className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-all ${
              activeTab === 'properties' 
                ? 'bg-white text-gray-900 shadow-sm' 
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            <Building className="h-4 w-4" />
            Khu trọ
            {pendingProperties.length > 0 && activeTab !== 'properties' && (
              <StatusBadge label={`${pendingProperties.length}`} tone="warning" className="text-[10px] font-bold" />
            )}
          </button>
          <button
            onClick={() => setActiveTab('rooms')}
            className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-all ${
              activeTab === 'rooms' 
                ? 'bg-white text-gray-900 shadow-sm' 
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            <DoorOpen className="h-4 w-4" />
            Phòng trọ
            {pendingRooms.length > 0 && activeTab !== 'rooms' && (
              <StatusBadge label={`${pendingRooms.length}`} tone="warning" className="text-[10px] font-bold" />
            )}
          </button>
        </div>

        {/* SORT DROPDOWN */}
        <div className="flex items-center gap-2">
          <ArrowUpDown className="h-4 w-4 text-gray-400" />
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as SortType)}
            className="text-sm border border-gray-200 rounded-md px-3 py-1.5 bg-white focus:ring-2 focus:ring-primary outline-none"
          >
            <option value="newest">Mới nhất</option>
            <option value="score_asc">AI Score: Thấp → Cao (Ưu tiên)</option>
            <option value="score_desc">AI Score: Cao → Thấp</option>
          </select>
        </div>
      </div>

      {/* TAB CONTENT: KHU TRỌ */}
      {activeTab === 'properties' && (
        <>
          {pendingProperties.length === 0 ? (
            <Card className="p-12 text-center bg-gray-50 border-dashed border-2">
              <CheckCircle className="h-12 w-12 text-gray-300 mx-auto mb-4" />
              <h3 className="text-xl font-medium text-gray-600">Tuyệt vời! Không có khu trọ nào đang chờ duyệt.</h3>
            </Card>
          ) : (
            <div className="grid grid-cols-1 gap-6">
              {sortItems(pendingProperties).map((p) => (
                <Card key={p.id} className={`p-6 overflow-hidden flex flex-col md:flex-row gap-6 ${
                  (p.safetyScore || 0) < 50 ? 'border-red-300 border-2 bg-red-50/30' : ''
                }`}>
                  <div className="w-full md:w-64 h-40 bg-gray-100 rounded-lg overflow-hidden shrink-0">
                    {p.images && p.images.length > 0 ? (
                      <img src={p.images[0]} alt={p.name} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-gray-400">
                        <Building className="h-12 w-12" />
                      </div>
                    )}
                  </div>

                  <div className="flex-1">
                    <div className="flex justify-between items-start">
                      <div>
                        <h2 className="text-xl font-bold text-gray-900">{p.name}</h2>
                        <p className="flex items-center text-gray-500 text-sm mt-1">
                          <MapPin className="h-4 w-4 mr-1" /> {p.address}, {p.district}, {p.city}
                        </p>
                        <p className="mt-2 text-gray-600 text-sm line-clamp-2">{p.description}</p>
                        <div className="mt-4 flex gap-4 text-xs font-medium text-gray-500">
                           <span>Điện: {p.elecPrice?.toLocaleString()}đ</span>
                           <span>Nước: {p.waterPrice?.toLocaleString()}đ</span>
                           <span>Internet: {p.internetPrice?.toLocaleString()}đ</span>
                        </div>

                        <AiScoreBadge score={p.safetyScore} reason={p.moderationReason} />
                      </div>
                      
                      <ActionButtons id={p.id} name={p.name} type="property" />
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </>
      )}

      {/* TAB CONTENT: PHÒNG TRỌ */}
      {activeTab === 'rooms' && (
        <>
          {pendingRooms.length === 0 ? (
            <Card className="p-12 text-center bg-gray-50 border-dashed border-2">
              <CheckCircle className="h-12 w-12 text-gray-300 mx-auto mb-4" />
              <h3 className="text-xl font-medium text-gray-600">Tuyệt vời! Không có phòng nào đang chờ duyệt.</h3>
            </Card>
          ) : (
            <div className="grid grid-cols-1 gap-6">
              {sortItems(pendingRooms).map((r) => (
                <Card key={r.id} className={`p-6 overflow-hidden flex flex-col md:flex-row gap-6 ${
                  (r.safetyScore || 0) < 50 ? 'border-red-300 border-2 bg-red-50/30' : ''
                }`}>
                  <div className="w-full md:w-64 h-40 bg-gray-100 rounded-lg overflow-hidden shrink-0">
                    {r.images && r.images.length > 0 ? (
                      <img src={r.images[0]} alt={r.name} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-gray-400">
                        <Home className="h-12 w-12" />
                      </div>
                    )}
                  </div>

                  <div className="flex-1">
                    <div className="flex justify-between items-start">
                      <div>
                        <h2 className="text-xl font-bold text-gray-900">Phòng {r.name}</h2>
                        <p className="text-gray-500 text-sm mt-1">
                          Khu trọ: <span className="font-medium text-gray-700">{r.propertyName || 'N/A'}</span>
                        </p>
                        {r.propertyAddress && (
                          <p className="flex items-center text-gray-400 text-xs mt-0.5">
                            <MapPin className="h-3 w-3 mr-1" /> {r.propertyAddress}
                          </p>
                        )}
                        <div className="mt-3 flex flex-wrap gap-3 text-sm">
                          <span className="text-primary font-bold">{r.price?.toLocaleString()}đ/tháng</span>
                          <span className="text-gray-500">{r.area}m²</span>
                          <span className="text-gray-500">{r.type || 'STUDIO'}</span>
                        </div>
                        {r.amenities && r.amenities.length > 0 && (
                          <p className="text-xs text-gray-500 mt-2 line-clamp-1">
                            Tiện ích: {r.amenities.join(', ')}
                          </p>
                        )}

                        <AiScoreBadge score={r.safetyScore} reason={r.moderationReason} />
                      </div>
                      
                      <ActionButtons id={r.id} name={r.name} type="room" />
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </>
      )}

      {/* REJECT DIALOG */}
      {rejectTarget && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in">
          <div className="bg-white rounded-2xl w-full max-w-md p-6 shadow-2xl animate-in zoom-in-95">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                <MessageSquare className="h-5 w-5 text-red-500" />
                Từ chối {rejectTarget.type === 'property' ? 'khu trọ' : 'phòng'}
              </h3>
              <button onClick={() => setRejectTarget(null)} className="text-gray-400 hover:text-gray-600">
                <X className="h-5 w-5" />
              </button>
            </div>

            <p className="text-sm text-gray-600 mb-1">
              Bạn đang từ chối: <strong className="text-gray-900">"{rejectTarget.name}"</strong>
            </p>
            <p className="text-xs text-gray-400 mb-4">
              Chủ trọ sẽ nhận được thông báo kèm lý do này để chỉnh sửa lại bài viết.
            </p>

            <textarea
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              placeholder="Nhập lý do từ chối (VD: Ảnh không rõ ràng, nội dung thiếu thông tin giá...)..."
              className="w-full border border-gray-300 rounded-lg p-3 text-sm focus:ring-2 focus:ring-red-300 outline-none resize-none"
              rows={4}
              autoFocus
            />

            <div className="flex gap-3 mt-4">
              <Button 
                variant="outline" 
                className="flex-1" 
                onClick={() => setRejectTarget(null)}
                disabled={isRejecting}
              >
                Hủy
              </Button>
              <Button 
                className="flex-1 bg-red-600 hover:bg-red-700 text-white" 
                onClick={handleConfirmReject}
                disabled={isRejecting}
              >
                {isRejecting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <XCircle className="h-4 w-4 mr-2" />}
                Xác nhận từ chối
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

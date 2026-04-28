import { useEffect, useState, lazy, Suspense } from 'react';
import { propertyApi } from '@/api/propertyApi';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import StatusBadge from '@/components/shared/StatusBadge';
import { toast } from 'sonner';
import { 
  Loader2, CheckCircle, XCircle, Building, MapPin, ExternalLink, 
  ShieldCheck, AlertTriangle, ShieldAlert, ArrowUpDown, X, MessageSquare,
  Home, DoorOpen, Eye
} from 'lucide-react';
import type { Property, Room } from '@/types/index';
import { Link } from 'react-router-dom';

const Room360Viewer = lazy(() => import('@/components/property/Room360Viewer'));

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

  // Quick View Modal state
  const [detailModalTarget, setDetailModalTarget] = useState<{ type: 'property' | 'room'; data: any } | null>(null);

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
  const ActionButtons = ({ id, name, type, item }: { id: number; name: string; type: 'property' | 'room', item: any }) => (
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
      <Button 
        variant="ghost" 
        size="sm" 
        className="w-full text-blue-600 bg-blue-50/50 hover:bg-blue-100"
        onClick={() => setDetailModalTarget({ type, data: item })}
      >
        <Eye className="h-4 w-4 mr-2" /> Xem chi tiết
      </Button>
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
                      
                      <ActionButtons id={p.id} name={p.name} type="property" item={p} />
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

                        {r.panoramaImages && r.panoramaImages.length > 0 && (
                          <div className="mt-2">
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-cyan-50 text-cyan-700 text-xs font-bold rounded-md border border-cyan-200">
                              🌐 {r.panoramaImages.length} ảnh 360°
                            </span>
                          </div>
                        )}

                        <AiScoreBadge score={r.safetyScore} reason={r.moderationReason} />
                      </div>
                      
                      <ActionButtons id={r.id} name={r.name} type="room" item={r} />
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </>
      )}

      {/* DETAIL MODAL */}
      {detailModalTarget && (
        <div className="fixed inset-0 z-[50] flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 md:p-8 animate-in fade-in">
          <div className="bg-white rounded-2xl w-full max-w-4xl max-h-[90vh] flex flex-col shadow-2xl animate-in zoom-in-95">
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b shrink-0 bg-gray-50/50">
              <h3 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                {detailModalTarget.type === 'property' ? <Building className="h-6 w-6 text-primary" /> : <Home className="h-6 w-6 text-primary" />}
                Chi tiết {detailModalTarget.type === 'property' ? 'khu trọ' : 'phòng'}: {detailModalTarget.data.name}
              </h3>
              <button onClick={() => setDetailModalTarget(null)} className="text-gray-400 hover:text-gray-600 bg-gray-100 p-2 rounded-full transition-colors">
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Content */}
            <div className="p-6 overflow-y-auto flex-1 space-y-6">
              {/* Ảnh thường */}
              {detailModalTarget.data.images && detailModalTarget.data.images.length > 0 && (
                <div>
                  <h4 className="text-sm font-semibold text-gray-700 mb-3">Hình ảnh</h4>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    {detailModalTarget.data.images.map((img: string, i: number) => (
                      <img key={i} src={img} alt="Preview" className="w-full aspect-video object-cover rounded-lg border shadow-sm" />
                    ))}
                  </div>
                </div>
              )}

              {/* 360 Viewer */}
              {detailModalTarget.type === 'room' && detailModalTarget.data.panoramaImages && detailModalTarget.data.panoramaImages.length > 0 && (
                <div>
                  <h4 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
                    <span className="bg-cyan-100 text-cyan-700 px-2 py-0.5 rounded-full text-xs font-bold">360°</span> Virtual Tour
                  </h4>
                  <Suspense fallback={<div className="h-64 bg-slate-100 animate-pulse rounded-xl" />}>
                    <Room360Viewer images={detailModalTarget.data.panoramaImages} height="350px" />
                  </Suspense>
                </div>
              )}

              {/* Thông tin */}
              <div className="bg-gray-50 p-4 rounded-xl border grid grid-cols-1 md:grid-cols-2 gap-4">
                {detailModalTarget.type === 'property' ? (
                  <>
                    <div>
                      <p className="text-xs text-gray-500">Địa chỉ</p>
                      <p className="font-medium text-sm">{detailModalTarget.data.address}, {detailModalTarget.data.district}, {detailModalTarget.data.city}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500">Chi phí dịch vụ (Điện/Nước/Internet)</p>
                      <p className="font-medium text-sm">{detailModalTarget.data.elecPrice?.toLocaleString() || 0}đ / {detailModalTarget.data.waterPrice?.toLocaleString() || 0}đ / {detailModalTarget.data.internetPrice?.toLocaleString() || 0}đ</p>
                    </div>
                  </>
                ) : (
                  <>
                    <div>
                      <p className="text-xs text-gray-500">Giá thuê & Diện tích</p>
                      <p className="font-medium text-sm text-primary">{detailModalTarget.data.price?.toLocaleString()}đ <span className="text-gray-500 font-normal">/ {detailModalTarget.data.area}m²</span></p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500">Loại phòng</p>
                      <p className="font-medium text-sm">{detailModalTarget.data.type || 'N/A'}</p>
                    </div>
                    {detailModalTarget.data.amenities && detailModalTarget.data.amenities.length > 0 && (
                      <div className="col-span-1 md:col-span-2">
                        <p className="text-xs text-gray-500 mb-1">Tiện ích</p>
                        <div className="flex flex-wrap gap-2">
                          {detailModalTarget.data.amenities.map((a: string, i: number) => (
                            <span key={i} className="bg-white border text-xs px-2 py-1 rounded">{a}</span>
                          ))}
                        </div>
                      </div>
                    )}
                  </>
                )}
              </div>

              {/* Mô tả */}
              <div>
                <h4 className="text-sm font-semibold text-gray-700 mb-2">Mô tả</h4>
                <div className="text-sm text-gray-600 bg-white border p-4 rounded-xl whitespace-pre-line leading-relaxed">
                  {detailModalTarget.data.description || <span className="italic text-gray-400">Không có mô tả</span>}
                </div>
              </div>

              {/* AI Score */}
              <div>
                <h4 className="text-sm font-semibold text-gray-700 mb-2">Kết quả kiểm duyệt AI</h4>
                <AiScoreBadge score={detailModalTarget.data.safetyScore} reason={detailModalTarget.data.moderationReason} />
              </div>
            </div>

            {/* Footer Actions */}
            <div className="p-4 border-t bg-gray-50 shrink-0 flex items-center justify-between gap-4">
              <div className="text-xs text-gray-500 italic">
                Xem kỹ thông tin và kết quả AI trước khi duyệt.
              </div>
              <div className="flex items-center gap-3">
                <Button 
                  variant="outline" 
                  className="border-red-200 text-red-600 hover:bg-red-50 min-w-[120px]"
                  disabled={submitting === detailModalTarget.data.id}
                  onClick={() => {
                    openRejectDialog(detailModalTarget.type, detailModalTarget.data.id, detailModalTarget.data.name);
                    setDetailModalTarget(null);
                  }}
                >
                  <XCircle className="h-4 w-4 mr-2" /> Từ chối
                </Button>
                <Button 
                  className="bg-green-600 hover:bg-green-700 text-white min-w-[120px]"
                  disabled={submitting === detailModalTarget.data.id}
                  onClick={async () => {
                    if (detailModalTarget.type === 'property') {
                      await handleApproveProperty(detailModalTarget.data.id);
                    } else {
                      await handleApproveRoom(detailModalTarget.data.id);
                    }
                    setDetailModalTarget(null);
                  }}
                >
                  {submitting === detailModalTarget.data.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <><CheckCircle className="h-4 w-4 mr-2" /> Duyệt tin</>}
                </Button>
              </div>
            </div>
          </div>
        </div>
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

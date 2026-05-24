import { useEffect, useState, lazy, Suspense } from 'react';
import { propertyApi } from '@/api/propertyApi';
import { Card } from '@/components/ui/Card';
import { PageHeader } from '@/components/ui/PageHeader';
import { EmptyState } from '@/components/ui/EmptyState';
import { Skeleton } from '@/components/ui/Skeleton';
import { SegmentedControl, type SegmentItem } from '@/components/ui/SegmentedControl';
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

    // Auto-refresh every 3 seconds for real-time updates
    const intervalId = setInterval(() => {
      fetchData(true);
    }, 3000);

    return () => clearInterval(intervalId);
  }, [activeTab]);

  const fetchData = async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      if (activeTab === 'properties') {
        const res = await propertyApi.getPendingProperties();
        setPendingProperties((res as any).data || res);
      } else {
        const res = await propertyApi.getPendingRooms();
        setPendingRooms((res as any).data || res);
      }
    } catch (error) {
      if (!silent) toast.error('Không thể tải danh sách chờ duyệt');
    } finally {
      if (!silent) setLoading(false);
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

    // Parse reason string into structured parts
    const parseReason = (raw: string) => {
      const lines = raw.split('\n').map(l => l.trim()).filter(Boolean);
      const scoreParts: string[] = [];
      const ruleNotes: string[] = [];
      let aiNote = '';

      // Dictionary to fix legacy non-diacritic strings already stored in the DB
      const fixLegacyString = (text: string) => {
        const dictionary: Record<string, string> = {
          'Mot so anh co do phan giai qua thap.': 'Một số ảnh có độ phân giải quá thấp.',
          'Mot so anh qua toi/sang hoac co dau hieu mo.': 'Một số ảnh quá tối/sáng hoặc có dấu hiệu mờ.',
          'NEEDS_REVIEW: Khong co anh de phan loai scene.': '⚠️ Không có ảnh để phân loại cảnh.',
          'NEEDS_REVIEW: Khong du du lieu phan loai anh phong tro.': '⚠️ Không đủ dữ liệu phân loại ảnh phòng trọ.',
          'NEEDS_REVIEW: Scene classifier phat hien nhan DOCUMENT/OTHER.': '⚠️ Phát hiện ảnh tài liệu/không liên quan đến phòng trọ.',
          'NEEDS_REVIEW: Scene classifier: anh co ty le phong tro thap, can Admin xem lai.': '⚠️ Ảnh có tỷ lệ phòng trọ thấp, cần Admin xem lại.',
          'NEEDS_REVIEW: Scene classifier: phat hien nhieu anh DOCUMENT/OTHER, can Admin review.': '⚠️ Phát hiện nhiều ảnh tài liệu/không phải phòng, cần Admin xem lại.',
          'Scene classifier: da so anh co ngu canh phong tro/noi that.': 'Đa số ảnh có ngữ cảnh phòng trọ/nội thất. ✓',
          'Khong co anh phong hop le.': 'Không có ảnh phòng hợp lệ.',
          'So luong anh phong qua it de xac thuc.': 'Số lượng ảnh phòng quá ít để xác thực.',
          'Gia thue bat thuong so voi mat bang thi truong.': 'Giá thuê bất thường so với mặt bằng thị trường.',
          'Dien tich bat thuong cho phong tro.': 'Diện tích bất thường cho phòng trọ.',
          'So nguoi toi da khong hop ly.': 'Số người tối đa không hợp lý.',
          'Gia/m2 bat thuong.': 'Giá/m² bất thường.',
          'Mat do nguoi o qua cao so voi dien tich.': 'Mật độ người ở quá cao so với diện tích.',
          'RISK_CAP: Tỷ lệ ảnh phòng quá thấp (<25%).': '🚫 Tỷ lệ ảnh phòng quá thấp (dưới 25%).',
          'RISK_CAP: Đa số ảnh không hợp lệ/đáng ngờ (>=75%).': '🚫 Đa số ảnh không hợp lệ hoặc đáng ngờ.',
          'RISK_CAP: Tỷ lệ ảnh không hợp lệ/đáng ngờ cao (>=50%).': '🚫 Tỷ lệ ảnh không hợp lệ/đáng ngờ cao.',
          'RISK_CAP: Tỷ lệ ảnh phòng thấp (<40%).': '🚫 Tỷ lệ ảnh phòng thấp (dưới 40%).',
          'RISK_CAP: Dữ liệu giá/diện tích/sức chứa vô lý.': '🚫 Dữ liệu giá/diện tích/sức chứa vô lý.',
        };
        return dictionary[text] || text;
      };

      for (const line of lines) {
        if (line.startsWith('[RULE]')) {
          const content = line.replace('[RULE]', '').trim();
          const parts = content.split(' - ');
          scoreParts.push(parts[0]); // e.g. "SafetyScore=55/100, RiskLevel=HIGH_RISK"
          
          const notesMatch = line.match(/Rule notes:\s*(.+)$/);
          if (notesMatch) {
            notesMatch[1].split(' | ').forEach(note => {
              const trimmed = note.trim();
              if (trimmed) ruleNotes.push(fixLegacyString(trimmed));
            });
          }
        } else if (line.startsWith('- contentScore') || line.startsWith('- imageScore') || line.startsWith('- completenessScore') || line.startsWith('- policyScore')) {
          scoreParts.push(line.replace('- ', '').trim());
        } else if (line.startsWith('- Rule notes:')) {
          line.replace('- Rule notes:', '').split(' | ').forEach(note => {
            const trimmed = note.trim();
            if (trimmed) ruleNotes.push(fixLegacyString(trimmed));
          });
        } else if (line.startsWith('[AI NOTE]')) {
          aiNote = line.replace('[AI NOTE] ', '').trim();
        }
      }

      const scoreBreakdown = scoreParts.join(', ');
      return { scoreBreakdown, ruleNotes, aiNote };
    };

    const parsed = reason ? parseReason(reason) : null;

    return (
      <div className={`mt-4 rounded-lg border p-3 ${
        s < 50 ? 'border-red-200 bg-red-50/90' : 'border-border/60 bg-muted/30'
      }`}>
        <div className="mb-1 flex items-center justify-between">
          <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Kiểm duyệt AI</span>
          <span className={`text-sm font-bold tabular-nums ${
            s >= 80 ? 'text-emerald-600' : s >= 50 ? 'text-amber-600' : 'text-red-600'
          }`}>
            {s}/100
          </span>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {s >= 80 ? (
            <div className="flex items-center gap-1">
              <ShieldCheck className="h-3 w-3 text-emerald-700" />
              <StatusBadge label="Độ an toàn cao" tone="success" className="text-[11px]" />
            </div>
          ) : s >= 50 ? (
            <div className="flex items-center gap-1">
              <AlertTriangle className="h-3 w-3 text-amber-700" />
              <StatusBadge label="Cần xem kỹ nội dung" tone="warning" className="text-[11px]" />
            </div>
          ) : (
            <div className="flex items-center gap-1">
              <ShieldAlert className="h-3 w-3 text-red-700" />
              <StatusBadge label="Nguy cơ vi phạm cao" tone="danger" className="text-[11px]" />
            </div>
          )}
          <span className="text-[10px] font-normal italic text-muted-foreground">
            Phân tích tự động từ AI
          </span>
        </div>
        {parsed && (
          <div className="mt-2 space-y-2">
            {/* Score breakdown */}
            {parsed.scoreBreakdown && (
              <div className="flex flex-wrap gap-x-3 gap-y-1 text-[11px] text-muted-foreground font-mono">
                {parsed.scoreBreakdown.split(',').map((part, i) => {
                  const trimmed = part.trim();
                  const match = trimmed.match(/(\w+)=(\d+)\/(\d+)/);
                  if (!match) return <span key={i}>{trimmed}</span>;
                  const [, label, val, max] = match;
                  const ratio = parseInt(val) / parseInt(max);
                  const labelMap: Record<string, string> = {
                    'SafetyScore': '🏆 Tổng',
                    'contentScore': '📝 Nội dung',
                    'imageScore': '🖼️ Hình ảnh',
                    'completenessScore': '📋 Đầy đủ',
                    'policyScore': '📜 Chính sách',
                  };
                  return (
                    <span key={i} className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium ${
                      ratio >= 0.8 ? 'bg-emerald-50 text-emerald-700' : 
                      ratio >= 0.5 ? 'bg-amber-50 text-amber-700' : 
                      'bg-red-50 text-red-700'
                    }`}>
                      {labelMap[label] || label}: {val}/{max}
                    </span>
                  );
                })}
              </div>
            )}
            {/* Rule notes as list */}
            {parsed.ruleNotes.length > 0 && (
              <div className="rounded border border-border/60 bg-card p-2">
                <p className="text-[11px] font-semibold text-foreground mb-1">Chi tiết đánh giá:</p>
                <ul className="space-y-0.5">
                  {parsed.ruleNotes.map((note, i) => (
                    <li key={i} className={`text-[11px] leading-relaxed flex items-start gap-1.5 ${
                      note.startsWith('⚠️') ? 'text-amber-700 font-medium' : 
                      note.startsWith('🚫') ? 'text-red-700 font-medium' : 
                      note.includes('✓') ? 'text-emerald-700' :
                      'text-foreground/80'
                    }`}>
                      {!note.startsWith('⚠️') && !note.startsWith('🚫') && !note.includes('✓') && (
                        <span className="shrink-0 mt-0.5">•</span>
                      )}
                      <span>{note}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
            {/* AI Note */}
            {parsed.aiNote && (
              <p className="text-[10px] italic text-muted-foreground">
                💡 {parsed.aiNote}
              </p>
            )}
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

  if (loading) {
    return (
      <div className="space-y-6 pb-10">
        <div className="space-y-2">
          <Skeleton className="h-9 w-64 rounded-lg" />
          <Skeleton className="h-4 w-full max-w-xl rounded-md" />
        </div>
        <div className="flex flex-wrap gap-3">
          <Skeleton className="h-11 w-full rounded-xl sm:w-80" />
          <Skeleton className="h-11 w-40 rounded-lg" />
        </div>
        <div className="grid gap-4">
          <Skeleton className="h-48 rounded-2xl" />
          <Skeleton className="h-48 rounded-2xl" />
        </div>
      </div>
    );
  }

  const approvalTabs: SegmentItem[] = [
    {
      id: 'properties',
      label: (
        <span className="flex items-center gap-2">
          <Building className="h-4 w-4 shrink-0" />
          Khu trọ
        </span>
      ),
      badge:
        pendingProperties.length > 0 ? (
          <span className="rounded-md bg-amber-500/15 px-1.5 py-0.5 text-[10px] font-bold text-amber-950">{pendingProperties.length}</span>
        ) : undefined,
    },
    {
      id: 'rooms',
      label: (
        <span className="flex items-center gap-2">
          <DoorOpen className="h-4 w-4 shrink-0" />
          Phòng trọ
        </span>
      ),
      badge:
        pendingRooms.length > 0 ? (
          <span className="rounded-md bg-amber-500/15 px-1.5 py-0.5 text-[10px] font-bold text-amber-950">{pendingRooms.length}</span>
        ) : undefined,
    },
  ];

  return (
    <div className="min-w-0 space-y-6 overflow-x-hidden pb-10">
      <PageHeader
        title="Duyệt tin đăng"
        description="Kiểm tra khu trọ và phòng mới hoặc vừa cập nhật — ưu tiên bản ghi AI score thấp khi cần."
      />

      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <SegmentedControl
          aria-label="Loại tin cần duyệt"
          items={approvalTabs}
          value={activeTab}
          onChange={(id) => setActiveTab(id as TabType)}
        />
        <div className="relative flex w-full min-w-0 items-center gap-2 sm:w-72">
          <ArrowUpDown className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as SortType)}
            className="select-native w-full pl-9"
            aria-label="Sắp xếp danh sách"
          >
            <option value="newest">Mới nhất</option>
            <option value="score_asc">AI score: thấp → cao (ưu tiên)</option>
            <option value="score_desc">AI score: cao → thấp</option>
          </select>
        </div>
      </div>

      {/* TAB CONTENT: KHU TRỌ */}
      {activeTab === 'properties' && (
        <>
          {pendingProperties.length === 0 ? (
            <EmptyState
              icon={CheckCircle}
              title="Không có khu trọ chờ duyệt"
              description="Hàng đợi kiểm duyệt đang trống — bạn có thể quay lại sau khi có tin mới."
            />
          ) : (
            <div className="grid grid-cols-1 gap-6">
              {sortItems(pendingProperties).map((p) => (
                <Card key={p.id} className={`flex flex-col gap-6 overflow-hidden p-6 shadow-soft transition-shadow hover:shadow-card md:flex-row ${
                  (p.safetyScore || 0) < 50 ? 'border-2 border-destructive/40 bg-destructive/[0.04]' : 'border-border/80'
                }`}>
                  <div className="h-40 w-full shrink-0 overflow-hidden rounded-lg bg-muted md:w-64">
                    {p.images && p.images.length > 0 ? (
                      <img src={p.images[0]} alt={p.name} className="w-full h-full object-cover" />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center text-muted-foreground">
                        <Building className="h-12 w-12" />
                      </div>
                    )}
                  </div>

                  <div className="flex-1">
                    <div className="flex justify-between items-start">
                      <div>
                        <h2 className="text-xl font-bold tracking-tight text-foreground">{p.name}</h2>
                        <p className="mt-1 flex items-center text-sm text-muted-foreground">
                          <MapPin className="mr-1 h-4 w-4 shrink-0" /> {p.address}, {p.district}, {p.city}
                        </p>
                        <p className="mt-2 line-clamp-2 text-sm text-foreground/85">{p.description}</p>
                        <div className="mt-4 flex flex-wrap gap-3 text-xs font-medium text-muted-foreground">
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
            <EmptyState
              icon={CheckCircle}
              title="Không có phòng chờ duyệt"
              description="Mọi phòng đã qua kiểm duyệt hoặc chưa có tin mới."
            />
          ) : (
            <div className="grid grid-cols-1 gap-6">
              {sortItems(pendingRooms).map((r) => (
                <Card key={r.id} className={`flex flex-col gap-6 overflow-hidden p-6 shadow-soft transition-shadow hover:shadow-card md:flex-row ${
                  (r.safetyScore || 0) < 50 ? 'border-2 border-destructive/40 bg-destructive/[0.04]' : 'border-border/80'
                }`}>
                  <div className="h-40 w-full shrink-0 overflow-hidden rounded-lg bg-muted md:w-64">
                    {r.images && r.images.length > 0 ? (
                      <img src={r.images[0]} alt={r.name} className="w-full h-full object-cover" />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center text-muted-foreground">
                        <Home className="h-12 w-12" />
                      </div>
                    )}
                  </div>

                  <div className="flex-1">
                    <div className="flex justify-between items-start">
                      <div>
                        <h2 className="text-xl font-bold tracking-tight text-foreground">Phòng {r.name}</h2>
                        <p className="mt-1 text-sm text-muted-foreground">
                          Khu trọ: <span className="font-medium text-foreground">{r.propertyName || 'N/A'}</span>
                        </p>
                        {r.propertyAddress && (
                          <p className="mt-0.5 flex items-center text-xs text-muted-foreground">
                            <MapPin className="mr-1 h-3 w-3 shrink-0" /> {r.propertyAddress}
                          </p>
                        )}
                        <div className="mt-3 flex flex-wrap gap-3 text-sm">
                          <span className="font-bold text-primary">{r.price?.toLocaleString()}đ/tháng</span>
                          <span className="text-muted-foreground">{r.area}m²</span>
                          <span className="text-muted-foreground">{r.type || 'STUDIO'}</span>
                        </div>
                        {r.amenities && r.amenities.length > 0 && (
                          <p className="mt-2 line-clamp-1 text-xs text-muted-foreground">
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
        <div className="fixed inset-0 z-[50] flex items-center justify-center bg-black/50 backdrop-blur-md p-4 md:p-8 animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl w-full max-w-4xl max-h-[90vh] flex flex-col shadow-2xl animate-in zoom-in-95">
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b shrink-0 bg-muted/40/50">
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
              <div className="bg-muted/40 p-4 rounded-xl border grid grid-cols-1 md:grid-cols-2 gap-4">
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
            <div className="p-4 border-t bg-muted/40 shrink-0 flex items-center justify-between gap-4">
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
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 backdrop-blur-md p-4 animate-in fade-in duration-200">
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

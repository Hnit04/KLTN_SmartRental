import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { reportApi, type RoomReportResponse } from '@/api/reportApi';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { PageHeader } from '@/components/ui/PageHeader';
import { SegmentedControl, type SegmentItem } from '@/components/ui/SegmentedControl';
import { EmptyState } from '@/components/ui/EmptyState';
import { Skeleton } from '@/components/ui/Skeleton';
import { toast } from 'sonner';
import {
  Loader2, Flag, CheckCircle, ShieldAlert, ShieldCheck, X, Eye,
  Clock, AlertTriangle, User, Home, MessageSquare, ImageIcon, ExternalLink
} from 'lucide-react';

import { Client as StompClient } from '@stomp/stompjs';

type FilterType = 'all' | 'PENDING' | 'RESOLVED_CLEAN' | 'RESOLVED_VIOLATING';

export default function AdminReportPage() {
  const [reports, setReports] = useState<RoomReportResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<FilterType>('PENDING');
  const [submitting, setSubmitting] = useState<number | null>(null);

  // Detail modal
  const [selectedReport, setSelectedReport] = useState<RoomReportResponse | null>(null);
  const [adminNotes, setAdminNotes] = useState('');

  // 1. Fetch initial reports
  useEffect(() => {
    fetchReports();
  }, []);

  // 2. Realtime WebSocket subscription cho báo cáo
  useEffect(() => {
    let stompClient: StompClient | null = null;
    const token = localStorage.getItem('token');
    
    if (token) {
      stompClient = new StompClient({
        brokerURL: `${import.meta.env.VITE_API_BASE_URL?.replace('/api', '').replace('http', 'ws')}/ws`,
        connectHeaders: { Authorization: `Bearer ${token}` },
        reconnectDelay: 5000,
        onConnect: () => {
          console.log('✅ [AdminReportPage] Connected to WebSocket');
          stompClient?.subscribe('/topic/admin/reports', (frame) => {
            try {
              const updatedReport: RoomReportResponse = JSON.parse(frame.body);
              // Cập nhật danh sách báo cáo (thêm mới hoặc cập nhật trạng thái cũ)
              setReports((prev) => {
                const exists = prev.find(r => r.id === updatedReport.id);
                if (exists) {
                  return prev.map(r => r.id === updatedReport.id ? updatedReport : r);
                } else {
                  toast.info(`Có báo cáo vi phạm mới: Phòng ${updatedReport.roomName}`);
                  return [updatedReport, ...prev];
                }
              });
            } catch (e) {
              console.error('Lỗi parse realtime report:', e);
            }
          });
        },
      });
      stompClient.activate();
    }

    return () => {
      stompClient?.deactivate();
    };
  }, []);

  const fetchReports = async () => {
    setLoading(true);
    try {
      const res = await reportApi.getAdminReports();
      setReports((res as any).data || res);
    } catch {
      toast.error('Không thể tải danh sách báo cáo');
    } finally {
      setLoading(false);
    }
  };

  const filteredReports = filter === 'all'
    ? reports
    : reports.filter(r => r.status === filter);

  const handleResolve = async (id: number, status: 'RESOLVED_CLEAN' | 'RESOLVED_VIOLATING') => {
    setSubmitting(id);
    try {
      await reportApi.resolveReport(id, { status, adminNotes: adminNotes || undefined });
      toast.success(
        status === 'RESOLVED_CLEAN'
          ? 'Đã xác nhận báo cáo sai sự thật. Người báo cáo bị trừ 15 điểm uy tín.'
          : 'Đã xử phạt phòng vi phạm. Chủ trọ bị trừ 30 điểm uy tín, phòng đã bị ẩn.'
      );
      setSelectedReport(null);
      setAdminNotes('');
      fetchReports();
    } catch {
      // axiosClient interceptor đã toast.error
    } finally {
      setSubmitting(null);
    }
  };

  const statusBadge = (status: string) => {
    switch (status) {
      case 'PENDING':
        return <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-yellow-100 text-yellow-700"><Clock className="h-3 w-3" /> Chờ xử lý</span>;
      case 'RESOLVED_CLEAN':
        return <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-green-100 text-green-700"><ShieldCheck className="h-3 w-3" /> Phòng sạch</span>;
      case 'RESOLVED_VIOLATING':
        return <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-red-100 text-red-700"><ShieldAlert className="h-3 w-3" /> Vi phạm</span>;
      default:
        return null;
    }
  };

  const pendingCount = reports.filter(r => r.status === 'PENDING').length;

  const reportFilterItems: SegmentItem[] = [
    {
      id: 'PENDING',
      label: 'Chờ xử lý',
      badge:
        pendingCount > 0 ? (
          <span className="rounded-full bg-destructive px-1.5 py-0.5 text-[10px] font-bold text-destructive-foreground tabular-nums">
            {pendingCount}
          </span>
        ) : undefined,
    },
    { id: 'RESOLVED_VIOLATING', label: 'Vi phạm' },
    { id: 'RESOLVED_CLEAN', label: 'Phòng sạch' },
    { id: 'all', label: 'Tất cả' },
  ];

  if (loading) {
    return (
      <div className="mx-auto max-w-[1100px] space-y-6 pb-10">
        <div className="space-y-2">
          <Skeleton className="h-9 w-64 rounded-lg" />
          <Skeleton className="h-4 w-full max-w-xl rounded-md" />
        </div>
        <Skeleton className="h-12 w-full max-w-2xl rounded-xl" />
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-36 w-full rounded-2xl" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto min-w-0 max-w-[1100px] space-y-6 pb-10">
      <PageHeader
        title="Quản lý báo cáo"
        description={`Ưu tiên xử lý báo cáo chờ duyệt. Hiện có ${pendingCount} báo cáo cần hành động.`}
      />

      <SegmentedControl
        aria-label="Lọc trạng thái báo cáo"
        items={reportFilterItems}
        value={filter}
        onChange={(id) => setFilter(id as FilterType)}
      />

      {filteredReports.length === 0 ? (
        <EmptyState
          icon={filter === 'PENDING' ? Clock : CheckCircle}
          title={filter === 'PENDING' ? 'Không có báo cáo chờ xử lý' : 'Không có báo cáo trong bộ lọc này'}
          description="Đổi tab hoặc chờ báo cáo mới qua WebSocket."
        />
      ) : (
        <div className="grid grid-cols-1 gap-4">
          {filteredReports.map(report => (
            <Card key={report.id} className={`flex flex-col gap-4 border-border/80 p-5 shadow-soft transition-all duration-200 hover:border-primary/20 hover:shadow-card md:flex-row md:items-start ${
              report.status === 'PENDING' ? 'border-l-4 border-l-amber-500' : ''
            }`}>
              {/* Main Info */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-3 mb-2">
                  {statusBadge(report.status)}
                  <span className="text-xs text-gray-400">
                    #{report.id} · {new Date(report.createdAt).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
                <h3 className="font-bold text-gray-900 text-lg mb-1">
                  <Home className="h-4 w-4 inline mr-1.5 text-primary" />
                  Phòng {report.roomName}
                  {report.propertyName && <span className="text-gray-500 font-normal text-sm ml-2">({report.propertyName})</span>}
                  <Link
                    to={`/rooms/${report.roomId}`}
                    target="_blank"
                    className="inline-flex items-center gap-1 ml-3 px-2 py-0.5 text-xs font-semibold text-primary bg-primary/10 hover:bg-primary/20 rounded-md transition"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <ExternalLink className="h-3 w-3" /> Xem phòng
                  </Link>
                </h3>
                <p className="text-sm text-gray-600 mb-2">
                  <User className="h-3.5 w-3.5 inline mr-1 text-gray-400" />
                  Người báo cáo: <strong>{report.reporterName}</strong>
                </p>
                <p className="text-sm">
                  <span className="font-semibold text-gray-700">Lý do:</span>{' '}
                  <span className="text-red-600 font-medium">{report.reason}</span>
                </p>
                {report.details && (
                  <p className="text-sm text-gray-500 mt-1 line-clamp-2">
                    <MessageSquare className="h-3.5 w-3.5 inline mr-1 text-gray-400" />
                    {report.details}
                  </p>
                )}
                {report.evidenceUrls && report.evidenceUrls.length > 0 && (
                  <p className="text-xs text-blue-600 mt-2 font-medium">
                    <ImageIcon className="h-3.5 w-3.5 inline mr-1" />
                    {report.evidenceUrls.length} ảnh bằng chứng đính kèm
                  </p>
                )}
                {report.adminNotes && (
                  <div className="mt-2 bg-blue-50 border border-blue-200 rounded-lg p-2 text-xs text-blue-800">
                    <strong>Ghi chú Admin:</strong> {report.adminNotes}
                  </div>
                )}
              </div>

              {/* Actions */}
              <div className="flex flex-col gap-2 shrink-0">
                <Button
                  variant="outline"
                  size="sm"
                  className="text-blue-600 bg-blue-50/50 hover:bg-blue-100 min-w-[130px]"
                  onClick={() => { setSelectedReport(report); setAdminNotes(''); }}
                >
                  <Eye className="h-4 w-4 mr-2" /> Xem chi tiết
                </Button>
                {report.status === 'PENDING' && (
                  <>
                    <Button
                      size="sm"
                      className="bg-red-600 hover:bg-red-700 text-white min-w-[130px]"
                      disabled={submitting === report.id}
                      onClick={() => handleResolve(report.id, 'RESOLVED_VIOLATING')}
                    >
                      {submitting === report.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <><ShieldAlert className="h-4 w-4 mr-2" /> Xử phạt</>}
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="border-yellow-300 text-yellow-700 hover:bg-yellow-50 min-w-[130px]"
                      disabled={submitting === report.id}
                      onClick={() => handleResolve(report.id, 'RESOLVED_CLEAN')}
                    >
                      {submitting === report.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <><AlertTriangle className="h-4 w-4 mr-2" /> Báo cáo sai</>}
                    </Button>
                  </>
                )}
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Detail Modal */}
      {selectedReport && (
        <div className="fixed inset-0 z-[50] flex items-center justify-center bg-black/50 backdrop-blur-md p-4 md:p-8 animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl w-full max-w-2xl max-h-[90vh] flex flex-col shadow-2xl animate-in zoom-in-95">
            {/* Modal Header */}
            <div className="flex items-center justify-between p-5 border-b shrink-0 bg-red-50/50">
              <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                <Flag className="h-5 w-5 text-red-500" />
                Chi tiết Báo cáo #{selectedReport.id}
              </h3>
              <button onClick={() => setSelectedReport(null)} className="text-gray-400 hover:text-gray-600 bg-gray-100 p-2 rounded-full transition-colors">
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Modal Content */}
            <div className="p-6 overflow-y-auto flex-1 space-y-5">
              {/* Status */}
              <div className="flex items-center gap-3">
                {statusBadge(selectedReport.status)}
                <span className="text-sm text-gray-500">
                  {new Date(selectedReport.createdAt).toLocaleString('vi-VN')}
                </span>
              </div>

              {/* Room & Reporter Info */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-muted/40 p-4 rounded-xl border">
                <div>
                  <p className="text-xs text-gray-500 mb-1">Phòng bị báo cáo</p>
                  <p className="font-bold text-gray-900">Phòng {selectedReport.roomName}</p>
                  {selectedReport.propertyName && (
                    <p className="text-sm text-gray-500">Khu trọ: {selectedReport.propertyName}</p>
                  )}
                  <Link
                    to={`/rooms/${selectedReport.roomId}`}
                    target="_blank"
                    className="inline-flex items-center gap-1.5 mt-2 px-3 py-1.5 text-xs font-semibold text-white bg-primary hover:bg-primary/90 rounded-lg transition shadow-sm"
                  >
                    <ExternalLink className="h-3.5 w-3.5" /> Mở trang phòng để xác minh
                  </Link>
                </div>
                <div>
                  <p className="text-xs text-gray-500 mb-1">Người báo cáo</p>
                  <p className="font-bold text-gray-900">{selectedReport.reporterName}</p>
                  <p className="text-sm text-gray-500">ID: {selectedReport.reporterId}</p>
                </div>
              </div>

              {/* Reason */}
              <div>
                <p className="text-sm font-semibold text-gray-700 mb-1">Lý do báo cáo</p>
                <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-800 font-medium">
                  {selectedReport.reason}
                </div>
              </div>

              {/* Details */}
              {selectedReport.details && (
                <div>
                  <p className="text-sm font-semibold text-gray-700 mb-1">Mô tả chi tiết</p>
                  <div className="bg-white border rounded-lg p-3 text-sm text-gray-700 whitespace-pre-line">
                    {selectedReport.details}
                  </div>
                </div>
              )}

              {/* Evidence Images */}
              {selectedReport.evidenceUrls && selectedReport.evidenceUrls.length > 0 && (
                <div>
                  <p className="text-sm font-semibold text-gray-700 mb-2">Hình ảnh bằng chứng ({selectedReport.evidenceUrls.length} ảnh)</p>
                  <div className="grid grid-cols-3 gap-3">
                    {selectedReport.evidenceUrls.map((url, idx) => (
                      <a key={idx} href={url} target="_blank" rel="noopener noreferrer" className="block">
                        <img src={url} alt={`evidence-${idx}`} className="w-full aspect-video object-cover rounded-lg border shadow-sm hover:opacity-80 transition cursor-pointer" />
                      </a>
                    ))}
                  </div>
                </div>
              )}

              {/* Admin Notes Input (only for PENDING) */}
              {selectedReport.status === 'PENDING' && (
                <div>
                  <p className="text-sm font-semibold text-gray-700 mb-1">Ghi chú của Admin (Tùy chọn)</p>
                  <textarea
                    value={adminNotes}
                    onChange={(e) => setAdminNotes(e.target.value)}
                    placeholder="Nhập ghi chú của bạn về báo cáo này..."
                    className="w-full border border-gray-300 rounded-lg p-3 text-sm focus:ring-2 focus:ring-red-300 outline-none resize-none"
                    rows={3}
                  />
                </div>
              )}

              {/* Admin Notes Display (for resolved) */}
              {selectedReport.status !== 'PENDING' && selectedReport.adminNotes && (
                <div>
                  <p className="text-sm font-semibold text-gray-700 mb-1">Ghi chú Admin</p>
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-sm text-blue-800">
                    {selectedReport.adminNotes}
                  </div>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            {selectedReport.status === 'PENDING' && (
              <div className="p-5 border-t bg-muted/40 shrink-0 flex items-center justify-between gap-4">
                <div className="text-xs text-gray-500 italic max-w-[200px]">
                  Xem kỹ bằng chứng trước khi quyết định.
                </div>
                <div className="flex items-center gap-3">
                  <Button
                    variant="outline"
                    className="border-yellow-300 text-yellow-700 hover:bg-yellow-50 min-w-[140px]"
                    disabled={submitting === selectedReport.id}
                    onClick={() => handleResolve(selectedReport.id, 'RESOLVED_CLEAN')}
                  >
                    {submitting === selectedReport.id ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <AlertTriangle className="h-4 w-4 mr-2" />}
                    Báo cáo sai
                  </Button>
                  <Button
                    className="bg-red-600 hover:bg-red-700 text-white min-w-[140px]"
                    disabled={submitting === selectedReport.id}
                    onClick={() => handleResolve(selectedReport.id, 'RESOLVED_VIOLATING')}
                  >
                    {submitting === selectedReport.id ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <ShieldAlert className="h-4 w-4 mr-2" />}
                    Xử phạt phòng
                  </Button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

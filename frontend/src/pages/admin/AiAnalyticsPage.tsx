import React, { useEffect, useState, useMemo } from 'react';
import { aiApi } from '@/api/aiApi';
import { toast } from 'sonner';
import {
  Brain, Search, RefreshCw, Trash2, Loader2,
  CheckCircle2, XCircle, MessageSquareText, Code2,
  TrendingUp, Shield, Copy, ChevronDown, ChevronUp,
  Home, DollarSign, FileText, MapPin, HelpCircle, ReceiptText, Edit3, Save, X,
  Activity, ShieldBan, Clock3, BarChart3, PlayCircle
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { PageHeader } from '@/components/ui/PageHeader';
import { StatKpiCard } from '@/components/dashboard';
import { SegmentedControl, type SegmentItem } from '@/components/ui/SegmentedControl';
import { EmptyState } from '@/components/ui/EmptyState';
import { Skeleton } from '@/components/ui/Skeleton';
import { DashboardPanel } from '@/components/dashboard';
import StatusBadge from '@/components/shared/StatusBadge';
import ConfirmActionDialog from '@/components/shared/ConfirmActionDialog';
import AiDebuggerPanel from '@/components/admin/AiDebuggerPanel';

interface CacheEntry {
  id: number;
  question: string;
  generatedSql: string;
  isValid: boolean;
  type?: string;   // "SQL" | "FAQ"
  answer?: string;  // FAQ answer (when type=FAQ)
}

interface Analytics {
  totalQueries: number;
  validQueries: number;
  invalidQueries: number;
  categories: Record<string, number>;
  entries: CacheEntry[];
  securityFlags?: Array<{ id: number; question: string; sql: string; issues: string[] }>;
  flaggedCount?: number;
}

interface ObservabilityData {
  sourceDistribution: Record<string, number>;
  blockedQueries: Array<{ query: string; role: string; sql: string; createdAt: string }>;
  avgLatencyBySource: Record<string, number>;
  recentLogs: Array<{
    id: number; query: string; role: string; intent: string;
    confidence: number; source: string; latencyMs: number;
    success: boolean; rowCount: number; cacheScore: number;
    locationSource: string; createdAt: string;
    sql?: string;
  }>;
  totalLogs: number;
}

const CATEGORY_ICONS: Record<string, any> = {
  'Phòng trọ': Home,
  'Giá cả': DollarSign,
  'Hợp đồng': FileText,
  'Hoá đơn/Doanh thu': ReceiptText,
  'Địa điểm': MapPin,
  'Khác': HelpCircle,
};

const CATEGORY_COLORS: Record<string, string> = {
  'Phòng trọ': 'bg-blue-500',
  'Giá cả': 'bg-emerald-500',
  'Hợp đồng': 'bg-violet-500',
  'Hoá đơn/Doanh thu': 'bg-amber-500',
  'Địa điểm': 'bg-rose-500',
  'Khác': 'bg-gray-400',
};

// --- SQL SYNTAX HIGHLIGHTER UTILITY ---
const highlightSql = (sql: string) => {
  if (!sql) return '';
  const keywords = ['SELECT', 'FROM', 'WHERE', 'JOIN', 'AND', 'OR', 'ON', 'GROUP BY', 'ORDER BY', 'ASC', 'DESC', 'LIMIT', 'LIKE', 'AS', 'IN', 'IS', 'NOT', 'NULL', 'INNER', 'LEFT', 'RIGHT', 'COUNT', 'SUM', 'AVG', 'MAX', 'MIN'];
  
  // Create a regex that matches keywords but only as whole words
  const regex = new RegExp(`\\b(${keywords.join('|')})\\b`, 'gi');
  
  // Split the string by the regex
  const parts = sql.split(regex);
  
  return parts.map((part, i) => {
    if (keywords.includes(part.toUpperCase())) {
      return <span key={i} className="text-pink-500 font-bold">{part}</span>;
    }
    // Also color strings in quotes
    if (part.startsWith("'") && part.endsWith("'")) {
      return <span key={i} className="text-amber-400">{part}</span>;
    }
    return part;
  });
};

export default function AiAnalyticsPage() {
  const [data, setData] = useState<Analytics | null>(null);
  const [loading, setLoading] = useState(true);
  
  // Tabs & Debugger State
  const [mainTab, setMainTab] = useState<'analytics' | 'debugger'>('analytics');
  const [debugQ, setDebugQ] = useState('');
  const [debugR, setDebugR] = useState('GUEST');
  const [debugTrigger, setDebugTrigger] = useState(false);

  const handleDebugQuery = (question: string, role: string) => {
    setDebugQ(question);
    setDebugR(role || 'GUEST');
    setDebugTrigger(true);
    setMainTab('debugger');
  };
  
  // Filters & Search
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState<'all' | 'valid' | 'invalid'>('all');
  
  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 10;
  
  // UI States
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [expandedLogId, setExpandedLogId] = useState<number | null>(null);
  const [clearing, setClearing] = useState(false);

  // Edit State (Human in the loop)
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editSql, setEditSql] = useState('');
  const [savingId, setSavingId] = useState<number | null>(null);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [isClearConfirmOpen, setIsClearConfirmOpen] = useState(false);
  const [deleteTargetId, setDeleteTargetId] = useState<number | null>(null);
  const [obsData, setObsData] = useState<ObservabilityData | null>(null);

  // Validate & Test
  const [validating, setValidating] = useState(false);
  const [validateResult, setValidateResult] = useState<any>(null);
  const [testingId, setTestingId] = useState<number | null>(null);
  const [testResult, setTestResult] = useState<Record<number, any>>({});

  useEffect(() => { fetchData(); fetchObservability(); }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const res = await aiApi.getAnalytics();
      const d = (res as any).data || res;
      // Sort entries by ID descending (newest first)
      if (d.entries) {
        d.entries.sort((a: CacheEntry, b: CacheEntry) => b.id - a.id);
      }
      setData(d);
      setEditingId(null);
    } catch {
      toast.error('Không thể tải dữ liệu thống kê AI');
    } finally {
      setLoading(false);
    }
  };

  const fetchObservability = async () => {
    try {
      const res = await aiApi.getObservability();
      const d = (res as any).data || res;
      setObsData(d);
    } catch {
      // optional, silently fail
    }
  };

  const handleClearCache = async () => {
    setIsClearConfirmOpen(true);
  };

  const executeClearCache = async () => {
    setIsClearConfirmOpen(false);
    setClearing(true);
    try {
      await aiApi.clearCache();
      toast.success('Đã xoá bộ nhớ đệm AI thành công!');
      fetchData();
    } catch {
      toast.error('Lỗi khi xoá cache');
    } finally {
      setClearing(false);
    }
  };

  const handleUpdateSql = async (id: number) => {
    if (!editSql.trim()) {
      toast.error('SQL không được để trống');
      return;
    }
    try {
      setSavingId(id);
      await aiApi.updateCache(id, editSql);
      toast.success('Đã nắn lại SQL cho AI học thành công!');
      fetchData(); // Reload to get updated stats and valid status
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Lỗi khi cập nhật SQL');
    } finally {
      setSavingId(null);
    }
  };

  const handleDeleteEntry = async (id: number) => {
    setDeleteTargetId(id);
  };

  const executeDeleteEntry = async () => {
    if (!deleteTargetId) return;
    const id = deleteTargetId;
    setDeleteTargetId(null);
    try {
      setDeletingId(id);
      await aiApi.deleteCache(id);
      toast.success('Đã xoá câu hỏi thành công!');
      fetchData();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Lỗi khi xoá câu hỏi');
    } finally {
      setDeletingId(null);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success('Đã copy!');
  };

  // 1. FILTER ENTRIES
  const filteredEntries = useMemo(() => {
    if (!data) return [];
    let result = data.entries;
    
    // Status filter
    if (filterStatus === 'valid') result = result.filter(e => e.isValid);
    if (filterStatus === 'invalid') result = result.filter(e => !e.isValid);
    
    // Search filter
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      result = result.filter(e =>
        e.question.toLowerCase().includes(q) ||
        (e.generatedSql || '').toLowerCase().includes(q)
      );
    }
    return result;
  }, [data, searchQuery, filterStatus]);

  // 2. PAGINATE ENTRIES
  const totalPages = Math.ceil(filteredEntries.length / pageSize) || 1;
  // Ensure current page is valid after filtering
  useEffect(() => {
    if (currentPage > totalPages) setCurrentPage(totalPages);
  }, [totalPages, currentPage]);
  
  const paginatedEntries = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredEntries.slice(start, start + pageSize);
  }, [filteredEntries, currentPage]);

  const maxCategory = useMemo(() => {
    if (!data) return 1;
    return Math.max(...Object.values(data.categories), 1);
  }, [data]);

  const aiFilterItems: SegmentItem[] = [
    { id: 'all', label: 'Tất cả' },
    { id: 'valid', label: 'Đúng' },
    { id: 'invalid', label: 'Sai / cần sửa' },
  ];

  const mainTabs: SegmentItem[] = [
    { id: 'analytics', label: 'Thống kê & Quan sát' },
    { id: 'debugger', label: 'Pipeline Debugger' },
  ];

  if (loading && !data) {
    return (
      <div className="mx-auto max-w-[1400px] space-y-6 pb-10">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div className="space-y-2">
            <Skeleton className="h-9 w-80 rounded-lg" />
            <Skeleton className="h-4 w-full max-w-lg rounded-md" />
          </div>
          <Skeleton className="h-10 w-40 rounded-lg" />
        </div>
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-24 rounded-2xl" />
          ))}
        </div>
        <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
          <Skeleton className="h-64 rounded-2xl" />
          <Skeleton className="h-64 rounded-2xl" />
        </div>
        <Skeleton className="h-96 w-full rounded-2xl" />
      </div>
    );
  }

  if (!data) {
    return (
      <div className="mx-auto max-w-[1400px] pb-10">
        <EmptyState icon={Brain} title="Không có dữ liệu AI" description="Thử làm mới trang hoặc kiểm tra kết nối API." />
      </div>
    );
  }

  const cacheHitRate = data.totalQueries > 0 ? Math.round((data.validQueries / data.totalQueries) * 100) : 0;

  return (
    <div className="mx-auto min-w-0 max-w-[1400px] space-y-6 overflow-x-hidden pb-10">
      <PageHeader
        title="AI analytics & NLP"
        description="Theo dõi cache tri thức, chất lượng SQL và human-in-the-loop — ưu tiên mục invalid để giảm rủi ro truy vấn."
        actions={
          <div className="flex w-full flex-wrap gap-2 sm:w-auto sm:justify-end">
            <Button
              variant="outline"
              onClick={handleClearCache}
              disabled={clearing}
              className="min-h-11 min-w-0 flex-1 gap-2 border-destructive/30 text-destructive hover:bg-destructive/5 sm:flex-none"
            >
              {clearing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
              Xoá toàn bộ cache
            </Button>
            <Button variant="outline" onClick={fetchData} className="min-h-11 min-w-0 flex-1 gap-2 sm:flex-none">
              <RefreshCw className="h-4 w-4" /> Làm mới
            </Button>
          </div>
        }
      />

      <div className="mb-4">
        <SegmentedControl items={mainTabs} value={mainTab} onChange={(val) => setMainTab(val as any)} />
      </div>

      {mainTab === 'debugger' ? (
        <AiDebuggerPanel 
          initialQuestion={debugQ} 
          initialRole={debugR} 
          autoRun={debugTrigger} 
        />
      ) : (
        <>
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatKpiCard
          icon={<Activity className="h-5 w-5" />}
          iconClassName="text-blue-600"
          label="Tổng truy vấn thực tế"
          value={obsData?.totalLogs ?? '—'}
          description="Số lần AI được hỏi gần đây"
        />
        <StatKpiCard
          icon={<MessageSquareText className="h-5 w-5" />}
          iconClassName="text-violet-600"
          label="Kho tri thức (SQL Cache)"
          value={data.totalQueries}
          description={`${data.validQueries} đúng / ${data.invalidQueries} cần sửa`}
        />
        <StatKpiCard
          icon={<Shield className="h-5 w-5" />}
          iconClassName="text-destructive"
          label="Bị chặn bảo mật"
          value={obsData ? (obsData.sourceDistribution?.['SECURITY_BLOCKED'] ?? 0) : '—'}
          description="Truy vấn vi phạm quyền hạn"
        />
        <StatKpiCard
          icon={<TrendingUp className="h-5 w-5" />}
          iconClassName="text-emerald-600"
          label="Cache hit rate"
          value={obsData ? (() => {
            const dist = obsData.sourceDistribution || {};
            const cacheHits = (dist['DQE_HIT'] || 0) + (dist['SQL_CACHE_HIT'] || 0) + (dist['RESULT_CACHE_HIT'] || 0) + (dist['FAQ_HIT'] || 0);
            const total = Object.values(dist).reduce((a: number, b: any) => a + (Number(b) || 0), 0);
            return total > 0 ? Math.round((cacheHits / total) * 100) + '%' : '—';
          })() : `${cacheHitRate}%`}
          description="% truy vấn không cần gọi LLM"
        />
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <DashboardPanel title="Phân loại theo chủ đề" description="Tần suất câu hỏi theo nhóm nghiệp vụ — dùng để cân bằng dữ liệu huấn luyện.">
          <div className="space-y-3 p-4 sm:p-5">
            {Object.entries(data.categories).map(([name, count]) => {
              const Icon = CATEGORY_ICONS[name] || HelpCircle;
              const barColor = CATEGORY_COLORS[name] || 'bg-muted-foreground/40';
              const pct = maxCategory > 0 ? (count / maxCategory) * 100 : 0;
              return (
                <div key={name} className="flex items-center gap-3">
                  <div className="flex w-36 shrink-0 items-center gap-1.5 truncate text-sm text-muted-foreground" title={name}>
                    <Icon className="h-4 w-4 shrink-0 text-muted-foreground" />
                    {name}
                  </div>
                  <div className="h-3 flex-1 overflow-hidden rounded-full bg-muted">
                    <div className={`h-full rounded-full transition-all duration-700 ${barColor}`} style={{ width: `${Math.max(pct, count > 0 ? 2 : 0)}%` }} />
                  </div>
                  <span className="w-8 shrink-0 text-right text-sm font-semibold tabular-nums text-foreground">{count}</span>
                </div>
              );
            })}
          </div>
        </DashboardPanel>

        <DashboardPanel title="Kiến trúc pipeline" description="Tham chiếu nhanh mô hình và ngưỡng an toàn — không thay đổi cấu hình tại đây.">
          <div className="space-y-2 p-4 sm:p-5">
            <div className="flex items-center justify-between rounded-lg border border-border/60 bg-muted/30 px-3 py-2">
              <span className="text-sm font-medium text-foreground">Large language model</span>
              <span className="text-xs font-semibold text-muted-foreground sm:text-sm">Gemini 2.5 Flash</span>
            </div>
            <div className="flex items-center justify-between rounded-lg border border-border/60 bg-muted/30 px-3 py-2">
              <span className="text-sm font-medium text-foreground">Embedding</span>
              <span className="text-xs font-semibold text-muted-foreground sm:text-sm">all-MiniLM-L6-v2</span>
            </div>
            <div className="flex items-center justify-between rounded-lg border border-border/60 bg-emerald-500/10 px-3 py-2">
              <span className="text-sm font-medium text-emerald-900">Semantic threshold</span>
              <span className="text-xs font-semibold text-emerald-800 sm:text-sm">≥ 85% cosine</span>
            </div>
            <div className="flex items-center justify-between rounded-lg border border-destructive/20 bg-destructive/5 px-3 py-2">
              <span className="text-sm font-medium text-destructive">SQL validator</span>
              <span className="text-xs font-semibold text-destructive/90 sm:text-sm">5-layer role gate</span>
            </div>
          </div>
        </DashboardPanel>
      </div>

      {/* ============================================ */}
      {/* === AI PIPELINE OBSERVABILITY === */}
      {/* ============================================ */}
      {obsData && (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <DashboardPanel title="📊 Pipeline Source Distribution" description="Phân bổ nguồn trả lời AI — bao nhiêu % dùng cache, DQE, SQL gen, bị chặn...">
            <div className="space-y-2.5 p-4 sm:p-5">
              {Object.entries(obsData.sourceDistribution)
                .sort(([, a], [, b]) => b - a)
                .map(([source, count]) => {
                  const maxCount = Math.max(...Object.values(obsData.sourceDistribution), 1);
                  const pct = (count / maxCount) * 100;
                  const colorMap: Record<string, string> = {
                    DQE_HIT: 'bg-emerald-500', RESULT_CACHE_HIT: 'bg-sky-500',
                    SQL_CACHE_HIT: 'bg-blue-500', SQL_GENERATED: 'bg-amber-500',
                    SECURITY_BLOCKED: 'bg-red-500', LOCATION_GPS: 'bg-violet-500',
                    LOCATION_LANDMARK: 'bg-purple-400', FAQ_HIT: 'bg-teal-500',
                  };
                  const barColor = colorMap[source] || 'bg-gray-400';
                  return (
                    <div key={source} className="flex items-center gap-3">
                      <div className="flex w-44 shrink-0 items-center gap-1.5 truncate text-xs font-mono text-muted-foreground" title={source}>
                        {source === 'SECURITY_BLOCKED' ? <ShieldBan className="h-3.5 w-3.5 text-red-500 shrink-0" /> : <Activity className="h-3.5 w-3.5 shrink-0" />}
                        {source}
                      </div>
                      <div className="h-2.5 flex-1 overflow-hidden rounded-full bg-muted">
                        <div className={`h-full rounded-full transition-all duration-700 ${barColor}`} style={{ width: `${Math.max(pct, 3)}%` }} />
                      </div>
                      <span className="w-8 shrink-0 text-right text-xs font-bold tabular-nums">{count}</span>
                    </div>
                  );
                })}
              {Object.keys(obsData.sourceDistribution).length === 0 && (
                <p className="text-sm text-muted-foreground italic">Chưa có dữ liệu observability. Hãy thử hỏi AI vài câu.</p>
              )}
            </div>
          </DashboardPanel>

          <DashboardPanel title="⏱ Latency theo Source" description="Thời gian phản hồi trung bình (ms) theo từng pipeline path.">
            <div className="space-y-2.5 p-4 sm:p-5">
              {Object.entries(obsData.avgLatencyBySource)
                .sort(([, a], [, b]) => b - a)
                .map(([source, avgMs]) => (
                  <div key={source} className="flex items-center justify-between rounded-lg border border-border/60 bg-muted/30 px-3 py-2">
                    <span className="text-xs font-mono font-medium text-foreground">{source}</span>
                    <span className={`text-xs font-bold tabular-nums ${avgMs > 2000 ? 'text-red-600' : avgMs > 500 ? 'text-amber-600' : 'text-emerald-600'}`}>
                      {Math.round(avgMs)} ms
                    </span>
                  </div>
                ))}
              {Object.keys(obsData.avgLatencyBySource).length === 0 && (
                <p className="text-sm text-muted-foreground italic">Chưa có dữ liệu latency.</p>
              )}
            </div>
          </DashboardPanel>
        </div>
      )}

      {obsData && (
        <DashboardPanel title="🚨 Security Blocked Queries" description="Các truy vấn bị SecurityGateService chặn — kiểm tra prompt injection hoặc lạm quyền.">
          {obsData.blockedQueries.length > 0 ? (
            <div className="overflow-hidden">
              <table className="w-full text-xs">
                <thead>
                  <tr className="bg-red-50/60">
                    <th className="px-3 py-2 text-left font-semibold text-red-700">Query</th>
                    <th className="px-3 py-2 text-left font-semibold text-red-700">Role</th>
                    <th className="px-3 py-2 text-left font-semibold text-red-700">SQL sinh ra</th>
                    <th className="px-3 py-2 text-left font-semibold text-red-700">Thời gian</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-red-100">
                  {obsData.blockedQueries.slice(0, 10).map((bq, i) => (
                    <tr key={i} className="hover:bg-red-50/40 transition-colors">
                      <td className="px-3 py-2 max-w-[300px] truncate font-medium" title={bq.query}>{bq.query}</td>
                      <td className="px-3 py-2"><code className="rounded bg-red-100 px-1.5 py-0.5 text-[10px] font-mono text-red-700">{bq.role}</code></td>
                      <td className="px-3 py-2 max-w-[250px] truncate font-mono text-[10px] text-muted-foreground" title={bq.sql}>{bq.sql || '—'}</td>
                      <td className="px-3 py-2 whitespace-nowrap text-muted-foreground">{bq.createdAt ? new Date(bq.createdAt).toLocaleString('vi-VN') : '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center gap-2 py-10 text-center">
              <div className="rounded-full bg-emerald-100 p-3">
                <CheckCircle2 className="h-6 w-6 text-emerald-600" />
              </div>
              <p className="text-sm font-semibold text-emerald-700">Không có truy vấn nào bị chặn</p>
              <p className="text-xs text-muted-foreground max-w-md">Tất cả truy vấn AI gần đây đều hợp lệ. Nếu có truy vấn vi phạm quyền hạn (GUEST hỏi hóa đơn, prompt injection...) sẽ hiển thị tại đây.</p>
            </div>
          )}
        </DashboardPanel>
      )}

      {data.securityFlags && data.securityFlags.length > 0 && (
        <DashboardPanel
          title={`⚠️ SQL Cache — Phát hiện ${data.securityFlags.length} mục có vấn đề bảo mật`}
          description="Auto-scan phát hiện SQL trong kho tri thức có lệnh nguy hiểm, cột nhạy cảm hoặc thiếu LIMIT. Nên xóa hoặc sửa."
        >
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="bg-amber-50/60">
                  <th className="px-3 py-2 text-left font-semibold text-amber-800">ID</th>
                  <th className="px-3 py-2 text-left font-semibold text-amber-800">Câu hỏi</th>
                  <th className="px-3 py-2 text-left font-semibold text-amber-800">SQL</th>
                  <th className="px-3 py-2 text-left font-semibold text-amber-800">Vấn đề</th>
                  <th className="px-3 py-2 text-center font-semibold text-amber-800">Xóa</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-amber-100">
                {data.securityFlags.map((flag) => (
                  <tr key={flag.id} className="hover:bg-amber-50/40 transition-colors">
                    <td className="px-3 py-2 font-mono text-muted-foreground">#{flag.id}</td>
                    <td className="px-3 py-2 max-w-[200px] truncate font-medium" title={flag.question}>{flag.question}</td>
                    <td className="px-3 py-2 max-w-[250px] truncate font-mono text-[10px] text-muted-foreground" title={flag.sql}>{flag.sql}</td>
                    <td className="px-3 py-2">
                      {flag.issues.map((issue, i) => (
                        <span key={i} className={`mr-1 mb-0.5 inline-block rounded-full px-2 py-0.5 text-[9px] font-bold ${
                          issue.startsWith('DML') || issue.startsWith('NON_SELECT') ? 'bg-red-100 text-red-700'
                          : issue.startsWith('SENSITIVE') ? 'bg-orange-100 text-orange-700'
                          : 'bg-yellow-100 text-yellow-700'
                        }`}>
                          {issue.split(':')[0]}
                        </span>
                      ))}
                    </td>
                    <td className="px-3 py-2 text-center flex items-center justify-center gap-2">
                      <Button size="sm" variant="outline" className="h-6 px-2 text-violet-600 border-violet-300 hover:bg-violet-50"
                        onClick={() => handleDebugQuery(flag.question, 'GUEST')}>
                        <PlayCircle className="h-3 w-3 mr-1" /> Debug
                      </Button>
                      <Button size="sm" variant="outline" className="h-6 px-2 text-destructive border-destructive/30 hover:bg-destructive/5"
                        onClick={async () => {
                          try { await aiApi.deleteCache(flag.id); toast.success(`Đã xóa #${flag.id}`); fetchData(); }
                          catch { toast.error('Lỗi xóa'); }
                        }}>
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </DashboardPanel>
      )}

      {obsData && obsData.recentLogs && obsData.recentLogs.length > 0 && (
        <DashboardPanel title={`📋 Truy vấn gần đây (${obsData.recentLogs.length} mục mới nhất)`} description="Toàn bộ truy vấn AI gần đây — bao gồm DQE, Cache hit, SQL gen và bị chặn.">
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="bg-muted/50">
                  <th className="px-3 py-2 text-left font-semibold">Câu hỏi</th>
                  <th className="px-3 py-2 text-left font-semibold">Role</th>
                  <th className="px-3 py-2 text-left font-semibold">Intent</th>
                  <th className="px-3 py-2 text-left font-semibold">Nguồn</th>
                  <th className="px-3 py-2 text-right font-semibold">Latency</th>
                  <th className="px-3 py-2 text-left font-semibold">Thời gian</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60">
                {obsData.recentLogs.map((log: any) => {
                  const sourceColor: Record<string, string> = {
                    DQE_HIT: 'bg-emerald-100 text-emerald-700',
                    RESULT_CACHE_HIT: 'bg-sky-100 text-sky-700',
                    SQL_CACHE_HIT: 'bg-blue-100 text-blue-700',
                    SQL_GENERATED: 'bg-amber-100 text-amber-700',
                    SECURITY_BLOCKED: 'bg-red-100 text-red-700',
                    FAQ_HIT: 'bg-teal-100 text-teal-700',
                    LOCATION_GPS: 'bg-violet-100 text-violet-700',
                    LOCATION_LANDMARK: 'bg-purple-100 text-purple-700',
                  };
                  const cls = sourceColor[log.source] || 'bg-gray-100 text-gray-700';
                  const isLogExpanded = expandedLogId === log.id;
                  return (
                    <React.Fragment key={log.id}>
                      <tr className={`hover:bg-muted/30 transition-colors cursor-pointer ${isLogExpanded ? 'bg-muted/20' : ''}`} onClick={() => setExpandedLogId(isLogExpanded ? null : log.id)}>
                        <td className="px-3 py-2 max-w-[280px] truncate font-medium" title={log.query}>{log.query}</td>
                        <td className="px-3 py-2">
                          <code className="rounded bg-muted px-1.5 py-0.5 text-[10px] font-mono">{log.role}</code>
                        </td>
                        <td className="px-3 py-2 text-muted-foreground font-mono text-[10px]">{log.intent || '—'}</td>
                        <td className="px-3 py-2">
                          <span className={`inline-block rounded-full px-2 py-0.5 text-[10px] font-bold ${cls}`}>
                            {log.source || '—'}
                          </span>
                        </td>
                        <td className="px-3 py-2 text-right tabular-nums whitespace-nowrap">
                          <span className={`font-semibold ${(log.latencyMs ?? 0) > 2000 ? 'text-red-600' : (log.latencyMs ?? 0) > 500 ? 'text-amber-600' : 'text-emerald-600'}`}>
                            {log.latencyMs != null ? `${log.latencyMs}ms` : '—'}
                          </span>
                        </td>
                        <td className="px-3 py-2 whitespace-nowrap text-muted-foreground flex items-center justify-between">
                          <span>{log.createdAt ? new Date(log.createdAt).toLocaleString('vi-VN') : '—'}</span>
                          {isLogExpanded ? <ChevronUp className="h-4 w-4 ml-2" /> : <ChevronDown className="h-4 w-4 ml-2" />}
                        </td>
                      </tr>
                      {isLogExpanded && (
                        <tr>
                          <td colSpan={6} className="bg-muted/10 px-4 py-4 border-b border-border/50">
                            <div className="bg-slate-950 rounded-xl p-4 text-xs font-mono text-gray-300 shadow-inner border border-slate-800">
                              <div className="mb-1.5 flex items-center gap-2">
                                <span className="text-emerald-400 font-semibold">// Tách Ý định (Intent):</span>
                                <span className="bg-emerald-900/40 text-emerald-300 px-2 py-0.5 rounded-md border border-emerald-800/50">{log.intent || 'UNKNOWN'}</span>
                                {log.confidence != null && (
                                  <span className="text-emerald-500 text-[10px]">(Độ tin cậy: {log.confidence.toFixed(2)})</span>
                                )}
                              </div>
                              <div className="mb-3 flex items-center gap-2">
                                <span className="text-sky-400 font-semibold">// Nguồn xử lý (Pipeline):</span>
                                <span className="bg-sky-900/40 text-sky-300 px-2 py-0.5 rounded-md border border-sky-800/50">{log.source}</span>
                              </div>
                              
                              <div className="mt-3 pt-3 border-t border-slate-800/80">
                                {log.sql ? (
                                  <>
                                    <div className="text-amber-500 mb-2 font-semibold flex items-center gap-2">
                                      // SQL được sinh ra tự động:
                                      <button onClick={() => copyToClipboard(log.sql || '')} className="text-slate-500 hover:text-white transition-colors" title="Copy SQL">
                                        <Copy className="h-3.5 w-3.5" />
                                      </button>
                                    </div>
                                    <div className="whitespace-pre-wrap leading-relaxed bg-black/40 p-3 rounded-lg border border-slate-800/50 overflow-x-auto">{highlightSql(log.sql)}</div>
                                  </>
                                ) : (
                                  <div className="text-gray-500 italic flex items-center gap-1.5">
                                    <Shield className="h-3.5 w-3.5" />
                                    // Không dùng câu lệnh SQL cho truy vấn này (Trả lời tĩnh hoặc Semantic SQL Hit).
                                  </div>
                                )}
                              </div>

                              <div className="mt-3 flex justify-end">
                                <Button 
                                  size="sm" 
                                  variant="outline" 
                                  className="h-7 px-3 bg-violet-600/10 border-violet-500/30 text-violet-400 hover:bg-violet-600/20 hover:text-violet-300"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleDebugQuery(log.query, log.role);
                                  }}
                                >
                                  <PlayCircle className="h-3.5 w-3.5 mr-1.5" /> Debug câu hỏi này
                                </Button>
                              </div>
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>
        </DashboardPanel>
      )}

      <DashboardPanel
        title={`Kho tri thức AI (${data.entries.length} mục)`}
        description="Mở rộng từng dòng để xem SQL; ưu tiên xử lý các mục invalid."
        action={
          <div className="flex w-full flex-col gap-3 sm:w-auto sm:flex-row sm:items-center">
            <SegmentedControl
              aria-label="Lọc trạng thái cache"
              items={aiFilterItems}
              value={filterStatus}
              onChange={(id) => {
                setFilterStatus(id as 'all' | 'valid' | 'invalid');
                setCurrentPage(1);
              }}
            />
            <div className="relative w-full min-w-0 sm:max-w-xs">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Tìm câu hỏi hoặc SQL…"
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setCurrentPage(1);
                }}
                className="pl-9"
              />
            </div>
            <Button
              size="sm"
              variant="outline"
              className="border-amber-300 text-amber-700 hover:bg-amber-50 font-semibold"
              disabled={validating}
              onClick={async () => {
                setValidating(true);
                setValidateResult(null);
                try {
                  const res = await aiApi.validateAllCache();
                  const d = (res as any).data || res;
                  setValidateResult(d);
                  toast.success(d.message);
                  fetchData();
                } catch {
                  toast.error('Lỗi validate');
                } finally {
                  setValidating(false);
                }
              }}
            >
              {validating ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <Shield className="h-4 w-4 mr-1" />}
              Kiểm tra tất cả SQL
            </Button>
          </div>
        }
      >
        {/* Validate Result Summary */}
        {validateResult && (
          <div className="mb-4 rounded-lg border border-amber-200 bg-amber-50/50 p-4">
            <div className="flex items-center justify-between mb-2">
              <h4 className="text-sm font-bold text-amber-800">📊 Kết quả kiểm tra SQL</h4>
              <button onClick={() => setValidateResult(null)} className="text-amber-400 hover:text-amber-600"><X className="h-4 w-4" /></button>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 text-xs">
              <div className="bg-white rounded-lg p-2 text-center">
                <div className="text-lg font-bold text-emerald-600">{validateResult.sqlOk}</div>
                <div className="text-muted-foreground">SQL OK</div>
              </div>
              <div className="bg-white rounded-lg p-2 text-center">
                <div className="text-lg font-bold text-red-600">{validateResult.sqlError}</div>
                <div className="text-muted-foreground">Lỗi SQL</div>
              </div>
              <div className="bg-white rounded-lg p-2 text-center">
                <div className="text-lg font-bold text-amber-600">{validateResult.sqlEmpty}</div>
                <div className="text-muted-foreground">SQL rỗng</div>
              </div>
              <div className="bg-white rounded-lg p-2 text-center">
                <div className="text-lg font-bold text-teal-600">{validateResult.faqEntries}</div>
                <div className="text-muted-foreground">FAQ</div>
              </div>
              <div className="bg-white rounded-lg p-2 text-center">
                <div className="text-lg font-bold text-indigo-600">{validateResult.totalEntries}</div>
                <div className="text-muted-foreground">Tổng</div>
              </div>
            </div>
            {validateResult.failedEntries?.length > 0 && (
              <details className="mt-3">
                <summary className="text-xs font-semibold text-red-700 cursor-pointer hover:text-red-900">
                  ⚠️ {validateResult.failedEntries.length} mục lỗi — bấm để xem chi tiết
                </summary>
                <div className="mt-2 max-h-[200px] overflow-y-auto space-y-1">
                  {validateResult.failedEntries.map((f: any) => (
                    <div key={f.id} className="flex items-center justify-between bg-red-50 rounded px-3 py-1.5 text-xs">
                      <div className="flex-1 min-w-0">
                        <span className="font-mono text-red-400">#{f.id}</span>
                        <span className="ml-2 font-medium truncate">{f.question}</span>
                        <span className="ml-2 text-red-500 truncate">{f.error?.slice(0, 80)}</span>
                      </div>
                      <Button size="sm" variant="outline" className="ml-2 h-5 px-1.5 text-[10px] border-red-200 text-red-600"
                        onClick={async () => { try { await aiApi.deleteCache(f.id); toast.success(`Đã xóa #${f.id}`); fetchData(); } catch {} }}>
                        Xóa
                      </Button>
                    </div>
                  ))}
                </div>
              </details>
            )}
          </div>
        )}

        <div className="min-h-[320px] divide-y divide-border/60 sm:min-h-[400px]">
          {paginatedEntries.length === 0 ? (
            <EmptyState
              icon={Brain}
              title="Không có mục phù hợp"
              description="Đổi bộ lọc hoặc từ khóa tìm kiếm."
            />
          ) : (
            paginatedEntries.map(entry => {
              const isExpanded = expandedId === entry.id;
              const isEditing = editingId === entry.id;
              
              return (
                <div key={entry.id} className="hover:bg-violet-50/20 transition-colors">
                  {/* Row Header */}
                  <div 
                    className={`px-4 py-3 flex items-start gap-4 cursor-pointer transition-colors ${isExpanded ? 'bg-violet-50/50' : ''}`}
                    onClick={() => {
                        if (!isEditing) setExpandedId(isExpanded ? null : entry.id);
                    }}
                  >
                    <div className="mt-1 shrink-0">
                      {entry.isValid ? (
                        <div className="bg-emerald-100 p-1 rounded-full"><CheckCircle2 className="h-4 w-4 text-emerald-600" /></div>
                      ) : (
                        <div className="bg-red-100 p-1 rounded-full animate-pulse"><XCircle className="h-4 w-4 text-red-600" /></div>
                      )}
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-mono text-xs text-gray-400 font-semibold">#{entry.id}</span>
                        {!entry.isValid && (
                          <StatusBadge label="Cần dạy lại" tone="danger" className="text-[10px] uppercase font-bold" />
                        )}
                        <span className={`rounded-full px-2 py-0.5 text-[9px] font-bold ${entry.type === 'FAQ' ? 'bg-teal-100 text-teal-700' : 'bg-indigo-100 text-indigo-700'}`}>
                          {entry.type === 'FAQ' ? 'FAQ' : 'SQL'}
                        </span>
                      </div>
                      <p className="text-sm font-semibold text-gray-900 leading-snug">
                         "{entry.question}"
                      </p>
                      {!isExpanded && (
                        <p className="text-xs text-gray-400 mt-1.5 truncate font-mono opacity-80">
                          {entry.type === 'FAQ'
                            ? (entry.answer || '(Chưa có câu trả lời)').slice(0, 100) + '...'
                            : (entry.generatedSql || '(Chưa có SQL)').slice(0, 100) + '...'}
                        </p>
                      )}
                    </div>

                    <div className="text-gray-400 shrink-0 self-center">
                      {isExpanded ? <ChevronUp className="h-5 w-5" /> : <ChevronDown className="h-5 w-5" />}
                    </div>
                  </div>

                  {/* Expanded Body */}
                  {isExpanded && (
                    <div className="px-5 pb-5 pt-2 bg-violet-50/20">
                      <div className="bg-slate-900 rounded-xl p-4 relative shadow-inner border border-slate-800">
                        {/* Action Buttons */}
                        <div className="absolute top-3 right-3 flex items-center gap-2">
                          {!isEditing ? (
                            <>
                              <button onClick={() => copyToClipboard(entry.generatedSql || '')} className="text-slate-400 hover:text-white hover:bg-slate-700 p-1.5 rounded-md transition-all active:scale-95" title="Copy SQL">
                                <Copy className="h-4 w-4" />
                              </button>
                              {entry.type !== 'FAQ' && (
                                <button
                                  disabled={testingId === entry.id}
                                  onClick={async (e) => {
                                    e.stopPropagation();
                                    setTestingId(entry.id);
                                    try {
                                      const res = await aiApi.testCache(entry.id);
                                      const d = (res as any).data || res;
                                      setTestResult(prev => ({ ...prev, [entry.id]: d }));
                                    } catch {
                                      setTestResult(prev => ({ ...prev, [entry.id]: { status: 'ERROR', message: 'Lỗi kết nối' } }));
                                    } finally {
                                      setTestingId(null);
                                    }
                                  }}
                                  className="text-cyan-400 hover:text-white hover:bg-cyan-900 p-1.5 rounded-md transition-all active:scale-95 flex items-center gap-1 text-xs font-semibold"
                                  title="Test SQL"
                                >
                                  {testingId === entry.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <PlayCircle className="h-4 w-4" />} Test
                                </button>
                              )}
                              <button onClick={() => { setEditingId(entry.id); setEditSql(entry.generatedSql || ''); }} className="text-emerald-400 hover:text-white hover:bg-emerald-900 p-1.5 rounded-md transition-all active:scale-95 flex items-center gap-1 text-xs font-semibold" title="Sửa SQL">
                                <Edit3 className="h-4 w-4" /> Dạy lại AI
                              </button>
                              <button onClick={() => handleDebugQuery(entry.question, 'GUEST')} className="text-violet-400 hover:text-white hover:bg-violet-900 p-1.5 rounded-md transition-all active:scale-95 flex items-center gap-1 text-xs font-semibold" title="Debug">
                                <PlayCircle className="h-4 w-4" /> Debug
                              </button>
                              <button onClick={() => handleDeleteEntry(entry.id)} disabled={deletingId === entry.id} className="text-red-400 hover:text-white hover:bg-red-900 p-1.5 rounded-md transition-all active:scale-95" title="Xoá">
                                {deletingId === entry.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                              </button>
                            </>
                          ) : (
                            <button onClick={() => setEditingId(null)} className="text-slate-400 hover:text-white hover:bg-slate-700 p-1.5 rounded-md transition-all active:scale-95" title="Hủy">
                              <X className="h-5 w-5" />
                            </button>
                          )}
                        </div>

                        <div className="flex items-center gap-2 mb-3 border-b border-slate-700/50 pb-2 pr-40">
                          <Code2 className="h-4 w-4 text-indigo-400" />
                          <span className="text-xs font-semibold text-indigo-300 tracking-wider uppercase">
                            {isEditing ? 'Sửa Truy vấn SQL' : entry.type === 'FAQ' ? 'FAQ Answer' : 'Generated Query'}
                          </span>
                        </div>
                        
                        {/* Editor OR Highlighting */}
                        {isEditing ? (
                          <div className="space-y-3">
                            <textarea 
                              value={editSql}
                              onChange={e => setEditSql(e.target.value)}
                              className="w-full bg-slate-950 text-slate-200 border border-slate-700 rounded-lg p-3 text-sm font-mono min-h-[120px] focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none resize-y"
                              placeholder="Nhập câu SQL đúng để AI học tập..."
                            />
                            <div className="flex justify-end gap-2">
                              <Button size="sm" variant="outline" className="border-slate-600 text-slate-300 hover:bg-slate-800" onClick={() => setEditingId(null)}>Hủy</Button>
                              <Button size="sm" className="bg-emerald-600 hover:bg-emerald-700 text-white flex items-center gap-2" 
                                onClick={() => handleUpdateSql(entry.id)} disabled={savingId === entry.id}>
                                {savingId === entry.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                                Lưu & Cập nhật AI
                              </Button>
                            </div>
                          </div>
                        ) : (
                          <pre className="text-sm text-slate-300 font-mono whitespace-pre-wrap break-all leading-relaxed">
                            {entry.type === 'FAQ'
                              ? (entry.answer || '(Chưa có câu trả lời FAQ)')
                              : highlightSql(entry.generatedSql)}
                          </pre>
                        )}

                        {/* Test Result */}
                        {testResult[entry.id] && (
                          <div className={`mt-3 rounded-lg p-3 border text-xs ${
                            testResult[entry.id].status === 'OK' ? 'bg-emerald-950/50 border-emerald-700 text-emerald-300' :
                            testResult[entry.id].status === 'ERROR' ? 'bg-red-950/50 border-red-700 text-red-300' :
                            testResult[entry.id].status === 'EMPTY_RESULT' ? 'bg-amber-950/50 border-amber-700 text-amber-300' :
                            'bg-slate-800 border-slate-600 text-slate-300'
                          }`}>
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                <span className={`font-bold uppercase px-2 py-0.5 rounded text-[10px] ${
                                  testResult[entry.id].status === 'OK' ? 'bg-emerald-600 text-white' :
                                  testResult[entry.id].status === 'ERROR' ? 'bg-red-600 text-white' :
                                  'bg-amber-600 text-white'
                                }`}>{testResult[entry.id].status}</span>
                                <span>{testResult[entry.id].message}</span>
                                {testResult[entry.id].rowCount > 0 && <span className="text-slate-400">({testResult[entry.id].rowCount} dòng)</span>}
                              </div>
                              <button onClick={() => setTestResult(prev => { const n = { ...prev }; delete n[entry.id]; return n; })} className="text-slate-500 hover:text-white">
                                <X className="h-3 w-3" />
                              </button>
                            </div>
                            {testResult[entry.id].sampleData?.length > 0 && (
                              <div className="mt-2 overflow-x-auto">
                                <table className="w-full text-left text-[10px]">
                                  <thead><tr className="border-b border-slate-600">
                                    {Object.keys(testResult[entry.id].sampleData[0]).map((k: string) => (
                                      <th key={k} className="px-2 py-1 font-bold text-slate-400 uppercase">{k}</th>
                                    ))}
                                  </tr></thead>
                                  <tbody>
                                    {testResult[entry.id].sampleData.map((row: any, i: number) => (
                                      <tr key={i} className="border-b border-slate-700/50">
                                        {Object.values(row).map((v: any, j: number) => (
                                          <td key={j} className="px-2 py-1 truncate max-w-[120px]">{String(v ?? '')}</td>
                                        ))}
                                      </tr>
                                    ))}
                                  </tbody>
                                </table>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>

        {totalPages > 1 && (() => {
          // Tính page numbers để hiển thị (smart: 1 ... 4 5 [6] 7 8 ... 20)
          const pages: (number | '...')[] = [];
          const delta = 2; // Hiện 2 trang mỗi bên trang hiện tại
          const left = Math.max(2, currentPage - delta);
          const right = Math.min(totalPages - 1, currentPage + delta);

          pages.push(1);
          if (left > 2) pages.push('...');
          for (let i = left; i <= right; i++) pages.push(i);
          if (right < totalPages - 1) pages.push('...');
          if (totalPages > 1) pages.push(totalPages);

          return (
            <div className="flex flex-col gap-3 border-t border-border/60 bg-muted/25 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-sm text-muted-foreground">
                Hiển thị{' '}
                <span className="font-semibold tabular-nums text-foreground">{(currentPage - 1) * pageSize + 1}–{Math.min(currentPage * pageSize, filteredEntries.length)}</span> trên{' '}
                <span className="font-semibold tabular-nums text-foreground">{filteredEntries.length}</span> mục
              </p>
              <div className="flex flex-wrap items-center gap-1">
                <Button size="sm" variant="outline" disabled={currentPage === 1} onClick={() => setCurrentPage(1)} className="px-2">
                  «
                </Button>
                <Button size="sm" variant="outline" disabled={currentPage === 1} onClick={() => setCurrentPage((p) => p - 1)} className="px-2">
                  ‹
                </Button>
                {pages.map((page, i) =>
                  page === '...' ? (
                    <span key={`dots-${i}`} className="px-1.5 text-xs text-muted-foreground select-none">…</span>
                  ) : (
                    <Button
                      key={page}
                      size="sm"
                      variant={currentPage === page ? "default" : "outline"}
                      onClick={() => setCurrentPage(page)}
                      className={`min-w-[2rem] px-2 tabular-nums ${currentPage === page ? 'pointer-events-none' : ''}`}
                    >
                      {page}
                    </Button>
                  )
                )}
                <Button size="sm" variant="outline" disabled={currentPage >= totalPages} onClick={() => setCurrentPage((p) => p + 1)} className="px-2">
                  ›
                </Button>
                <Button size="sm" variant="outline" disabled={currentPage >= totalPages} onClick={() => setCurrentPage(totalPages)} className="px-2">
                  »
                </Button>
              </div>
            </div>
          );
        })()}
      </DashboardPanel>
        </>
      )}

      <ConfirmActionDialog
        open={isClearConfirmOpen}
        onOpenChange={setIsClearConfirmOpen}
        title="Xoá toàn bộ cache AI?"
        description="Hệ thống sẽ mất toàn bộ tri thức AI đã học từ các truy vấn trước đó."
        confirmLabel="Xoá cache"
        tone="danger"
        onConfirm={executeClearCache}
        isLoading={clearing}
      />

      <ConfirmActionDialog
        open={deleteTargetId !== null}
        onOpenChange={(open) => {
          if (!open) setDeleteTargetId(null);
        }}
        title="Xoá câu hỏi khỏi bộ nhớ AI?"
        description={deleteTargetId ? `Bạn sắp xoá mục #${deleteTargetId}. Thao tác này không thể hoàn tác.` : "Thao tác này không thể hoàn tác."}
        confirmLabel="Xoá mục"
        tone="danger"
        onConfirm={executeDeleteEntry}
        isLoading={deletingId !== null}
      />
    </div>
  );
}


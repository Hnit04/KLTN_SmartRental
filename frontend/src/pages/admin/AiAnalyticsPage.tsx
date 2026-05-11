import { useEffect, useState, useMemo } from 'react';
import { aiApi } from '@/api/aiApi';
import { toast } from 'sonner';
import {
  Brain, Search, RefreshCw, Trash2, Loader2,
  CheckCircle2, XCircle, MessageSquareText, Code2,
  TrendingUp, Zap, Shield, Copy, ChevronDown, ChevronUp,
  Home, DollarSign, FileText, MapPin, HelpCircle, ReceiptText, Edit3, Save, X
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

interface CacheEntry {
  id: number;
  question: string;
  generatedSql: string;
  isValid: boolean;
}

interface Analytics {
  totalQueries: number;
  validQueries: number;
  invalidQueries: number;
  categories: Record<string, number>;
  entries: CacheEntry[];
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
  
  // Filters & Search
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState<'all' | 'valid' | 'invalid'>('all');
  
  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 10;
  
  // UI States
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [clearing, setClearing] = useState(false);

  // Edit State (Human in the loop)
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editSql, setEditSql] = useState('');
  const [savingId, setSavingId] = useState<number | null>(null);
  const [deletingId, setDeletingId] = useState<number | null>(null);

  useEffect(() => { fetchData(); }, []);

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

  const handleClearCache = async () => {
    if (!confirm('Bạn có chắc muốn xoá toàn bộ bộ nhớ đệm AI? Hệ thống sẽ mất hết tri thức đã học.')) return;
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
    if (!confirm(`Xoá câu hỏi #${id} khỏi bộ nhớ AI?`)) return;
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
        e.generatedSql.toLowerCase().includes(q)
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

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatKpiCard
          icon={<MessageSquareText className="h-5 w-5" />}
          iconClassName="text-violet-600"
          label="Tổng câu hỏi đã học"
          value={data.totalQueries}
          description="Số mục trong kho tri thức"
        />
        <StatKpiCard
          icon={<Zap className="h-5 w-5" />}
          iconClassName="text-emerald-600"
          label="Trả lời đúng (valid)"
          value={data.validQueries}
          description={`${cacheHitRate}% so với tổng truy vấn`}
        />
        <StatKpiCard
          icon={<Shield className="h-5 w-5" />}
          iconClassName="text-destructive"
          label="Cần chú ý (invalid)"
          value={data.invalidQueries}
          description="SQL không hợp lệ hoặc chưa an toàn"
        />
        <StatKpiCard
          icon={<TrendingUp className="h-5 w-5" />}
          iconClassName="text-primary"
          label="Semantic hit (ước lượng)"
          value={`${cacheHitRate}%`}
          description="Giảm gọi LLM khi khớp embedding"
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
          </div>
        }
      >
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
                      </div>
                      <p className="text-sm font-semibold text-gray-900 leading-snug">
                         "{entry.question}"
                      </p>
                      {!isExpanded && (
                        <p className="text-xs text-gray-400 mt-1.5 truncate font-mono opacity-80">
                          {entry.generatedSql.slice(0, 100)}...
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
                              <button onClick={() => copyToClipboard(entry.generatedSql)} className="text-slate-400 hover:text-white hover:bg-slate-700 p-1.5 rounded-md transition-all active:scale-95" title="Copy SQL">
                                <Copy className="h-4 w-4" />
                              </button>
                              <button onClick={() => { setEditingId(entry.id); setEditSql(entry.generatedSql); }} className="text-emerald-400 hover:text-white hover:bg-emerald-900 p-1.5 rounded-md transition-all active:scale-95 flex items-center gap-1 text-xs font-semibold" title="Sửa SQL">
                                <Edit3 className="h-4 w-4" /> Dạy lại AI
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
                            {isEditing ? 'Sửa Truy vấn SQL' : 'Generated Query'}
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
                            {highlightSql(entry.generatedSql)}
                          </pre>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>

        {totalPages > 1 && (
          <div className="flex flex-col gap-3 border-t border-border/60 bg-muted/25 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm text-muted-foreground">
              Hiển thị{' '}
              <span className="font-semibold tabular-nums text-foreground">{paginatedEntries.length}</span> trên{' '}
              <span className="font-semibold tabular-nums text-foreground">{filteredEntries.length}</span> mục
            </p>
            <div className="flex flex-wrap gap-1">
              <Button size="sm" variant="outline" disabled={currentPage === 1} onClick={() => setCurrentPage((p) => p - 1)}>
                Trang trước
              </Button>
              <div className="flex min-w-[3rem] items-center justify-center px-3 text-sm font-semibold tabular-nums text-foreground">
                {currentPage} / {totalPages}
              </div>
              <Button size="sm" variant="outline" disabled={currentPage >= totalPages} onClick={() => setCurrentPage((p) => p + 1)}>
                Trang sau
              </Button>
            </div>
          </div>
        )}
      </DashboardPanel>
    </div>
  );
}

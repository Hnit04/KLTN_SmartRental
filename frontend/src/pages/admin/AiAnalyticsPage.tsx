import { useEffect, useState, useMemo } from 'react';
import { aiApi } from '@/api/aiApi';
import { toast } from 'sonner';
import {
  Brain, Sparkles, Search, RefreshCw, Trash2, Loader2,
  CheckCircle2, XCircle, Database, MessageSquareText, Code2,
  BarChart3, TrendingUp, Zap, Shield, Copy, ChevronDown, ChevronUp,
  Home, DollarSign, FileText, MapPin, HelpCircle, ReceiptText, Edit3, Save, X
} from 'lucide-react';
import { Button } from '@/components/ui/Button';

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

  if (loading && !data) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <Loader2 className="h-10 w-10 animate-spin text-violet-500 mx-auto mb-3" />
          <p className="text-gray-500 font-medium">Đang tải dữ liệu AI Analytics...</p>
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <p className="text-gray-500">Không có dữ liệu</p>
      </div>
    );
  }

  const cacheHitRate = data.totalQueries > 0 ? Math.round((data.validQueries / data.totalQueries) * 100) : 0;

  return (
    <div className="space-y-6 max-w-[1400px] mx-auto px-4 sm:px-6 pb-10">
      {/* === HEADER === */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Brain className="h-7 w-7 text-violet-600" />
            AI Analytics & NLP Monitoring
          </h1>
          <p className="text-sm text-gray-500 mt-1">Thống kê hệ thống ngôn ngữ tự nhiên (NLP) — Human-in-the-loop</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={handleClearCache} disabled={clearing} className="gap-2 border-red-200 text-red-600 hover:bg-red-50">
            {clearing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
            Xoá toàn bộ Cache
          </Button>
          <Button variant="outline" onClick={fetchData} className="gap-2">
            <RefreshCw className="h-4 w-4" /> Làm mới
          </Button>
        </div>
      </div>

      {/* === METRICS === */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard icon={<MessageSquareText className="h-5 w-5" />} label="Tổng câu hỏi đã học" value={data.totalQueries} color="violet" />
        <MetricCard icon={<Zap className="h-5 w-5" />} label="Trả lời đúng (Valid)" value={data.validQueries} color="emerald" sub={`${cacheHitRate}% chính xác`} />
        <MetricCard icon={<Shield className="h-5 w-5" />} label="Cần chú ý (Invalid)" value={data.invalidQueries} color="red" sub="AI sinh sai lệnh SQL" />
        <MetricCard icon={<TrendingUp className="h-5 w-5" />} label="Tỉ lệ Semantic Hit" value={`${cacheHitRate}%`} color="blue" sub="Đỡ tốn Token LLM" />
      </div>

      {/* === CATEGORIES CHART + QUICK STATS === */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="bg-white rounded-xl border shadow-sm p-5">
          <h3 className="font-bold text-gray-900 flex items-center gap-2 mb-4">
            <BarChart3 className="h-5 w-5 text-violet-600" />
            Phân loại câu hỏi theo chủ đề chính
          </h3>
          <div className="space-y-3">
            {Object.entries(data.categories).map(([name, count]) => {
              const Icon = CATEGORY_ICONS[name] || HelpCircle;
              const barColor = CATEGORY_COLORS[name] || 'bg-gray-400';
              const pct = maxCategory > 0 ? (count / maxCategory) * 100 : 0;
              return (
                <div key={name} className="flex items-center gap-3">
                  <div className="w-36 flex items-center gap-1.5 text-sm text-gray-600 shrink-0 truncate" title={name}>
                    <Icon className="h-4 w-4 text-gray-500 shrink-0" />
                    {name}
                  </div>
                  <div className="flex-1 bg-gray-100 rounded-full h-3 overflow-hidden">
                    <div className={`h-full rounded-full transition-all duration-700 ${barColor}`} style={{ width: `${Math.max(pct, count > 0 ? 2 : 0)}%` }} />
                  </div>
                  <span className="text-sm font-bold text-gray-700 w-8 text-right shrink-0">{count}</span>
                </div>
              );
            })}
          </div>
        </div>

        <div className="bg-white rounded-xl border shadow-sm p-5 flex flex-col justify-between">
          <h3 className="font-bold text-gray-900 flex items-center gap-2 mb-4">
            <Sparkles className="h-5 w-5 text-violet-600" />
            Kiến trúc AI Pipeline & System Specs
          </h3>
          <div className="space-y-3">
            <div className="flex items-center justify-between px-3 py-2 bg-violet-50 rounded-lg">
              <span className="text-sm font-medium text-violet-800">Large Language Model</span>
              <span className="text-sm font-bold text-violet-900">Google Gemini 2.0 Flash</span>
            </div>
            <div className="flex items-center justify-between px-3 py-2 bg-blue-50 rounded-lg">
              <span className="text-sm font-medium text-blue-800">Embedding Model</span>
              <span className="text-sm font-bold text-blue-900">all-MiniLM-L6-v2</span>
            </div>
            <div className="flex items-center justify-between px-3 py-2 bg-emerald-50 rounded-lg">
              <span className="text-sm font-medium text-emerald-800">Semantic Threshold</span>
              <span className="text-sm font-bold text-emerald-900">≥ 85% Cosine Similarity</span>
            </div>
            <div className="flex items-center justify-between px-3 py-2 bg-red-50 rounded-lg">
              <span className="text-sm font-medium text-red-800">SQL Validator</span>
              <span className="text-sm font-bold text-red-900">5-layer Role Security Gate</span>
            </div>
          </div>
        </div>
      </div>

      {/* === QUERY TABLE === */}
      <div className="bg-white rounded-xl border shadow-sm flex flex-col">
        {/* Table Toolbar */}
        <div className="p-4 border-b flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
            <h3 className="font-bold text-gray-900 flex items-center gap-2 whitespace-nowrap">
              <Database className="h-5 w-5 text-violet-600" />
              Kho tri thức AI ({data.entries.length} câu)
            </h3>
            
            {/* STATUS FILTERS */}
            <div className="flex bg-gray-100 p-1 rounded-lg">
              <button 
                onClick={() => { setFilterStatus('all'); setCurrentPage(1); }}
                className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-all ${filterStatus === 'all' ? 'bg-white shadow-sm text-gray-900' : 'text-gray-500 hover:text-gray-700'}`}
              >
                Tất cả
              </button>
              <button 
                onClick={() => { setFilterStatus('valid'); setCurrentPage(1); }}
                className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-md transition-all ${filterStatus === 'valid' ? 'bg-emerald-50 text-emerald-700 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
              >
                <CheckCircle2 className="h-3.5 w-3.5" /> Đúng
              </button>
              <button 
                onClick={() => { setFilterStatus('invalid'); setCurrentPage(1); }}
                className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-md transition-all ${filterStatus === 'invalid' ? 'bg-red-50 text-red-700 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
              >
                <XCircle className="h-3.5 w-3.5" /> Sai (Cần sửa)
              </button>
            </div>
          </div>

          <div className="relative w-full lg:w-72">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input type="text" placeholder="Tìm câu hỏi, lệnh SQL..." value={searchQuery} onChange={e => { setSearchQuery(e.target.value); setCurrentPage(1); }} className="w-full pl-9 pr-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-violet-300 outline-none transition-shadow" />
          </div>
        </div>

        {/* Table Content */}
        <div className="divide-y min-h-[400px]">
          {paginatedEntries.length === 0 ? (
            <div className="text-center py-20 text-gray-400">
              <Brain className="h-12 w-12 mx-auto mb-3 opacity-30" />
              <p className="font-medium">Không tìm thấy dữ liệu phù hợp</p>
            </div>
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
                          <span className="px-2 py-0.5 rounded text-[10px] uppercase font-bold bg-red-100 text-red-700 border border-red-200">
                            Cần dạy lại
                          </span>
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

        {/* PAGINATION */}
        {totalPages > 1 && (
          <div className="p-4 border-t bg-gray-50 flex items-center justify-between">
            <p className="text-sm text-gray-500">
              Hiển thị <span className="font-semibold text-gray-900">{paginatedEntries.length}</span> trên <span className="font-semibold text-gray-900">{filteredEntries.length}</span> mục
            </p>
            <div className="flex gap-1">
              <Button size="sm" variant="outline" disabled={currentPage === 1} onClick={() => setCurrentPage(p => p - 1)}>
                Trang trước
              </Button>
              <div className="flex items-center justify-center px-4 font-semibold text-sm text-gray-700 min-w-[3rem]">
                {currentPage} / {totalPages}
              </div>
              <Button size="sm" variant="outline" disabled={currentPage >= totalPages} onClick={() => setCurrentPage(p => p + 1)}>
                Trang sau
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// --- Metric Card Component ---
function MetricCard({ icon, label, value, color, sub }: {
  icon: React.ReactNode; label: string; value: string | number; color: string; sub?: string;
}) {
  const iconBg: Record<string, string> = {
    violet: 'bg-violet-100 text-violet-600',
    emerald: 'bg-emerald-100 text-emerald-600',
    red: 'bg-red-100 text-red-600 border border-red-200',
    blue: 'bg-blue-100 text-blue-600',
  };

  return (
    <div className="bg-white rounded-xl border shadow-sm p-4 flex items-center gap-4 hover:shadow-md transition-shadow">
      <div className={`p-2.5 rounded-lg ${iconBg[color] || 'bg-gray-100 text-gray-600'}`}>{icon}</div>
      <div className="flex-1 min-w-0">
        <p className="text-xs text-gray-500 font-medium truncate">{label}</p>
        <p className={`text-xl sm:text-2xl font-bold truncate ${color === 'red' && typeof value === 'number' && value > 0 ? 'text-red-600' : 'text-gray-900'}`}>
          {value}
        </p>
        {sub && <p className="text-[11px] text-gray-400 mt-0.5 truncate">{sub}</p>}
      </div>
    </div>
  );
}

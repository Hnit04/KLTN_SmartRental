import React, { useState } from 'react';
import { aiApi } from '@/api/aiApi';
import { toast } from 'sonner';
import {
  Loader2, Play, Shield, ShieldBan, CheckCircle2, XCircle, AlertTriangle,
  ChevronDown, ChevronUp, Copy, Zap, Brain, Database, Search, Lock, Code2, ArrowDown
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';

interface TraceStep {
  step: string;
  title: string;
  status: string;
  input?: any;
  output?: any;
  metadata?: Record<string, any>;
  durationMs?: number;
}

interface DebugResponse {
  question: string;
  normalizedQuestion: string;
  finalStatus: string;
  llmUsed: boolean;
  quotaImpact: string;
  route: string;
  rawSql: string | null;
  finalSql: string | null;
  traceSteps: TraceStep[];
  executionSummary?: any;
}

const STEP_CONFIG: Record<string, { icon: React.ElementType; color: string; bg: string }> = {
  PREPROCESSING: { icon: Search, color: 'text-blue-400', bg: 'bg-blue-500/10 border-blue-500/20' },
  INTENT_EXTRACTION: { icon: Brain, color: 'text-violet-400', bg: 'bg-violet-500/10 border-violet-500/20' },
  ENTITY_EXTRACTION: { icon: Zap, color: 'text-amber-400', bg: 'bg-amber-500/10 border-amber-500/20' },
  ROUTING: { icon: ArrowDown, color: 'text-cyan-400', bg: 'bg-cyan-500/10 border-cyan-500/20' },
  NL_SQL_MAPPING: { icon: Code2, color: 'text-emerald-400', bg: 'bg-emerald-500/10 border-emerald-500/20' },
  SQL_GENERATION: { icon: Database, color: 'text-orange-400', bg: 'bg-orange-500/10 border-orange-500/20' },
  SECURITY_GATE: { icon: Shield, color: 'text-red-400', bg: 'bg-red-500/10 border-red-500/20' },
  FINAL_SQL: { icon: CheckCircle2, color: 'text-emerald-500', bg: 'bg-emerald-500/10 border-emerald-500/20' },
  EXECUTION_SUMMARY: { icon: Play, color: 'text-sky-400', bg: 'bg-sky-500/10 border-sky-500/20' },
};

const STATUS_BADGE: Record<string, { label: string; cls: string }> = {
  PASSED: { label: 'PASSED', cls: 'bg-emerald-100 text-emerald-700 border-emerald-200' },
  BLOCKED: { label: 'BLOCKED', cls: 'bg-red-100 text-red-700 border-red-200' },
  SKIPPED: { label: 'SKIPPED', cls: 'bg-gray-100 text-gray-500 border-gray-200' },
  ERROR: { label: 'ERROR', cls: 'bg-amber-100 text-amber-700 border-amber-200' },
};

// SQL keyword highlighter
const highlightSql = (sql: string) => {
  if (!sql) return sql;
  const keywords = ['SELECT', 'FROM', 'WHERE', 'JOIN', 'AND', 'OR', 'ON', 'GROUP BY', 'ORDER BY', 'ASC', 'DESC', 'LIMIT', 'LIKE', 'ILIKE', 'AS', 'IN', 'IS', 'NOT', 'NULL', 'INNER', 'LEFT', 'RIGHT', 'COUNT', 'SUM', 'AVG', 'MAX', 'MIN', 'WITH'];
  const regex = new RegExp(`\\b(${keywords.join('|')})\\b`, 'gi');
  const parts = sql.split(regex);
  return parts.map((part, i) => {
    if (keywords.includes(part.toUpperCase())) {
      return <span key={i} className="text-pink-400 font-bold">{part.toUpperCase()}</span>;
    }
    return part;
  });
};

interface AiDebuggerPanelProps {
  initialQuestion?: string;
  initialRole?: string;
  autoRun?: boolean;
}

export default function AiDebuggerPanel({ 
  initialQuestion = '', 
  initialRole = 'GUEST', 
  autoRun = false 
}: AiDebuggerPanelProps) {
  const [question, setQuestion] = useState(initialQuestion);
  const [role, setRole] = useState(initialRole);
  const [userId, setUserId] = useState('');
  const [execute, setExecute] = useState(false);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<DebugResponse | null>(null);
  const [expandedSteps, setExpandedSteps] = useState<Set<number>>(new Set());

  // Auto-run when props change
  React.useEffect(() => {
    if (initialQuestion) {
      setQuestion(initialQuestion);
      setRole(initialRole);
    }
  }, [initialQuestion, initialRole]);

  React.useEffect(() => {
    if (autoRun && initialQuestion) {
      handleDebug();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoRun, initialQuestion]);

  const handleDebug = async () => {
    if (!question.trim()) {
      toast.error('Vui lòng nhập câu hỏi kiểm thử');
      return;
    }
    setLoading(true);
    setResult(null);
    setExpandedSteps(new Set());
    try {
      const res = await aiApi.debugPipeline({
        question: question.trim(),
        simulatedRole: role,
        simulatedUserId: userId ? parseInt(userId) : null,
        execute,
      });
      setResult(res);
      // Auto-expand all steps
      setExpandedSteps(new Set(res.traceSteps?.map((_: any, i: number) => i) || []));
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Lỗi khi chạy debug pipeline');
    } finally {
      setLoading(false);
    }
  };

  const toggleStep = (idx: number) => {
    setExpandedSteps(prev => {
      const next = new Set(prev);
      if (next.has(idx)) next.delete(idx);
      else next.add(idx);
      return next;
    });
  };

  const copyText = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success('Đã copy!');
  };

  return (
    <div className="space-y-6">
      {/* ── INPUT FORM ── */}
      <div className="rounded-2xl border border-border/60 bg-card p-5 shadow-sm">
        <h3 className="text-base font-bold text-foreground mb-4 flex items-center gap-2">
          <Brain className="h-5 w-5 text-violet-500" />
          AI Pipeline Debugger
        </h3>
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-12">
          <div className="lg:col-span-5">
            <label className="text-xs font-semibold text-muted-foreground mb-1 block">Câu hỏi kiểm thử</label>
            <Input
              placeholder="VD: liệt kê phòng trọ ở Gò Vấp dưới 3 triệu"
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleDebug()}
              className="min-h-11"
            />
          </div>
          <div className="lg:col-span-2">
            <label className="text-xs font-semibold text-muted-foreground mb-1 block">Role giả lập</label>
            <select
              value={role}
              onChange={(e) => setRole(e.target.value)}
              className="flex h-11 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring"
            >
              <option value="GUEST">GUEST</option>
              <option value="TENANT">TENANT</option>
              <option value="LANDLORD">LANDLORD</option>
            </select>
          </div>
          <div className="lg:col-span-2">
            <label className="text-xs font-semibold text-muted-foreground mb-1 block">User ID giả lập</label>
            <Input
              placeholder="Optional"
              value={userId}
              onChange={(e) => setUserId(e.target.value)}
              type="number"
              className="min-h-11"
            />
          </div>
          <div className="lg:col-span-1 flex items-end">
            <label className="flex items-center gap-2 text-xs font-semibold text-muted-foreground cursor-pointer select-none">
              <input type="checkbox" checked={execute} onChange={(e) => setExecute(e.target.checked)} className="rounded" />
              Chạy SQL
            </label>
          </div>
          <div className="lg:col-span-2 flex items-end">
            <Button
              onClick={handleDebug}
              disabled={loading || !question.trim()}
              className="w-full min-h-11 gap-2 bg-violet-600 hover:bg-violet-700 text-white font-semibold"
            >
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Play className="h-4 w-4" />}
              Phân tích pipeline
            </Button>
          </div>
        </div>
      </div>

      {/* ── RESULT ── */}
      {result && (
        <div className="space-y-4">
          {/* Summary Bar */}
          <div className="rounded-2xl border border-border/60 bg-card p-4 shadow-sm">
            <div className="flex flex-wrap items-center gap-3">
              <span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-bold border ${
                result.finalStatus === 'PASSED' ? 'bg-emerald-100 text-emerald-700 border-emerald-200' :
                result.finalStatus === 'BLOCKED' ? 'bg-red-100 text-red-700 border-red-200' :
                'bg-amber-100 text-amber-700 border-amber-200'
              }`}>
                {result.finalStatus === 'PASSED' ? <CheckCircle2 className="h-3.5 w-3.5" /> :
                 result.finalStatus === 'BLOCKED' ? <ShieldBan className="h-3.5 w-3.5" /> :
                 <AlertTriangle className="h-3.5 w-3.5" />}
                {result.finalStatus}
              </span>

              <span className="rounded-full bg-violet-100 text-violet-700 border border-violet-200 px-3 py-1 text-xs font-bold">
                {result.route}
              </span>

              <span className={`rounded-full px-3 py-1 text-xs font-bold border ${
                result.llmUsed ? 'bg-amber-100 text-amber-700 border-amber-200' : 'bg-emerald-100 text-emerald-700 border-emerald-200'
              }`}>
                LLM: {result.llmUsed ? 'Yes' : 'No'}
              </span>

              <span className={`rounded-full px-3 py-1 text-xs font-bold border ${
                result.quotaImpact === 'NONE' ? 'bg-gray-100 text-gray-600 border-gray-200' : 'bg-amber-100 text-amber-700 border-amber-200'
              }`}>
                Quota: {result.quotaImpact}
              </span>
            </div>
          </div>

          {/* Timeline */}
          <div className="space-y-3">
            {result.traceSteps.map((step, idx) => {
              const config = STEP_CONFIG[step.step] || { icon: Brain, color: 'text-gray-400', bg: 'bg-gray-500/10 border-gray-500/20' };
              const StepIcon = config.icon;
              const badge = STATUS_BADGE[step.status] || STATUS_BADGE.PASSED;
              const isExpanded = expandedSteps.has(idx);
              const isMapping = step.step === 'NL_SQL_MAPPING';
              const isFinalSql = step.step === 'FINAL_SQL';
              const isSqlGen = step.step === 'SQL_GENERATION';

              return (
                <div key={idx} className={`rounded-xl border ${config.bg} overflow-hidden transition-all`}>
                  {/* Step Header */}
                  <button
                    className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-black/5 transition-colors"
                    onClick={() => toggleStep(idx)}
                  >
                    {/* Connector dot */}
                    <div className="relative flex flex-col items-center">
                      <div className={`h-8 w-8 rounded-full flex items-center justify-center ${
                        step.status === 'BLOCKED' ? 'bg-red-500/20' :
                        step.status === 'PASSED' ? 'bg-emerald-500/20' :
                        step.status === 'ERROR' ? 'bg-amber-500/20' : 'bg-gray-300/20'
                      }`}>
                        <StepIcon className={`h-4 w-4 ${config.color}`} />
                      </div>
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-bold text-foreground">{step.title}</span>
                        <span className={`inline-block rounded-full px-2 py-0.5 text-[10px] font-bold border ${badge.cls}`}>
                          {badge.label}
                        </span>
                        {step.durationMs != null && (
                          <span className="text-[10px] text-muted-foreground tabular-nums">{step.durationMs}ms</span>
                        )}
                      </div>
                      <span className="text-[10px] font-mono text-muted-foreground">{step.step}</span>
                    </div>

                    {isExpanded ? <ChevronUp className="h-4 w-4 text-muted-foreground shrink-0" /> : <ChevronDown className="h-4 w-4 text-muted-foreground shrink-0" />}
                  </button>

                  {/* Step Body */}
                  {isExpanded && (
                    <div className="px-4 pb-4 pt-1 border-t border-border/30">
                      {/* Input */}
                      {step.input && (
                        <div className="mb-2">
                          <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Input</span>
                          <div className="mt-1 rounded-lg bg-slate-950 p-3 text-xs font-mono text-gray-300 whitespace-pre-wrap">
                            {typeof step.input === 'string' ? step.input : JSON.stringify(step.input, null, 2)}
                          </div>
                        </div>
                      )}

                      {/* Output */}
                      {step.output && (
                        <div>
                          <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Output</span>

                          {/* NL-to-SQL Mapping Table */}
                          {isMapping && Array.isArray(step.output) && step.output.length > 0 ? (
                            <div className="mt-2 overflow-hidden rounded-xl border border-emerald-200 shadow-sm">
                              <table className="w-full text-xs">
                                <thead>
                                  <tr className="bg-emerald-50">
                                    <th className="px-3 py-2.5 text-left font-bold text-emerald-800">Cụm từ người dùng</th>
                                    <th className="px-3 py-2.5 text-left font-bold text-emerald-800">SQL tương ứng</th>
                                    <th className="px-3 py-2.5 text-left font-bold text-emerald-800">Giải thích</th>
                                  </tr>
                                </thead>
                                <tbody className="divide-y divide-emerald-100">
                                  {step.output.map((m: any, i: number) => (
                                    <tr key={i} className="hover:bg-emerald-50/50 transition-colors">
                                      <td className="px-3 py-2 font-semibold text-foreground">{m.phrase}</td>
                                      <td className="px-3 py-2 font-mono text-violet-700 font-semibold">{m.sqlPart}</td>
                                      <td className="px-3 py-2 text-muted-foreground">{m.explanation}</td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>
                          ) : (isFinalSql || isSqlGen) && step.output?.rawSql ? (
                            /* SQL Code Block */
                            <div className="mt-1 relative">
                              <button
                                onClick={() => copyText(step.output.rawSql || step.output.finalSql || '')}
                                className="absolute top-2 right-2 text-slate-500 hover:text-white transition-colors p-1 rounded"
                                title="Copy SQL"
                              >
                                <Copy className="h-3.5 w-3.5" />
                              </button>
                              <div className="rounded-lg bg-slate-950 p-3 text-xs font-mono text-gray-300 whitespace-pre-wrap leading-relaxed overflow-x-auto">
                                {highlightSql(step.output.rawSql || step.output.finalSql)}
                              </div>
                            </div>
                          ) : isFinalSql && step.output?.finalSql ? (
                            <div className="mt-1 relative">
                              <button
                                onClick={() => copyText(step.output.finalSql)}
                                className="absolute top-2 right-2 text-slate-500 hover:text-white transition-colors p-1 rounded"
                                title="Copy SQL"
                              >
                                <Copy className="h-3.5 w-3.5" />
                              </button>
                              <div className="rounded-lg bg-slate-950 p-3 text-xs font-mono text-gray-300 whitespace-pre-wrap leading-relaxed overflow-x-auto">
                                {highlightSql(step.output.finalSql)}
                              </div>
                            </div>
                          ) : step.output?.blockedReason ? (
                            /* Security Block */
                            <div className="mt-1 rounded-lg bg-red-50 border border-red-200 p-3">
                              <div className="flex items-center gap-2 mb-1">
                                <Lock className="h-4 w-4 text-red-600" />
                                <span className="text-xs font-bold text-red-700">Bị chặn</span>
                              </div>
                              <p className="text-xs text-red-700">{step.output.blockedReason}</p>
                              {step.output.violatedRules && (
                                <div className="flex gap-1.5 mt-2 flex-wrap">
                                  {step.output.violatedRules.map((r: string, i: number) => (
                                    <span key={i} className="rounded-full bg-red-100 text-red-700 px-2 py-0.5 text-[9px] font-bold border border-red-200">{r}</span>
                                  ))}
                                </div>
                              )}
                            </div>
                          ) : step.output?.rulesApplied ? (
                            /* Security Passed */
                            <div className="mt-1 rounded-lg bg-emerald-50 border border-emerald-200 p-3">
                              <div className="flex items-center gap-2 mb-1">
                                <Shield className="h-4 w-4 text-emerald-600" />
                                <span className="text-xs font-bold text-emerald-700">Đã vượt qua kiểm tra bảo mật</span>
                              </div>
                              <div className="flex gap-1.5 flex-wrap">
                                {step.output.rulesApplied.map((r: string, i: number) => (
                                  <span key={i} className="rounded-full bg-emerald-100 text-emerald-700 px-2 py-0.5 text-[9px] font-bold border border-emerald-200">{r}</span>
                                ))}
                              </div>
                            </div>
                          ) : (
                            /* Generic JSON */
                            <div className="mt-1 rounded-lg bg-slate-950 p-3 text-xs font-mono text-gray-300 whitespace-pre-wrap max-h-[300px] overflow-y-auto">
                              {typeof step.output === 'string' ? step.output : JSON.stringify(step.output, null, 2)}
                            </div>
                          )}
                        </div>
                      )}

                      {/* Metadata */}
                      {step.metadata && Object.keys(step.metadata).length > 0 && (
                        <div className="mt-2 flex gap-2 flex-wrap">
                          {Object.entries(step.metadata).map(([k, v]) => (
                            <span key={k} className="rounded-full bg-gray-100 text-gray-600 px-2 py-0.5 text-[9px] font-mono border border-gray-200">
                              {k}: {String(v)}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Empty state */}
      {!result && !loading && (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-border/60 bg-muted/20 py-16 text-center">
          <Brain className="h-12 w-12 text-muted-foreground/30 mb-4" />
          <h3 className="text-base font-bold text-muted-foreground">Pipeline Debugger</h3>
          <p className="text-sm text-muted-foreground/70 max-w-md mt-2">
            Nhập một câu hỏi tiếng Việt ở trên và nhấn <strong>Phân tích pipeline</strong> để xem hệ thống chuyển đổi câu hỏi thành truy vấn PostgreSQL như thế nào.
          </p>
        </div>
      )}
    </div>
  );
}

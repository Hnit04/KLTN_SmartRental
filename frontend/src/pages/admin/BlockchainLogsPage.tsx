import { useEffect, useState, useCallback } from 'react';
import { contractApi } from '@/api/contractApi';
import { toast } from 'sonner';
import {
  Blocks, ShieldCheck, ShieldAlert, ExternalLink, Copy, Search, RefreshCw,
  FileText, Loader2, CheckCircle2, XCircle, Clock, Landmark, Hash, ArrowUpDown,
  ScanSearch, X, AlertTriangle, Database, Link2
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import StatusBadge from '@/components/shared/StatusBadge';

const ETHERSCAN_BASE = 'https://sepolia.etherscan.io';
const ETH_TO_VND = 80_000_000;
const WEI_PRECISION = 10 ** 18;

interface ContractLog {
  id: number;
  roomName: string;
  propertyAddress: string;
  tenantName: string;
  landlordName: string;
  actualPrice: number;
  depositAmount: number;
  status: string;
  signMethod: string;
  contractHash: string;
  smartContractAddress: string;
  deployTxHash: string;
  signDate: string;
  startDate: string;
  endDate: string;
}

interface Comparison {
  field: string;
  database: string;
  onChain: string;
  match: boolean;
  modified?: boolean;   // Addendum Pattern: lệch hợp pháp do có Phụ lục
  addendum?: string;    // Mô tả Phụ lục (ví dụ: "Phụ lục #5 duyệt ngày...")
}

interface VerifyResult {
  valid: boolean;
  verifyLevel: string;
  comparisons?: Comparison[];
  error?: string;
  message?: string;
  smartContractAddress?: string;
}

const FIELD_LABELS: Record<string, string> = {
  rentAmount: 'Tiền thuê (VNĐ)',
  depositAmount: 'Tiền cọc (VNĐ)',
  contractHash: 'Contract Hash',
  roomName: 'Tên phòng',
  elecPrice: 'Tiền điện (VNĐ/kWh)',
  waterPrice: 'Tiền nước (VNĐ/khối)',
  internetPrice: 'Tiền internet (VNĐ)',
  startDate: 'Ngày bắt đầu',
  endDate: 'Ngày kết thúc',
  latePenaltyPercent: 'Phạt trễ (%/ngày)',
  landlordAddress: 'Ví Web3 (Chủ trọ)',
  tenantAddress: 'Ví Web3 (Khách thuê)',
};

const formatDisplayValue = (field: string, value: string) => {
  if (!value || value === '—' || value === '0') return value || '—';
  
  if (field.toLowerCase().includes('amount') || field.toLowerCase().includes('price')) {
    const num = Number(value);
    if (isNaN(num)) return value;
    const vndValue = (num / WEI_PRECISION) * ETH_TO_VND;
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(vndValue);
  }
  
  if (field.toLowerCase().includes('date')) {
    const num = Number(value);
    if (isNaN(num) || num < 1000000) return value; // Not a unix timestamp
    return new Date(num * 1000).toLocaleDateString('vi-VN');
  }
  
  if (value.length > 25) {
    return value.slice(0, 10) + '...' + value.slice(-8);
  }
  
  return value;
};

export default function BlockchainLogsPage() {
  const [contracts, setContracts] = useState<ContractLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterMode, setFilterMode] = useState<'all' | 'blockchain' | 'traditional'>('all');
  const [sortField, setSortField] = useState<'id' | 'status'>('id');
  const [sortAsc, setSortAsc] = useState(false);
  const [verifyingId, setVerifyingId] = useState<number | null>(null);
  const [verifyResults, setVerifyResults] = useState<Record<number, 'valid' | 'invalid'>>({});

  // --- Data Diff Modal ---
  const [diffModal, setDiffModal] = useState<{ open: boolean; contractId: number; data: VerifyResult | null }>({
    open: false, contractId: 0, data: null,
  });

  // --- Full Audit ---
  const [auditRunning, setAuditRunning] = useState(false);
  const [auditProgress, setAuditProgress] = useState(0);
  const [auditTotal, setAuditTotal] = useState(0);
  const [auditResults, setAuditResults] = useState<{ valid: number; invalid: number; errors: number }>({ valid: 0, invalid: 0, errors: 0 });

  useEffect(() => { fetchData(); }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const res = await contractApi.getAll();
      const data = (res as any).data || res;
      setContracts(Array.isArray(data) ? data : []);
    } catch {
      toast.error('Không thể tải danh sách hợp đồng');
    } finally {
      setLoading(false);
    }
  };

  // --- Metrics ---
  const totalContracts = contracts.length;
  const blockchainContracts = contracts.filter(c => c.smartContractAddress);
  const activeContracts = contracts.filter(c => c.status === 'ACTIVE');
  const totalDeposit = contracts.reduce((sum, c) => sum + (c.depositAmount || 0), 0);

  // --- Filter & Sort ---
  const filtered = contracts
    .filter(c => {
      if (filterMode === 'blockchain') return !!c.smartContractAddress;
      if (filterMode === 'traditional') return !c.smartContractAddress;
      return true;
    })
    .filter(c => {
      if (!searchQuery) return true;
      const q = searchQuery.toLowerCase();
      return (
        c.roomName?.toLowerCase().includes(q) ||
        c.tenantName?.toLowerCase().includes(q) ||
        c.landlordName?.toLowerCase().includes(q) ||
        c.smartContractAddress?.toLowerCase().includes(q) ||
        c.contractHash?.toLowerCase().includes(q) ||
        String(c.id).includes(q)
      );
    })
    .sort((a, b) => {
      if (sortField === 'id') return sortAsc ? a.id - b.id : b.id - a.id;
      return sortAsc ? a.status.localeCompare(b.status) : b.status.localeCompare(a.status);
    });

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success('Đã copy!');
  };

  const shortenAddress = (addr: string) => {
    if (!addr || addr.length < 12) return addr || '—';
    return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
  };

  // --- Single Verify (with Modal) ---
  const handleVerify = async (contract: ContractLog) => {
    setVerifyingId(contract.id);
    try {
      const res = await contractApi.verify(contract.id);
      const data: VerifyResult = (res as any).data || res;
      const isValid = data.valid === true;
      setVerifyResults(prev => ({ ...prev, [contract.id]: isValid ? 'valid' : 'invalid' }));

      // Always open modal with full comparison data
      setDiffModal({ open: true, contractId: contract.id, data });

    } catch {
      setVerifyResults(prev => ({ ...prev, [contract.id]: 'invalid' }));
      toast.error(`HĐ #${contract.id}: Lỗi khi xác minh`);
    } finally {
      setVerifyingId(null);
    }
  };

  // --- Full Audit (Sequential with Progress) ---
  const handleFullAudit = useCallback(async () => {
    const targets = contracts.filter(c => c.smartContractAddress);
    if (targets.length === 0) {
      toast.info('Không có hợp đồng blockchain nào để kiểm toán');
      return;
    }

    setAuditRunning(true);
    setAuditTotal(targets.length);
    setAuditProgress(0);
    setAuditResults({ valid: 0, invalid: 0, errors: 0 });

    let valid = 0, invalid = 0, errors = 0;

    for (let i = 0; i < targets.length; i++) {
      const c = targets[i];
      try {
        const res = await contractApi.verify(c.id);
        const data: VerifyResult = (res as any).data || res;
        if (data.valid) {
          valid++;
          setVerifyResults(prev => ({ ...prev, [c.id]: 'valid' }));
        } else {
          invalid++;
          setVerifyResults(prev => ({ ...prev, [c.id]: 'invalid' }));
        }
      } catch {
        errors++;
        setVerifyResults(prev => ({ ...prev, [c.id]: 'invalid' }));
      }
      setAuditProgress(i + 1);
      setAuditResults({ valid, invalid, errors });
    }

    setAuditRunning(false);
    toast.success(`Kiểm toán hoàn tất: ${valid} toàn vẹn, ${invalid} bất thường, ${errors} lỗi`);
  }, [contracts]);

  const statusConfig: Record<string, { label: string; tone: 'success' | 'warning' | 'neutral' | 'danger'; icon: any }> = {
    ACTIVE: { label: 'Đang hiệu lực', tone: 'success', icon: CheckCircle2 },
    PENDING_SIGNATURE: { label: 'Chờ ký', tone: 'warning', icon: Clock },
    EXPIRED: { label: 'Hết hạn', tone: 'neutral', icon: XCircle },
    TERMINATED: { label: 'Đã hủy', tone: 'danger', icon: XCircle },
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <Loader2 className="h-10 w-10 animate-spin text-indigo-500 mx-auto mb-3" />
          <p className="text-gray-500 font-medium">Đang tải dữ liệu Blockchain...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-[1400px] mx-auto">
      {/* === HEADER === */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Blocks className="h-7 w-7 text-indigo-600" />
            Blockchain Logs & Audit
          </h1>
          <p className="text-sm text-gray-500 mt-1">Giám sát Smart Contract trên mạng Sepolia Testnet</p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={handleFullAudit}
            disabled={auditRunning}
            className="gap-2 border-violet-300 text-violet-700 hover:bg-violet-50"
          >
            {auditRunning ? <Loader2 className="h-4 w-4 animate-spin" /> : <ScanSearch className="h-4 w-4" />}
            Kiểm toán Toàn hệ thống
          </Button>
          <Button variant="outline" onClick={fetchData} className="gap-2">
            <RefreshCw className="h-4 w-4" /> Làm mới
          </Button>
        </div>
      </div>

      {/* === FULL AUDIT PROGRESS BAR === */}
      {(auditRunning || auditProgress > 0) && (
        <div className="bg-white rounded-xl border shadow-sm p-5 space-y-3 transition-all">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <ScanSearch className="h-5 w-5 text-violet-600" />
              <h3 className="font-semibold text-gray-900">
                {auditRunning ? 'Đang kiểm toán...' : 'Kiểm toán hoàn tất'}
              </h3>
            </div>
            <span className="text-sm font-mono text-gray-500">
              {auditProgress}/{auditTotal}
            </span>
          </div>

          {/* Progress Bar */}
          <div className="w-full bg-gray-100 rounded-full h-3 overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-500 ease-out ${
                auditRunning ? 'bg-gradient-to-r from-violet-500 to-indigo-500' : 'bg-emerald-500'
              }`}
              style={{ width: `${auditTotal > 0 ? (auditProgress / auditTotal) * 100 : 0}%` }}
            />
          </div>

          {/* Stats */}
          <div className="flex gap-4 text-sm">
            <span className="flex items-center gap-1 text-emerald-600 font-semibold">
              <ShieldCheck className="h-4 w-4" /> {auditResults.valid} Toàn vẹn
            </span>
            <span className="flex items-center gap-1 text-red-600 font-semibold">
              <ShieldAlert className="h-4 w-4" /> {auditResults.invalid} Bất thường
            </span>
            {auditResults.errors > 0 && (
              <span className="flex items-center gap-1 text-amber-600 font-semibold">
                <AlertTriangle className="h-4 w-4" /> {auditResults.errors} Lỗi mạng
              </span>
            )}
          </div>

          {!auditRunning && auditProgress > 0 && (
            <button onClick={() => { setAuditProgress(0); }} className="text-xs text-gray-400 hover:text-gray-600 underline">
              Ẩn thanh tiến trình
            </button>
          )}
        </div>
      )}

      {/* === DASHBOARD METRICS === */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard icon={<FileText className="h-5 w-5" />} label="Tổng Hợp đồng" value={totalContracts} color="indigo" />
        <MetricCard icon={<Blocks className="h-5 w-5" />} label="On-Chain (Blockchain)" value={blockchainContracts.length} color="violet" sub={`${totalContracts ? Math.round(blockchainContracts.length / totalContracts * 100) : 0}% tổng số`} />
        <MetricCard icon={<ShieldCheck className="h-5 w-5" />} label="Đang có hiệu lực" value={activeContracts.length} color="emerald" />
        <MetricCard icon={<Landmark className="h-5 w-5" />} label="Tổng tiền cọc" value={`${(totalDeposit / 1_000_000).toFixed(1)}M`} color="amber" sub="VNĐ" />
      </div>

      {/* === FILTER BAR === */}
      <div className="bg-white rounded-xl border shadow-sm p-4 flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
        <div className="flex gap-2 flex-wrap">
          {(['all', 'blockchain', 'traditional'] as const).map(mode => (
            <button key={mode} onClick={() => setFilterMode(mode)} className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all border ${filterMode === mode ? 'bg-indigo-600 text-white border-indigo-600 shadow-sm' : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'}`}>
              {mode === 'all' ? '🗂 Tất cả' : mode === 'blockchain' ? '⛓ Blockchain' : '📄 Truyền thống'}
            </button>
          ))}
        </div>
        <div className="relative w-full sm:w-72">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <input type="text" placeholder="Tìm phòng, khách, hash..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} className="w-full pl-9 pr-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-indigo-300 outline-none" />
        </div>
      </div>

      {/* === CONTRACT TABLE === */}
      <div className="bg-white rounded-xl border shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50/80 border-b">
                <th className="px-4 py-3 text-left font-semibold text-gray-600">
                  <button onClick={() => { setSortField('id'); setSortAsc(!sortAsc); }} className="flex items-center gap-1 hover:text-indigo-600">
                    # <ArrowUpDown className="h-3 w-3" />
                  </button>
                </th>
                <th className="px-4 py-3 text-left font-semibold text-gray-600">Phòng / Chủ trọ</th>
                <th className="px-4 py-3 text-left font-semibold text-gray-600">Khách thuê</th>
                <th className="px-4 py-3 text-left font-semibold text-gray-600">
                  <button onClick={() => { setSortField('status'); setSortAsc(!sortAsc); }} className="flex items-center gap-1 hover:text-indigo-600">
                    Trạng thái <ArrowUpDown className="h-3 w-3" />
                  </button>
                </th>
                <th className="px-4 py-3 text-left font-semibold text-gray-600">Smart Contract</th>
                <th className="px-4 py-3 text-left font-semibold text-gray-600">Contract Hash</th>
                <th className="px-4 py-3 text-center font-semibold text-gray-600">Hành động</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={7} className="text-center py-16 text-gray-400">
                    <Blocks className="h-12 w-12 mx-auto mb-3 opacity-30" />
                    <p className="font-medium">Không tìm thấy hợp đồng nào</p>
                  </td>
                </tr>
              ) : (
                filtered.map(c => {
                  const st = statusConfig[c.status] || statusConfig.EXPIRED;
                  const StIcon = st.icon;
                  const vResult = verifyResults[c.id];

                  return (
                    <tr key={c.id} className="hover:bg-indigo-50/30 transition-colors group">
                      <td className="px-4 py-3 font-mono font-bold text-indigo-600">#{c.id}</td>
                      <td className="px-4 py-3">
                        <div className="font-semibold text-gray-900">{c.roomName || '—'}</div>
                        <div className="text-xs text-gray-500 truncate max-w-[180px]">{c.landlordName || '—'}</div>
                      </td>
                      <td className="px-4 py-3 text-gray-700">{c.tenantName || '—'}</td>
                      <td className="px-4 py-3">
                        <StatusBadge label={st.label} tone={st.tone} className="text-xs font-semibold" />
                        {c.signMethod === 'BLOCKCHAIN' && (
                          <StatusBadge label="Web3" tone="info" className="ml-1.5 text-[10px] font-bold" />
                        )}
                      </td>
                      <td className="px-4 py-3">
                        {c.smartContractAddress ? (
                          <div className="flex items-center gap-1.5">
                            <code className="bg-gray-100 px-2 py-0.5 rounded text-xs font-mono text-gray-700">{shortenAddress(c.smartContractAddress)}</code>
                            <button onClick={() => copyToClipboard(c.smartContractAddress)} title="Copy" className="text-gray-400 hover:text-indigo-600 transition"><Copy className="h-3.5 w-3.5" /></button>
                            <a href={`${ETHERSCAN_BASE}/address/${c.smartContractAddress}`} target="_blank" rel="noopener noreferrer" title="Xem trên Etherscan" className="text-gray-400 hover:text-indigo-600 transition"><ExternalLink className="h-3.5 w-3.5" /></a>
                          </div>
                        ) : (
                          <span className="text-xs text-gray-400 italic">Không có</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        {c.contractHash ? (
                          <div className="flex items-center gap-1.5">
                            <code className="bg-gray-100 px-2 py-0.5 rounded text-[11px] font-mono text-gray-600 max-w-[120px] truncate block">{c.contractHash}</code>
                            <button onClick={() => copyToClipboard(c.contractHash)} title="Copy Hash" className="text-gray-400 hover:text-indigo-600 transition"><Copy className="h-3.5 w-3.5" /></button>
                          </div>
                        ) : (
                          <span className="text-xs text-gray-400 italic">—</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          {verifyingId === c.id ? (
                            <Loader2 className="h-4 w-4 animate-spin text-indigo-500" />
                          ) : vResult === 'valid' ? (
                            <button onClick={() => handleVerify(c)} className="transition cursor-pointer">
                              <StatusBadge label="Toàn vẹn" tone="success" className="text-xs font-semibold" />
                            </button>
                          ) : vResult === 'invalid' ? (
                            <button onClick={() => handleVerify(c)} className="transition cursor-pointer">
                              <StatusBadge label="Bất thường" tone="danger" className="text-xs font-semibold" />
                            </button>
                          ) : (
                            <Button size="sm" variant="outline" onClick={() => handleVerify(c)} className="text-xs h-7 px-2 gap-1 text-indigo-600 border-indigo-200 hover:bg-indigo-50">
                              <Hash className="h-3 w-3" /> Verify
                            </Button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
        <div className="px-4 py-3 border-t bg-gray-50/50 flex justify-between items-center text-xs text-gray-500">
          <span>Hiển thị {filtered.length} / {totalContracts} hợp đồng</span>
          <span className="flex items-center gap-1"><Blocks className="h-3 w-3" /> Sepolia Testnet · Chain ID 11155111</span>
        </div>
      </div>

      {/* ============================================ */}
      {/* === DATA DIFF MODAL === */}
      {/* ============================================ */}
      {diffModal.open && diffModal.data && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm" onClick={() => setDiffModal({ open: false, contractId: 0, data: null })}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-5xl max-h-[90vh] mx-4 overflow-hidden animate-in fade-in zoom-in-95 flex flex-col" onClick={e => e.stopPropagation()}>


            {/* Modal Header */}
            <div className={`px-6 py-4 flex items-center justify-between ${diffModal.data.valid ? 'bg-gradient-to-r from-emerald-500 to-teal-500' : 'bg-gradient-to-r from-red-500 to-rose-500'}`}>
              <div className="flex items-center gap-3">
                {diffModal.data.valid ? <ShieldCheck className="h-6 w-6 text-white" /> : <ShieldAlert className="h-6 w-6 text-white" />}
                <div>
                  <h2 className="text-white font-bold text-lg">
                    Hợp đồng #{diffModal.contractId} — {diffModal.data.valid ? 'Toàn vẹn dữ liệu' : '⚠ Phát hiện bất thường'}
                  </h2>
                  <p className="text-white/80 text-xs">
                    Xác minh cấp: {diffModal.data.verifyLevel === 'BLOCKCHAIN' ? '⛓ Blockchain (Cấp 3)' : '🗄 Database (Cấp 2)'}
                  </p>
                </div>
              </div>
              <button onClick={() => setDiffModal({ open: false, contractId: 0, data: null })} className="text-white/70 hover:text-white transition">
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 overflow-y-auto flex-1">
              {diffModal.data.comparisons && diffModal.data.comparisons.length > 0 ? (
                <>
                  {/* Comparison Table */}
                  <div className="rounded-xl border overflow-hidden">
                  <table className="w-full text-sm table-fixed">
                      <thead>
                        <tr className="bg-gray-50">
                          <th className="px-4 py-2.5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider w-[18%]">Trường dữ liệu</th>
                          <th className="px-4 py-2.5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider w-[34%]">
                            <span className="flex items-center gap-1"><Database className="h-3 w-3" /> Database</span>
                          </th>
                          <th className="px-4 py-2.5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider w-[34%]">
                            <span className="flex items-center gap-1"><Link2 className="h-3 w-3" /> Blockchain</span>
                          </th>
                          <th className="px-4 py-2.5 text-center text-xs font-semibold text-gray-500 uppercase tracking-wider w-[14%]">Kết quả</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y">
                        {diffModal.data.comparisons.map((comp, idx) => (
                          <tr key={idx} className={comp.match ? 'bg-white' : 'bg-red-50/50'}>
                            <td className="px-4 py-3 font-semibold text-gray-800">{FIELD_LABELS[comp.field] || comp.field}</td>
                            <td className="px-4 py-3">
                              <code className={`text-[10px] px-1.5 py-0.5 rounded font-mono break-all block ${comp.match ? 'bg-gray-100 text-gray-700' : 'bg-red-100 text-red-700 line-through'}`}>
                                {formatDisplayValue(comp.field, comp.database)}
                              </code>
                            </td>
                            <td className="px-4 py-3">
                              <code className={`text-[10px] px-1.5 py-0.5 rounded font-mono break-all block ${comp.match ? 'bg-gray-100 text-gray-700' : 'bg-emerald-100 text-emerald-700 font-bold'}`}>
                                {formatDisplayValue(comp.field, comp.onChain)}
                              </code>
                            </td>
                            <td className="px-4 py-3 text-center">
                              {comp.match ? (
                                comp.modified ? (
                                  <div>
                                    <span className="inline-flex items-center gap-1 text-orange-600 font-semibold text-xs">📝 Phụ lục</span>
                                    {comp.addendum && <p className="text-[10px] text-orange-500 mt-1 leading-tight">{comp.addendum}</p>}
                                  </div>
                                ) : (
                                  <span className="inline-flex items-center gap-1 text-emerald-600 whitespace-nowrap"><CheckCircle2 className="h-4 w-4" /> Khớp</span>
                                )
                              ) : (
                                <span className="inline-flex items-center gap-1 text-red-600 font-bold whitespace-nowrap"><XCircle className="h-4 w-4" /> Lệch!</span>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {/* Summary */}
                  <div className={`mt-4 p-3 rounded-lg text-sm ${diffModal.data.valid ? 'bg-emerald-50 text-emerald-800 border border-emerald-200' : 'bg-red-50 text-red-800 border border-red-200'}`}>
                    {diffModal.data.valid ? (
                      <p className="flex items-center gap-2"><ShieldCheck className="h-4 w-4" /> Tất cả dữ liệu trên Blockchain khớp hoàn toàn với Database. Hợp đồng chưa bị can thiệp.</p>
                    ) : (
                      <p className="flex items-center gap-2"><AlertTriangle className="h-4 w-4" /> Phát hiện dữ liệu trong Database <strong>không khớp</strong> với dữ liệu trên Blockchain. Có thể đã bị chỉnh sửa trái phép!</p>
                    )}
                  </div>

                  {/* Etherscan Link */}
                  {diffModal.data.smartContractAddress && (
                    <a href={`${ETHERSCAN_BASE}/address/${diffModal.data.smartContractAddress}`} target="_blank" rel="noopener noreferrer"
                      className="mt-3 inline-flex items-center gap-1.5 text-xs text-indigo-600 hover:text-indigo-800 transition">
                      <ExternalLink className="h-3.5 w-3.5" /> Xem trên Etherscan Sepolia
                    </a>
                  )}
                </>
              ) : (
                /* Fallback for Level 2 (no comparisons) */
                <div className={`p-4 rounded-lg text-sm ${diffModal.data.valid ? 'bg-emerald-50 text-emerald-800' : 'bg-amber-50 text-amber-800'}`}>
                  <p>{diffModal.data.message || diffModal.data.error || 'Không có dữ liệu so sánh chi tiết.'}</p>
                  <p className="mt-2 text-xs opacity-70">Hợp đồng này được ký bằng phương thức truyền thống, không có Smart Contract trên Blockchain để đối chiếu.</p>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="px-6 py-4 border-t bg-gray-50 flex justify-end">
              <Button variant="outline" onClick={() => setDiffModal({ open: false, contractId: 0, data: null })}>
                Đóng
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// --- Metric Card Component ---
function MetricCard({ icon, label, value, color, sub }: {
  icon: React.ReactNode; label: string; value: string | number; color: string; sub?: string;
}) {
  const iconBg: Record<string, string> = {
    indigo: 'bg-indigo-100 text-indigo-600',
    violet: 'bg-violet-100 text-violet-600',
    emerald: 'bg-emerald-100 text-emerald-600',
    amber: 'bg-amber-100 text-amber-600',
  };

  return (
    <div className="bg-white rounded-xl border shadow-sm p-4 flex items-center gap-4 hover:shadow-md transition-shadow">
      <div className={`p-2.5 rounded-lg ${iconBg[color]}`}>{icon}</div>
      <div>
        <p className="text-xs text-gray-500 font-medium">{label}</p>
        <p className="text-2xl font-bold text-gray-900">{value}</p>
        {sub && <p className="text-[11px] text-gray-400 mt-0.5">{sub}</p>}
      </div>
    </div>
  );
}
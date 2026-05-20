import { useEffect, useState, useCallback } from 'react';
import { contractApi } from '@/api/contractApi';
import { toast } from 'sonner';
import {
  Blocks, ShieldCheck, ShieldAlert, ExternalLink, Copy, Search, RefreshCw,
  FileText, Loader2, CheckCircle2, XCircle, Clock, Landmark, Hash, ArrowUpDown,
  ScanSearch, X, AlertTriangle, Database, Link2,
  Activity, Inbox, MailWarning, Skull, Wrench, Zap
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { PageHeader } from '@/components/ui/PageHeader';
import { StatKpiCard } from '@/components/dashboard';
import { SegmentedControl, type SegmentItem } from '@/components/ui/SegmentedControl';
import { TableShell } from '@/components/ui/TableShell';
import { EmptyState } from '@/components/ui/EmptyState';
import { Skeleton } from '@/components/ui/Skeleton';
import { DashboardPanel } from '@/components/dashboard';
import StatusBadge from '@/components/shared/StatusBadge';
import { useSystemConfig } from '@/context/SystemConfigContext';
import { getBlockchainRuntimeConfig } from '@/config/blockchainConfig';

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

interface OutboxMetrics {
  pendingCount: number;
  processingCount: number;
  confirmedCount: number;
  deadLetterCount: number;
  rpcUrl: string;
  rpcBackupCount: number;
  chainId: number;
  gasPriceMaxGwei: number;
  walletAddress: string;
  deadLetterEvents: Array<{
    id: number;
    eventType: string;
    contractId: number;
    retryCount: number;
    errorMessage: string;
    createdAt: string;
  }>;
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
  const { config } = useSystemConfig();
  const runtimeBlockchainConfig = getBlockchainRuntimeConfig(config);
  const chainLabel = `${runtimeBlockchainConfig.chainName} · Chain ID ${runtimeBlockchainConfig.chainId}`;
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

  // --- Outbox Metrics ---
  const [outboxMetrics, setOutboxMetrics] = useState<OutboxMetrics | null>(null);
  const [metricsLoading, setMetricsLoading] = useState(false);
  const [reconcilingNonce, setReconcilingNonce] = useState(false);

  useEffect(() => { fetchData(); fetchMetrics(); }, []);

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

  const fetchMetrics = async () => {
    try {
      setMetricsLoading(true);
      const res = await contractApi.getBlockchainMetrics();
      const data = (res as any).data || res;
      setOutboxMetrics(data);
    } catch {
      // Silently fail — metrics are optional
    } finally {
      setMetricsLoading(false);
    }
  };

  const handleReconcileNonce = async () => {
    setReconcilingNonce(true);
    try {
      await contractApi.reconcileNonce();
      toast.success('Đã đồng bộ lại nonce thành công!');
      fetchMetrics();
    } catch {
      toast.error('Lỗi khi đồng bộ nonce');
    } finally {
      setReconcilingNonce(false);
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

  const chainFilterItems: SegmentItem[] = [
    { id: 'all', label: 'Tất cả' },
    { id: 'blockchain', label: 'On-chain' },
    { id: 'traditional', label: 'Truyền thống' },
  ];

  if (loading) {
    return (
      <div className="mx-auto max-w-[1400px] space-y-6 pb-10">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div className="space-y-2">
            <Skeleton className="h-9 w-72 rounded-lg" />
            <Skeleton className="h-4 w-96 max-w-full rounded-md" />
          </div>
          <Skeleton className="h-10 w-40 rounded-lg" />
        </div>
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-24 rounded-2xl" />
          ))}
        </div>
        <Skeleton className="h-32 w-full rounded-2xl" />
        <Skeleton className="h-64 w-full rounded-2xl" />
      </div>
    );
  }

  return (
    <div className="mx-auto min-w-0 max-w-[1400px] space-y-6 overflow-x-hidden pb-10">
      <PageHeader
        title="Blockchain logs & audit"
        description={`Giám sát hợp đồng, hash và smart contract trên ${runtimeBlockchainConfig.chainName} — xác minh toàn vẹn dữ liệu.`}
        actions={
          <div className="flex w-full flex-wrap gap-2 sm:w-auto sm:justify-end">
            <Button
              variant="outline"
              onClick={handleFullAudit}
              disabled={auditRunning}
              className="min-h-11 min-w-0 flex-1 gap-2 border-primary/25 sm:flex-none"
            >
              {auditRunning ? <Loader2 className="h-4 w-4 animate-spin" /> : <ScanSearch className="h-4 w-4" />}
              Kiểm toán toàn hệ thống
            </Button>
            <Button variant="outline" onClick={fetchData} className="min-h-11 min-w-0 flex-1 gap-2 sm:flex-none">
              <RefreshCw className="h-4 w-4" /> Làm mới
            </Button>
          </div>
        }
      />

      {(auditRunning || auditProgress > 0) && (
        <DashboardPanel
          title={auditRunning ? 'Đang kiểm toán…' : 'Kiểm toán hoàn tất'}
          description="Tiến độ xác minh on-chain theo từng hợp đồng có smart contract."
          action={<span className="font-mono text-xs text-muted-foreground">{auditProgress}/{auditTotal}</span>}
        >
          <div className="space-y-3 p-4 sm:p-5">
          <div className="h-3 w-full overflow-hidden rounded-full bg-muted">
            <div
              className={`h-full rounded-full transition-all duration-500 ease-out ${
                auditRunning ? 'bg-gradient-to-r from-violet-500 to-indigo-500' : 'bg-emerald-500'
              }`}
              style={{ width: `${auditTotal > 0 ? (auditProgress / auditTotal) * 100 : 0}%` }}
            />
          </div>

          <div className="flex flex-wrap gap-4 text-sm">
            <span className="flex items-center gap-1 font-semibold text-emerald-600">
              <ShieldCheck className="h-4 w-4" /> {auditResults.valid} toàn vẹn
            </span>
            <span className="flex items-center gap-1 font-semibold text-red-600">
              <ShieldAlert className="h-4 w-4" /> {auditResults.invalid} bất thường
            </span>
            {auditResults.errors > 0 && (
              <span className="flex items-center gap-1 font-semibold text-amber-600">
                <AlertTriangle className="h-4 w-4" /> {auditResults.errors} lỗi mạng
              </span>
            )}
          </div>

          {!auditRunning && auditProgress > 0 && (
            <button
              type="button"
              onClick={() => {
                setAuditProgress(0);
              }}
              className="text-xs text-muted-foreground underline transition-colors hover:text-foreground"
            >
              Ẩn thanh tiến trình
            </button>
          )}
          </div>
        </DashboardPanel>
      )}

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatKpiCard
          icon={<FileText className="h-5 w-5" />}
          iconClassName="text-primary"
          label="Tổng hợp đồng"
          value={totalContracts}
        />
        <StatKpiCard
          icon={<Blocks className="h-5 w-5" />}
          iconClassName="text-violet-600"
          label="On-chain"
          value={blockchainContracts.length}
          description={`${totalContracts ? Math.round((blockchainContracts.length / totalContracts) * 100) : 0}% tổng số`}
        />
        <StatKpiCard
          icon={<ShieldCheck className="h-5 w-5" />}
          iconClassName="text-emerald-600"
          label="Đang hiệu lực"
          value={activeContracts.length}
        />
        <StatKpiCard
          icon={<Landmark className="h-5 w-5" />}
          iconClassName="text-amber-600"
          label="Tổng tiền cọc"
          value={`${(totalDeposit / 1_000_000).toFixed(1)}M`}
          description="VNĐ (ước lượng)"
        />
      </div>

      {/* ============================================ */}
      {/* === OUTBOX MONITORING SECTION === */}
      {/* ============================================ */}
      {outboxMetrics && (
        <DashboardPanel
          title="⛓ Blockchain Outbox Monitor"
          description={`RPC: ${outboxMetrics.rpcUrl ? outboxMetrics.rpcUrl.replace(/https?:\/\//, '').split('/')[0] : '—'} · Gas max: ${outboxMetrics.gasPriceMaxGwei} Gwei · Backup: ${outboxMetrics.rpcBackupCount} RPC`}
          action={
            <div className="flex gap-2">
              <Button size="sm" variant="outline" onClick={handleReconcileNonce} disabled={reconcilingNonce} className="gap-1.5 text-xs h-8">
                {reconcilingNonce ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Wrench className="h-3.5 w-3.5" />}
                Sync Nonce
              </Button>
              <Button size="sm" variant="outline" onClick={fetchMetrics} disabled={metricsLoading} className="gap-1.5 text-xs h-8">
                {metricsLoading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5" />}
              </Button>
            </div>
          }
        >
          <div className="p-4 sm:p-5 space-y-4">
            {/* Outbox KPI Cards */}
            <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
              <div className="flex items-center gap-3 rounded-xl border border-amber-200 bg-amber-50/60 p-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-amber-100">
                  <Inbox className="h-4.5 w-4.5 text-amber-600" />
                </div>
                <div>
                  <p className="text-xs font-medium text-amber-600">Pending</p>
                  <p className="text-xl font-bold text-amber-700">{outboxMetrics.pendingCount}</p>
                </div>
              </div>
              <div className="flex items-center gap-3 rounded-xl border border-blue-200 bg-blue-50/60 p-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-blue-100">
                  <Activity className="h-4.5 w-4.5 text-blue-600" />
                </div>
                <div>
                  <p className="text-xs font-medium text-blue-600">Processing</p>
                  <p className="text-xl font-bold text-blue-700">{outboxMetrics.processingCount}</p>
                </div>
              </div>
              <div className="flex items-center gap-3 rounded-xl border border-emerald-200 bg-emerald-50/60 p-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-100">
                  <CheckCircle2 className="h-4.5 w-4.5 text-emerald-600" />
                </div>
                <div>
                  <p className="text-xs font-medium text-emerald-600">Confirmed</p>
                  <p className="text-xl font-bold text-emerald-700">{outboxMetrics.confirmedCount}</p>
                </div>
              </div>
              <div className="flex items-center gap-3 rounded-xl border border-red-200 bg-red-50/60 p-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-red-100">
                  <Skull className="h-4.5 w-4.5 text-red-600" />
                </div>
                <div>
                  <p className="text-xs font-medium text-red-600">Dead Letter</p>
                  <p className="text-xl font-bold text-red-700">{outboxMetrics.deadLetterCount}</p>
                </div>
              </div>
            </div>

            {/* Wallet Info */}
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
              <span className="flex items-center gap-1">
                <Zap className="h-3 w-3" /> Wallet:
                <code className="rounded bg-muted px-1.5 py-0.5 font-mono text-[10px]">
                  {outboxMetrics.walletAddress ? `${outboxMetrics.walletAddress.slice(0, 6)}...${outboxMetrics.walletAddress.slice(-4)}` : '—'}
                </code>
              </span>
              <span>Chain ID: {outboxMetrics.chainId}</span>
            </div>

            {/* Dead Letter Events Table */}
            {outboxMetrics.deadLetterEvents && outboxMetrics.deadLetterEvents.length > 0 && (
              <div className="space-y-2">
                <h4 className="flex items-center gap-1.5 text-sm font-semibold text-red-700">
                  <MailWarning className="h-4 w-4" /> Dead Letter Events ({outboxMetrics.deadLetterEvents.length})
                </h4>
                <div className="rounded-xl border border-red-200 overflow-hidden">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="bg-red-50/80">
                        <th className="px-3 py-2 text-left font-semibold text-red-700">#</th>
                        <th className="px-3 py-2 text-left font-semibold text-red-700">Event Type</th>
                        <th className="px-3 py-2 text-left font-semibold text-red-700">Contract</th>
                        <th className="px-3 py-2 text-center font-semibold text-red-700">Retries</th>
                        <th className="px-3 py-2 text-left font-semibold text-red-700">Lỗi</th>
                        <th className="px-3 py-2 text-left font-semibold text-red-700">Thời gian</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-red-100">
                      {outboxMetrics.deadLetterEvents.map((evt) => (
                        <tr key={evt.id} className="hover:bg-red-50/40 transition-colors">
                          <td className="px-3 py-2 font-mono font-bold text-red-600">#{evt.id}</td>
                          <td className="px-3 py-2">
                            <code className="rounded bg-red-100 px-1.5 py-0.5 text-[10px] font-mono text-red-700">{evt.eventType}</code>
                          </td>
                          <td className="px-3 py-2 font-mono">HĐ #{evt.contractId}</td>
                          <td className="px-3 py-2 text-center font-bold text-red-600">{evt.retryCount}</td>
                          <td className="px-3 py-2 max-w-[280px]">
                            <span className="block truncate text-red-600" title={evt.errorMessage}>{evt.errorMessage}</span>
                          </td>
                          <td className="px-3 py-2 text-muted-foreground whitespace-nowrap">
                            {evt.createdAt ? new Date(evt.createdAt).toLocaleString('vi-VN') : '—'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        </DashboardPanel>
      )}

      <div className="section-card flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between sm:p-4">
        <SegmentedControl
          aria-label="Lọc loại hợp đồng"
          items={chainFilterItems}
          value={filterMode}
          onChange={(id) => setFilterMode(id as 'all' | 'blockchain' | 'traditional')}
        />
        <div className="relative w-full min-w-0 sm:max-w-sm">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Tìm phòng, khách, hash…"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>
      </div>

      {filtered.length === 0 ? (
        <EmptyState
          icon={Blocks}
          title="Không có hợp đồng phù hợp"
          description="Thử đổi bộ lọc hoặc từ khóa tìm kiếm."
        />
      ) : (
        <DashboardPanel
          title="Danh sách hợp đồng"
          description={`${filtered.length} / ${totalContracts} bản ghi — ${chainLabel}`}
        >
          <TableShell className="rounded-none border-0 border-t-0 shadow-none bg-transparent">
          <table className="w-full min-w-[960px] text-sm">
            <thead>
              <tr className="border-b border-border/60">
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
            <tbody className="divide-y divide-border/60">
              {filtered.map((c) => {
                  const st = statusConfig[c.status] || statusConfig.EXPIRED;
                  const vResult = verifyResults[c.id];

                  return (
                    <tr key={c.id} className="hover:bg-indigo-50/30 transition-colors group">
                      <td className="px-4 py-3 font-mono font-bold text-primary">#{c.id}</td>
                      <td className="px-4 py-3">
                        <div className="font-semibold text-gray-900">{c.roomName || '—'}</div>
                        <div className="text-xs text-gray-500 truncate max-w-[180px]">{c.landlordName || '—'}</div>
                      </td>
                      <td className="px-4 py-3 text-gray-700">{c.tenantName || '—'}</td>
                      <td className="px-4 py-3">
                        <StatusBadge label={st.label} tone={st.tone} className="text-xs font-semibold" />
                        {c.signMethod === 'BLOCKCHAIN' && (
                          <StatusBadge label="Web3" tone="info" className="ml-1.5 text-[10px] font-bold text-primary" />
                        )}
                      </td>
                      <td className="px-4 py-3">
                        {c.smartContractAddress ? (
                          <div className="flex items-center gap-1.5">
                            <code className="bg-gray-100 px-2 py-0.5 rounded text-xs font-mono text-primary">{shortenAddress(c.smartContractAddress)}</code>
                            <button onClick={() => copyToClipboard(c.smartContractAddress)} title="Copy" className="text-gray-400 hover:text-indigo-600 transition"><Copy className="h-3.5 w-3.5" /></button>
                            <a href={`${runtimeBlockchainConfig.explorerUrl}/address/${c.smartContractAddress}`} target="_blank" rel="noopener noreferrer" title="Xem trên blockchain explorer" className="text-gray-400 hover:text-indigo-600 transition"><ExternalLink className="h-3.5 w-3.5" /></a>
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
                            <Button size="sm" variant="outline" onClick={() => handleVerify(c)} className="text-xs h-7 px-2 gap-1 text-primary border-indigo-200 bg-indigo-50">
                              <Hash className="h-3 w-3 text-primary" /> Verify
                            </Button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
            </tbody>
          </table>
          </TableShell>
        <div className="flex flex-col gap-1 border-t border-border/60 bg-muted/30 px-4 py-3 text-xs text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
          <span>
            Hiển thị {filtered.length} / {totalContracts} hợp đồng
          </span>
          <span className="flex items-center gap-1">
            <Blocks className="h-3 w-3 shrink-0" /> {chainLabel}
          </span>
        </div>
        </DashboardPanel>
      )}

      {/* ============================================ */}
      {/* === DATA DIFF MODAL === */}
      {/* ============================================ */}
      {diffModal.open && diffModal.data && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-md animate-in fade-in duration-200" onClick={() => setDiffModal({ open: false, contractId: 0, data: null })}>
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
                        <tr className="bg-muted/40">
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

                  {/* Explorer Link */}
                  {diffModal.data.smartContractAddress && (
                    <a href={`${runtimeBlockchainConfig.explorerUrl}/address/${diffModal.data.smartContractAddress}`} target="_blank" rel="noopener noreferrer"
                      className="mt-3 inline-flex items-center gap-1.5 text-xs text-indigo-600 hover:text-indigo-800 transition">
                      <ExternalLink className="h-3.5 w-3.5" /> Xem trên blockchain explorer
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
            <div className="px-6 py-4 border-t bg-muted/40 flex justify-end">
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

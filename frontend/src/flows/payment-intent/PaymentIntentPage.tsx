import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams, useSearchParams } from "react-router-dom";
import { ArrowLeft, ExternalLink } from "lucide-react";
import { toast } from "sonner";
import { contractApi } from "@/api/contractApi";
import { featureFlags } from "@/config/featureFlags";
import { useSystemConfig } from "@/context/SystemConfigContext";
import { getBlockchainRuntimeConfig } from "@/config/blockchainConfig";
import type { Contract, ContractSignMethod } from "@/types";
import { trackEvent } from "@/utils/analytics";
import { useAuth } from "@/context/AuthContext";
import { canPayDeposit } from "@/features/contract/utils/contractFlowGuards";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Label } from "@/components/ui/Label";
import { PageHeader } from "@/components/ui/PageHeader";
import RiskNotice from "@/components/shared/RiskNotice";
import PaymentTimeline from "@/flows/payment-intent/components/PaymentTimeline";
import PaymentStatusCard from "@/flows/payment-intent/components/PaymentStatusCard";
import { type PaymentIntentState } from "@/flows/payment-intent/types";

function resolveEstimatedTime(method: ContractSignMethod, status: PaymentIntentState) {
  if (status === "synced") return "Hoan tat";
  if (status === "pending") return method === "BLOCKCHAIN" ? "1-3 phut" : "Duoi 1 phut";
  return method === "BLOCKCHAIN" ? "2-5 phut" : "Duoi 2 phut";
}

function mapStatusFromContract(contract: Contract): PaymentIntentState {
  if (contract.depositStatus === "DEPOSITED") return "synced";
  if (contract.status === "AWAITING_DEPOSIT") return "initiated";
  return "initiated";
}

export default function PaymentIntentPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { config } = useSystemConfig();
  const runtimeConfig = useMemo(() => getBlockchainRuntimeConfig(config), [config]);
  const [searchParams] = useSearchParams();
  const methodParam = searchParams.get("method");

  const [contract, setContract] = useState<Contract | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [txHash, setTxHash] = useState("");
  const [status, setStatus] = useState<PaymentIntentState>("initiated");
  const [note, setNote] = useState<string | null>(null);
  const [statusUpdatedAt, setStatusUpdatedAt] = useState<string | null>(null);
  const [method, setMethod] = useState<ContractSignMethod>("TRADITIONAL");

  const contractId = Number(id);
  const basePath = user?.role === "LANDLORD" ? "/landlord" : "/tenant";
  const detailPath = `${basePath}/contracts/${contractId}`;

  const fetchContract = useCallback(async () => {
    const res = await contractApi.getDetail(contractId);
    const data = (res as any).data || res;

    setContract(data);
    setStatus(mapStatusFromContract(data));
    setStatusUpdatedAt(new Date().toISOString());

    if (methodParam === "BLOCKCHAIN" || methodParam === "TRADITIONAL") {
      setMethod(methodParam);
    } else if (data.signMethod === "BLOCKCHAIN" || data.signMethod === "TRADITIONAL") {
      setMethod(data.signMethod);
    }
  }, [contractId, methodParam]);

  useEffect(() => {
    if (!featureFlags.paymentIntentV2) {
      navigate(detailPath, { replace: true });
      return;
    }

    if (!id || Number.isNaN(contractId)) {
      toast.error("Khong tim thay hop dong hop le.");
      navigate(-1);
      return;
    }

    let mounted = true;
    const run = async () => {
      try {
        setIsLoading(true);
        await fetchContract();
      } catch (error: any) {
        if (!mounted) return;
        toast.error(error?.response?.data?.message || "Khong tai duoc thong tin thanh toan.");
      } finally {
        if (mounted) setIsLoading(false);
      }
    };

    run();
    return () => {
      mounted = false;
    };
  }, [contractId, detailPath, fetchContract, id, navigate]);

  const estimatedTime = useMemo(() => resolveEstimatedTime(method, status), [method, status]);

  const canConfirmPayment = useMemo(() => (contract ? canPayDeposit(contract) : false), [contract]);
  const isAlreadyDeposited = contract?.depositStatus === "DEPOSITED";

  const refreshSyncedState = useCallback(async () => {
    const res = await contractApi.getDetail(contractId);
    const data = (res as any).data || res;

    setContract(data);
    if (data.depositStatus === "DEPOSITED") {
      setStatus("synced");
      setNote("Thanh toan da duoc xac nhan va dong bo thanh cong.");
      trackEvent("payment_success", { contractId, method });
    } else {
      setStatus("confirmed");
      setNote("Giao dich da xac nhan, dang cho dong bo trang thai.");
    }

    setStatusUpdatedAt(new Date().toISOString());
  }, [contractId, method]);

  // Polling for status update when in 'confirmed' state
  useEffect(() => {
    let intervalId: NodeJS.Timeout;
    let timeoutId: NodeJS.Timeout;

    if (status === "confirmed") {
      // Bắt đầu polling mỗi 5 giây
      intervalId = setInterval(() => {
        refreshSyncedState();
      }, 5000);

      // Timeout sau 3 phút (180000 ms) nếu vẫn chưa thành công
      timeoutId = setTimeout(() => {
        clearInterval(intervalId);
        setStatus("failed");
        setNote("Đã hết thời gian chờ đồng bộ (3 phút). Vui lòng kiểm tra lại sau hoặc liên hệ hỗ trợ.");
        setStatusUpdatedAt(new Date().toISOString());
      }, 180000);
    }

    return () => {
      if (intervalId) clearInterval(intervalId);
      if (timeoutId) clearTimeout(timeoutId);
    };
  }, [status, refreshSyncedState]);

  const handleStartPayment = useCallback(async () => {
    if (!contract) return;

    if (!canConfirmPayment) {
      toast.info("Buoc dat coc chua kha dung voi trang thai hop dong nay.");
      return;
    }

    setIsSubmitting(true);
    setStatus("pending");
    setStatusUpdatedAt(new Date().toISOString());
    setNote(null);
    trackEvent("payment_started", { contractId: contract.id, method });

    try {
      if (method === "TRADITIONAL") {
        await contractApi.confirmTraditionalDeposit(contract.id);
      } else {
        const cleanTxHash = txHash.trim();
        if (!cleanTxHash) {
          throw new Error("Vui long nhap transaction hash de xac minh blockchain.");
        }
        await contractApi.confirmWeb3Deposit(contract.id, cleanTxHash);
      }

      setStatus("confirmed");
      setStatusUpdatedAt(new Date().toISOString());
      await refreshSyncedState();
      toast.success("Thanh toan da duoc ghi nhan.");
    } catch (error: any) {
      const message =
        error?.response?.data?.message ||
        error?.message ||
        "Khong the hoan tat thanh toan luc nay.";
      setStatus("failed");
      setNote(message);
      setStatusUpdatedAt(new Date().toISOString());
      trackEvent("payment_failed", { contractId: contract.id, method, message });
      toast.error(message);
    } finally {
      setIsSubmitting(false);
    }
  }, [canConfirmPayment, contract, method, refreshSyncedState, txHash]);

  const handleRetry = useCallback(() => {
    setStatus("initiated");
    setNote(null);
    setStatusUpdatedAt(new Date().toISOString());
  }, []);

  if (isLoading || !contract) {
    return <div className="p-4 text-sm text-muted-foreground">Dang tai payment intent...</div>;
  }

  if (!canConfirmPayment && !isAlreadyDeposited) {
    return (
      <div className="mx-auto w-full max-w-3xl space-y-4 px-3 py-4 sm:px-4">
        <RiskNotice
          title="Flow thanh toan khong kha dung"
          description="Hop dong chua san sang de xac nhan dat coc o trang thai hien tai."
        />
        <div>
          <Button type="button" onClick={() => navigate(detailPath)}>
            Mo chi tiet hop dong
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-5xl space-y-6 px-3 py-4 sm:px-4">
      <div className="flex items-center justify-between gap-3">
        <Button type="button" variant="outline" onClick={() => navigate(-1)}>
          <ArrowLeft className="h-4 w-4" />
          Quay lai
        </Button>
      </div>

      <PageHeader
        title="Payment Intent"
        description={`Hop dong #${contract.id} - ${contract.roomName || "Phong thue"}`}
      />

      <div className="grid gap-4 lg:grid-cols-2">
        <PaymentStatusCard
          state={status}
          method={method}
          estimatedConfirmation={estimatedTime}
          note={note}
          txHash={txHash || undefined}
          explorerUrl={runtimeConfig.explorerUrl}
          onRetry={handleRetry}
          onSupport={() => navigate("/contact")}
        />
        <PaymentTimeline state={status} updatedAt={statusUpdatedAt} />
      </div>

      <div className="rounded-2xl border border-border bg-background p-4">
        <h3 className="mb-3 text-sm font-semibold text-foreground">Xac nhan thanh toan</h3>
        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <Label>Phuong thuc</Label>
            <div className="flex gap-2">
              <Button
                type="button"
                variant={method === "TRADITIONAL" ? "default" : "outline"}
                onClick={() => setMethod("TRADITIONAL")}
              >
                Truyen thong
              </Button>
              <Button
                type="button"
                variant={method === "BLOCKCHAIN" ? "default" : "outline"}
                onClick={() => setMethod("BLOCKCHAIN")}
              >
                Blockchain
              </Button>
            </div>
          </div>

          {method === "BLOCKCHAIN" && (
            <div className="space-y-2">
              <Label htmlFor="txHash">Transaction Hash</Label>
              <Input
                id="txHash"
                placeholder="0x..."
                value={txHash}
                onChange={(e) => setTxHash(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">
                Dan transaction hash de he thong dong bo bang chung blockchain.
              </p>
            </div>
          )}
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-2">
          <Button
            type="button"
            isLoading={isSubmitting}
            onClick={handleStartPayment}
            disabled={!canConfirmPayment || isAlreadyDeposited}
          >
            {isAlreadyDeposited ? "Da dat coc" : "Xac nhan thanh toan"}
          </Button>
          <Link
            to={detailPath}
            className="inline-flex items-center gap-1 text-sm font-medium text-primary hover:underline"
          >
            Mo chi tiet hop dong
            <ExternalLink className="h-4 w-4" />
          </Link>
        </div>
      </div>
    </div>
  );
}

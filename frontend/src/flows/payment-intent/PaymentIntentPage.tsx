import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams, useSearchParams } from "react-router-dom";
import { ArrowLeft, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Label } from "@/components/ui/Label";
import { PageHeader } from "@/components/ui/PageHeader";
import { toast } from "sonner";
import { contractApi } from "@/api/contractApi";
import type { Contract, ContractSignMethod } from "@/types";
import { trackEvent } from "@/utils/analytics";
import { useAuth } from "@/context/AuthContext";
import PaymentTimeline from "@/flows/payment-intent/components/PaymentTimeline";
import PaymentStatusCard from "@/flows/payment-intent/components/PaymentStatusCard";
import { type PaymentIntentState } from "@/flows/payment-intent/types";

function resolveEstimatedTime(
  method: ContractSignMethod,
  status: PaymentIntentState
) {
  if (status === "synced") return "Hoàn tất";
  if (status === "pending") return method === "BLOCKCHAIN" ? "1-3 phút" : "Dưới 1 phút";
  return method === "BLOCKCHAIN" ? "2-5 phút" : "Dưới 2 phút";
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
    if (!id || Number.isNaN(contractId)) {
      toast.error("Không tìm thấy hợp đồng");
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
        toast.error(error?.response?.data?.message || "Không tải được thông tin thanh toán");
      } finally {
        if (mounted) setIsLoading(false);
      }
    };

    run();
    return () => {
      mounted = false;
    };
  }, [contractId, fetchContract, id, navigate]);

  const estimatedTime = useMemo(
    () => resolveEstimatedTime(method, status),
    [method, status]
  );

  const refreshSyncedState = useCallback(async () => {
    const res = await contractApi.getDetail(contractId);
    const data = (res as any).data || res;
    setContract(data);
    if (data.depositStatus === "DEPOSITED") {
      setStatus("synced");
      setNote("Thanh toán đã được xác nhận và đồng bộ thành công.");
      trackEvent("payment_success", { contractId, method });
    } else {
      setStatus("confirmed");
      setNote("Giao dịch đã xác nhận, đang chờ đồng bộ trạng thái.");
    }
    setStatusUpdatedAt(new Date().toISOString());
  }, [contractId, method]);

  const handleStartPayment = useCallback(async () => {
    if (!contract) return;
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
          throw new Error("Vui lòng nhập Transaction Hash để xác minh blockchain.");
        }
        await contractApi.confirmWeb3Deposit(contract.id, cleanTxHash);
      }

      setStatus("confirmed");
      setStatusUpdatedAt(new Date().toISOString());
      await refreshSyncedState();
      toast.success("Thanh toán đã được ghi nhận");
    } catch (error: any) {
      const message =
        error?.response?.data?.message ||
        error?.message ||
        "Không thể hoàn tất thanh toán lúc này.";
      setStatus("failed");
      setNote(message);
      setStatusUpdatedAt(new Date().toISOString());
      trackEvent("payment_failed", { contractId: contract.id, method, message });
      toast.error(message);
    } finally {
      setIsSubmitting(false);
    }
  }, [contract, method, refreshSyncedState, txHash]);

  const handleRetry = useCallback(() => {
    setStatus("initiated");
    setNote(null);
    setStatusUpdatedAt(new Date().toISOString());
  }, []);

  if (isLoading || !contract) {
    return <div className="p-4 text-sm text-muted-foreground">Đang tải payment intent...</div>;
  }

  return (
    <div className="mx-auto w-full max-w-5xl space-y-6 px-3 py-4 sm:px-4">
      <div className="flex items-center justify-between gap-3">
        <Button type="button" variant="outline" onClick={() => navigate(-1)}>
          <ArrowLeft className="h-4 w-4" />
          Quay lại
        </Button>
      </div>

      <PageHeader
        title="Payment Intent"
        description={`Hợp đồng #${contract.id} · ${contract.roomName || "Phòng thuê"}`}
      />

      <div className="grid gap-4 lg:grid-cols-2">
        <PaymentStatusCard
          state={status}
          method={method}
          estimatedConfirmation={estimatedTime}
          note={note}
          onRetry={handleRetry}
          onSupport={() => navigate("/contact")}
        />
        <PaymentTimeline state={status} updatedAt={statusUpdatedAt} />
      </div>

      <div className="rounded-2xl border border-border bg-background p-4">
        <h3 className="mb-3 text-sm font-semibold text-foreground">Xác nhận thanh toán</h3>
        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <Label>Phương thức</Label>
            <div className="flex gap-2">
              <Button
                type="button"
                variant={method === "TRADITIONAL" ? "default" : "outline"}
                onClick={() => setMethod("TRADITIONAL")}
              >
                Truyền thống
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
                Dán mã giao dịch để hệ thống đồng bộ bằng chứng blockchain.
              </p>
            </div>
          )}
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-2">
          <Button type="button" isLoading={isSubmitting} onClick={handleStartPayment}>
            Xác nhận thanh toán
          </Button>
          <Link
            to={`${basePath}/contracts/${contract.id}`}
            className="inline-flex items-center gap-1 text-sm font-medium text-primary hover:underline"
          >
            Mở chi tiết hợp đồng
            <ExternalLink className="h-4 w-4" />
          </Link>
        </div>
      </div>
    </div>
  );
}

import { Button } from "@/components/ui/Button";
import { Loader2, Blocks } from "lucide-react";
import type { ContractSignMethod } from "@/types";
import PaymentStatusCard from "@/flows/payment-intent/components/PaymentStatusCard";
import PaymentTimeline from "@/flows/payment-intent/components/PaymentTimeline";
import type { PaymentIntentState } from "@/flows/payment-intent/types";

type ContractSigningStepPaymentProps = {
  method: ContractSignMethod;
  paymentState: PaymentIntentState;
  note: string | null;
  updatedAt: string | null;
  isSubmitting: boolean;
  isDeployPending?: boolean;
  txHash?: string | null;
  explorerUrl?: string;
  onRetry: () => void;
  onSupport: () => void;
  onConfirmQuick: () => Promise<void> | void;
  onOpenPaymentIntent: () => void;
};

function getEstimatedTime(method: ContractSignMethod, paymentState: PaymentIntentState) {
  if (paymentState === "synced") return "Hoan tat";
  if (paymentState === "pending") return method === "BLOCKCHAIN" ? "1-3 phut" : "Duoi 1 phut";
  return method === "BLOCKCHAIN" ? "2-5 phut" : "Duoi 2 phut";
}

export default function ContractSigningStepPayment({
  method,
  paymentState,
  note,
  updatedAt,
  isSubmitting,
  isDeployPending,
  txHash,
  explorerUrl,
  onRetry,
  onSupport,
  onConfirmQuick,
  onOpenPaymentIntent,
}: ContractSigningStepPaymentProps) {
  return (
    <div className="space-y-4">
      {isDeployPending && (
        <div className="relative overflow-hidden rounded-2xl border border-violet-200/60 bg-gradient-to-br from-violet-50 via-white to-indigo-50 p-5 shadow-lg shadow-violet-100/40 animate-in fade-in slide-in-from-top-2 duration-500">
          {/* Animated progress bar at top */}
          <div className="absolute inset-x-0 top-0 h-1 overflow-hidden bg-violet-100">
            <div className="h-full w-1/3 animate-[shimmer_2s_ease-in-out_infinite] rounded-full bg-gradient-to-r from-transparent via-violet-500 to-transparent" />
          </div>

          <div className="flex items-start gap-4">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-violet-500 to-indigo-600 shadow-md shadow-violet-200">
              <Blocks className="h-5 w-5 text-white" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-bold text-violet-900">
                Đang triển khai Smart Contract
              </p>
              <p className="mt-1 text-xs leading-relaxed text-violet-600/90">
                Hệ thống đang deploy hợp đồng lên Blockchain. Quá trình này mất khoảng 30–60 giây. Nút thanh toán sẽ tự mở khi sẵn sàng.
              </p>
              <div className="mt-3 flex items-center gap-2">
                <Loader2 className="h-3.5 w-3.5 animate-spin text-violet-500" />
                <span className="text-[11px] font-semibold tracking-wide text-violet-500">
                  ĐANG XỬ LÝ
                </span>
                <span className="flex gap-0.5">
                  <span className="h-1 w-1 rounded-full bg-violet-400 animate-[pulse_1.4s_ease-in-out_infinite]" />
                  <span className="h-1 w-1 rounded-full bg-violet-400 animate-[pulse_1.4s_ease-in-out_0.2s_infinite]" />
                  <span className="h-1 w-1 rounded-full bg-violet-400 animate-[pulse_1.4s_ease-in-out_0.4s_infinite]" />
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="grid gap-4 lg:grid-cols-2">
        <PaymentStatusCard
          state={paymentState}
          method={method}
          estimatedConfirmation={getEstimatedTime(method, paymentState)}
          note={note}
          txHash={txHash}
          explorerUrl={explorerUrl}
          onRetry={onRetry}
          onSupport={onSupport}
        />
        <PaymentTimeline state={paymentState} updatedAt={updatedAt} />
      </div>

      <div className="flex flex-wrap gap-2">
        <Button
          type="button"
          onClick={onConfirmQuick}
          isLoading={isSubmitting}
          disabled={isDeployPending}
        >
          {isDeployPending ? "Chờ triển khai Smart Contract..." : "Xác nhận nhanh trạng thái cọc"}
        </Button>
        <Button type="button" variant="outline" onClick={onOpenPaymentIntent} disabled={isDeployPending}>
          Mở Payment Intent đầy đủ
        </Button>
      </div>
    </div>
  );
}


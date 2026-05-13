import { Button } from "@/components/ui/Button";
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
  txHash,
  explorerUrl,
  onRetry,
  onSupport,
  onConfirmQuick,
  onOpenPaymentIntent,
}: ContractSigningStepPaymentProps) {
  return (
    <div className="space-y-4">
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
        <Button type="button" onClick={onConfirmQuick} isLoading={isSubmitting}>
          Xac nhan nhanh trang thai coc
        </Button>
        <Button type="button" variant="outline" onClick={onOpenPaymentIntent}>
          Mo Payment Intent day du
        </Button>
      </div>
    </div>
  );
}

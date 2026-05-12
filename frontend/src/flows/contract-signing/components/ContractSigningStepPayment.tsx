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
  onRetry: () => void;
  onSupport: () => void;
  onConfirmQuick: () => Promise<void> | void;
  onOpenPaymentIntent: () => void;
};

function getEstimatedTime(method: ContractSignMethod, paymentState: PaymentIntentState) {
  if (paymentState === "synced") return "Hoàn tất";
  if (paymentState === "pending") return method === "BLOCKCHAIN" ? "1-3 phút" : "Dưới 1 phút";
  return method === "BLOCKCHAIN" ? "2-5 phút" : "Dưới 2 phút";
}

export default function ContractSigningStepPayment({
  method,
  paymentState,
  note,
  updatedAt,
  isSubmitting,
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
          onRetry={onRetry}
          onSupport={onSupport}
        />
        <PaymentTimeline state={paymentState} updatedAt={updatedAt} />
      </div>

      <div className="flex flex-wrap gap-2">
        <Button type="button" onClick={onConfirmQuick} isLoading={isSubmitting}>
          Xác nhận nhanh trạng thái cọc
        </Button>
        <Button type="button" variant="outline" onClick={onOpenPaymentIntent}>
          Mở Payment Intent đầy đủ
        </Button>
      </div>
    </div>
  );
}


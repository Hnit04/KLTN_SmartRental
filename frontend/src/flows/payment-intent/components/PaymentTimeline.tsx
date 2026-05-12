import { CheckCircle2, Circle, Clock3, XCircle } from "lucide-react";
import { cn } from "@/utils/cn";
import {
  getPaymentIntentLabel,
  type PaymentIntentState,
} from "@/flows/payment-intent/types";

type PaymentTimelineProps = {
  state: PaymentIntentState;
  updatedAt?: string | null;
};

const FLOW: Exclude<PaymentIntentState, "failed">[] = [
  "initiated",
  "pending",
  "confirmed",
  "synced",
];

function getStateOrder(state: PaymentIntentState) {
  return FLOW.indexOf(state as Exclude<PaymentIntentState, "failed">);
}

export default function PaymentTimeline({ state, updatedAt }: PaymentTimelineProps) {
  const activeOrder = getStateOrder(state);
  const isFailed = state === "failed";

  return (
    <div className="rounded-2xl border border-border bg-background p-4">
      <div className="mb-4 flex items-center justify-between">
        <h3 className="text-sm font-semibold text-foreground">Payment Timeline</h3>
        <p className="text-xs text-muted-foreground">
          Cập nhật: {updatedAt ? new Date(updatedAt).toLocaleString("vi-VN") : "Vừa xong"}
        </p>
      </div>

      <div className="space-y-3">
        {FLOW.map((step, index) => {
          const done = !isFailed && index < activeOrder;
          const current = !isFailed && index === activeOrder;
          const icon = done ? (
            <CheckCircle2 className="h-4 w-4 text-emerald-600" />
          ) : current ? (
            <Clock3 className="h-4 w-4 text-primary" />
          ) : (
            <Circle className="h-4 w-4 text-muted-foreground/60" />
          );

          return (
            <div key={step} className="flex items-center gap-3">
              {icon}
              <div className="min-w-0">
                <p
                  className={cn(
                    "text-sm",
                    done || current ? "text-foreground font-medium" : "text-muted-foreground"
                  )}
                >
                  {getPaymentIntentLabel(step)}
                </p>
              </div>
            </div>
          );
        })}

        {isFailed && (
          <div className="mt-2 flex items-center gap-3 rounded-xl border border-red-200 bg-red-50 p-3">
            <XCircle className="h-4 w-4 text-red-600" />
            <p className="text-sm font-medium text-red-700">{getPaymentIntentLabel("failed")}</p>
          </div>
        )}
      </div>
    </div>
  );
}


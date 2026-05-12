import { AlertTriangle, LifeBuoy, RefreshCw, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/Button";
import StatusBadge from "@/components/shared/StatusBadge";
import { cn } from "@/utils/cn";
import {
  getPaymentIntentLabel,
  type PaymentIntentState,
} from "@/flows/payment-intent/types";

type PaymentStatusCardProps = {
  state: PaymentIntentState;
  method: "TRADITIONAL" | "BLOCKCHAIN";
  estimatedConfirmation: string;
  note?: string | null;
  onRetry?: () => void;
  onSupport?: () => void;
};

function getTone(state: PaymentIntentState): "success" | "warning" | "danger" | "neutral" | "info" {
  switch (state) {
    case "synced":
      return "success";
    case "pending":
      return "warning";
    case "failed":
      return "danger";
    case "confirmed":
      return "info";
    default:
      return "neutral";
  }
}

export default function PaymentStatusCard({
  state,
  method,
  estimatedConfirmation,
  note,
  onRetry,
  onSupport,
}: PaymentStatusCardProps) {
  const isFailed = state === "failed";
  const isSynced = state === "synced";

  return (
    <div
      className={cn(
        "rounded-2xl border p-4",
        isFailed
          ? "border-red-200 bg-red-50"
          : isSynced
            ? "border-emerald-200 bg-emerald-50"
            : "border-border bg-background"
      )}
    >
      <div className="mb-3 flex items-center justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Payment Intent
          </p>
          <h3 className="truncate text-base font-bold text-foreground">
            {method === "BLOCKCHAIN" ? "Thanh toán blockchain" : "Thanh toán truyền thống"}
          </h3>
        </div>
        <StatusBadge label={getPaymentIntentLabel(state)} tone={getTone(state)} />
      </div>

      <div className="space-y-2 text-sm">
        <p className="flex items-center gap-2 text-muted-foreground">
          <ShieldCheck className="h-4 w-4 text-emerald-600" />
          Thời gian xác nhận ước tính: <span className="font-semibold text-foreground">{estimatedConfirmation}</span>
        </p>
        {note && (
          <p className="flex items-start gap-2 text-muted-foreground">
            <AlertTriangle className="mt-0.5 h-4 w-4 text-amber-600" />
            <span>{note}</span>
          </p>
        )}
      </div>

      {(isFailed || !isSynced) && (
        <div className="mt-4 flex flex-wrap gap-2">
          {onRetry && (
            <Button type="button" variant="outline" onClick={onRetry}>
              <RefreshCw className="h-4 w-4" />
              Thử lại
            </Button>
          )}
          {onSupport && (
            <Button type="button" variant="ghost" onClick={onSupport}>
              <LifeBuoy className="h-4 w-4" />
              Liên hệ hỗ trợ
            </Button>
          )}
        </div>
      )}
    </div>
  );
}


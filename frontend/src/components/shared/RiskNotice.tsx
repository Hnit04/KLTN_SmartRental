import { AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/Button";

type RiskNoticeProps = {
  title?: string;
  description: string;
  onRetry?: () => void;
  retryLabel?: string;
};

export default function RiskNotice({
  title = "Rủi ro cấu hình blockchain",
  description,
  onRetry,
  retryLabel = "Thử lại",
}: RiskNoticeProps) {
  return (
    <div
      role="alert"
      className="rounded-xl border border-amber-300 bg-amber-50 p-4 text-amber-900"
    >
      <div className="flex items-start gap-3">
        <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-amber-600" />
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold">{title}</p>
          <p className="mt-1 text-sm leading-relaxed text-amber-900/90">{description}</p>
          {onRetry && (
            <Button
              type="button"
              variant="outline"
              className="mt-3 h-9 border-amber-300 bg-white text-amber-800 hover:bg-amber-100"
              onClick={onRetry}
            >
              {retryLabel}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}


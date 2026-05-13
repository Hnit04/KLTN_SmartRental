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
      className="rounded-xl border border-warning/35 bg-warning/10 p-4 text-foreground"
    >
      <div className="flex items-start gap-3">
        <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-warning" />
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold">{title}</p>
          <p className="mt-1 text-sm leading-relaxed text-muted-foreground">{description}</p>
          {onRetry && (
            <Button
              type="button"
              variant="outline"
              className="mt-3 h-9 border-warning/35 bg-background text-foreground hover:bg-warning/10"
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

import { Sparkles } from "lucide-react";
import { Button } from "@/components/ui/Button";

type AIExplainCardProps = {
  reason: string;
  confidence: number;
  keyFactors: string[];
  editableHint?: string;
  onAdjust?: () => void;
};

function normalizeConfidence(value: number) {
  if (value <= 1) return Math.max(0, Math.min(1, value)) * 100;
  return Math.max(0, Math.min(100, value));
}

export default function AIExplainCard({
  reason,
  confidence,
  keyFactors,
  editableHint = "Bạn có thể chỉnh lại trước khi áp dụng.",
  onAdjust,
}: AIExplainCardProps) {
  const confidencePercent = Math.round(normalizeConfidence(confidence));

  return (
    <div className="rounded-2xl border border-primary/15 bg-primary/[0.03] p-4">
      <div className="mb-3 flex items-center gap-2">
        <Sparkles className="h-4 w-4 text-primary" />
        <h3 className="text-sm font-semibold text-foreground">AI Explainability</h3>
      </div>

      <div className="space-y-3 text-sm">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Vì sao phù hợp
          </p>
          <p className="mt-1 text-foreground">{reason}</p>
        </div>

        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Confidence
          </p>
          <div className="mt-1 flex items-center gap-2">
            <div className="h-2 flex-1 overflow-hidden rounded-full bg-muted">
              <div
                className="h-full rounded-full bg-primary transition-all duration-300"
                style={{ width: `${confidencePercent}%` }}
              />
            </div>
            <span className="text-xs font-semibold text-primary">{confidencePercent}%</span>
          </div>
        </div>

        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Yếu tố chính
          </p>
          <ul className="mt-1 space-y-1 text-foreground">
            {keyFactors.map((factor) => (
              <li key={factor} className="text-sm">
                • {factor}
              </li>
            ))}
          </ul>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-border bg-background p-3">
          <p className="text-xs text-muted-foreground">{editableHint}</p>
          {onAdjust && (
            <Button type="button" variant="outline" size="sm" onClick={onAdjust}>
              Bạn có thể chỉnh
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}


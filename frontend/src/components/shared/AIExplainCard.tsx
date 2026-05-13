import { Sparkles, SlidersHorizontal } from "lucide-react";
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
  editableHint = "Ban co the chinh lai truoc khi ap dung.",
  onAdjust,
}: AIExplainCardProps) {
  const confidencePercent = Math.round(normalizeConfidence(confidence));

  return (
    <section className="rounded-2xl border border-trust/25 bg-trust/5 p-4">
      <div className="mb-3 flex items-center gap-2">
        <Sparkles className="h-4 w-4 text-trust" />
        <h3 className="text-sm font-semibold text-foreground">AI Explainability</h3>
      </div>

      <div className="space-y-4 text-sm">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Vi sao phu hop</p>
          <p className="mt-1 text-foreground">{reason}</p>
        </div>

        <div>
          <div className="mb-1 flex items-center justify-between gap-2">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Confidence</p>
            <span className="text-xs font-semibold text-trust">{confidencePercent}%</span>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-muted">
            <div
              className="h-full rounded-full bg-trust transition-all duration-page"
              style={{ width: `${confidencePercent}%` }}
            />
          </div>
        </div>

        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Yeu to chinh</p>
          <ul className="mt-1 space-y-1">
            {keyFactors.map((factor) => (
              <li key={factor} className="flex items-start gap-2 text-foreground">
                <span className="mt-1.5 inline-block h-1.5 w-1.5 rounded-full bg-trust" />
                <span>{factor}</span>
              </li>
            ))}
          </ul>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-border/70 bg-card p-3">
          <p className="text-xs text-muted-foreground">{editableHint}</p>
          {onAdjust && (
            <Button type="button" variant="outline" size="sm" onClick={onAdjust}>
              <SlidersHorizontal className="h-3.5 w-3.5" />
              Ban co the chinh
            </Button>
          )}
        </div>
      </div>
    </section>
  );
}

import type { ReactNode } from "react";
import { cn } from "@/utils/cn";

export type SummaryStripItem = {
  id: string;
  label: string;
  value: ReactNode;
  subline?: string;
  tone?: "default" | "warning" | "danger" | "success" | "muted";
};

type StatusSummaryStripProps = {
  items: SummaryStripItem[];
  className?: string;
};

const valueTone: Record<NonNullable<SummaryStripItem["tone"]>, string> = {
  default: "text-foreground",
  muted: "text-muted-foreground",
  warning: "text-amber-800",
  danger: "text-destructive",
  success: "text-emerald-800",
};

/**
 * Dải chỉ số vận hành — cuộn ngang trên mobile, quét nhanh trên desktop.
 */
export function StatusSummaryStrip({ items, className }: StatusSummaryStripProps) {
  if (!items.length) return null;

  return (
    <div
      className={cn(
        "flex gap-2 overflow-x-auto pb-1 [-ms-overflow-style:none] [scrollbar-width:none] sm:flex-wrap sm:gap-3 sm:overflow-visible [&::-webkit-scrollbar]:hidden",
        className
      )}
    >
      {items.map((item) => (
        <div
          key={item.id}
          className="min-w-[140px] shrink-0 rounded-xl border border-border/60 bg-muted/[0.15] px-3 py-2.5 sm:min-w-0 sm:flex-1 sm:px-3.5 sm:py-3"
        >
          <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">{item.label}</p>
          <p className={cn("mt-0.5 truncate text-sm font-semibold tabular-nums", valueTone[item.tone ?? "default"])}>
            {item.value}
          </p>
          {item.subline ? <p className="mt-0.5 truncate text-[11px] text-muted-foreground">{item.subline}</p> : null}
        </div>
      ))}
    </div>
  );
}

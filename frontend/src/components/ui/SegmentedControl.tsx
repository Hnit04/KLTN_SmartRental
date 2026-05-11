import type { ReactNode } from "react";
import { cn } from "@/utils/cn";

export type SegmentItem = { id: string; label: ReactNode; badge?: ReactNode };

type SegmentedControlProps = {
  items: SegmentItem[];
  value: string;
  onChange: (id: string) => void;
  className?: string;
  "aria-label"?: string;
};

/**
 * Tab dạng phân đoạn (Linear / iOS settings) — touch-friendly.
 */
export function SegmentedControl({ items, value, onChange, className, "aria-label": ariaLabel }: SegmentedControlProps) {
  return (
    <div
      className={cn(
        "inline-flex w-full flex-wrap gap-1 rounded-xl border border-border/60 bg-muted/40 p-1 sm:w-auto",
        className
      )}
      role="tablist"
      aria-label={ariaLabel}
    >
      {items.map((item) => {
        const active = value === item.id;
        return (
          <button
            key={item.id}
            type="button"
            role="tab"
            aria-selected={active}
            onClick={() => onChange(item.id)}
            className={cn(
              "flex min-h-11 min-w-0 flex-1 items-center justify-center gap-2 rounded-lg px-3 py-2.5 text-sm font-semibold transition-all duration-200 sm:flex-none sm:px-4",
              active
                ? "bg-card text-foreground shadow-sm ring-1 ring-border/70"
                : "text-muted-foreground hover:bg-muted/60 hover:text-foreground"
            )}
          >
            <span className="truncate">{item.label}</span>
            {item.badge}
          </button>
        );
      })}
    </div>
  );
}

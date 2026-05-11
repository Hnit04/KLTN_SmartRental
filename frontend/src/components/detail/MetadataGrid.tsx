import type { ReactNode } from "react";
import { cn } from "@/utils/cn";

export type MetadataItem = {
  label: string;
  value: ReactNode;
  hint?: string;
  /** Nổi bật giá trị (số tiền, hạn quan trọng) */
  emphasize?: boolean;
};

type MetadataGridProps = {
  items: MetadataItem[];
  columns?: 2 | 3;
  className?: string;
};

/**
 * Lưới metadata đọc nhanh — nhãn nhỏ, giá trị rõ, gợi ý tùy chọn.
 */
export function MetadataGrid({ items, columns = 2, className }: MetadataGridProps) {
  return (
    <dl
      className={cn(
        "grid gap-3 sm:gap-4",
        columns === 2 && "sm:grid-cols-2",
        columns === 3 && "sm:grid-cols-2 lg:grid-cols-3",
        className
      )}
    >
      {items.map((item, idx) => (
        <div
          key={`${item.label}-${idx}`}
          className="rounded-xl border border-border/50 bg-muted/[0.12] px-3 py-2.5 sm:px-3.5 sm:py-3"
        >
          <dt className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">{item.label}</dt>
          <dd
            className={cn(
              "mt-1 break-words text-sm text-foreground",
              item.emphasize && "text-base font-semibold tabular-nums tracking-tight"
            )}
          >
            {item.value}
          </dd>
          {item.hint ? <p className="mt-1 text-[11px] leading-snug text-muted-foreground">{item.hint}</p> : null}
        </div>
      ))}
    </dl>
  );
}

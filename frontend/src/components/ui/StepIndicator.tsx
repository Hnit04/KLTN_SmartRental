import { cn } from "@/utils/cn";
import { Check } from "lucide-react";

export type StepDef = { title: string; description?: string };

type Props = {
  steps: StepDef[];
  current: number;
  className?: string;
};

/**
 * Thanh bước ngang — gọn, dùng cho form dài (mobile: chỉ số + tiêu đề rút gọn).
 */
export function StepIndicator({ steps, current, className }: Props) {
  return (
    <nav aria-label="Tiến trình" className={cn("w-full", className)}>
      <ol className="flex flex-wrap items-center gap-1.5 sm:gap-2">
        {steps.map((s, i) => {
          const n = i + 1;
          const isActive = n === current;
          const isDone = n < current;
          return (
            <li key={s.title} className="flex min-w-0 items-center gap-1.5 sm:gap-2">
              {i > 0 && (
                <span
                  className={cn(
                    "mx-0.5 hidden h-px w-4 shrink-0 sm:block",
                    isDone ? "bg-primary/40" : "bg-border"
                  )}
                  aria-hidden
                />
              )}
              <span
                className={cn(
                  "inline-flex max-w-full items-center gap-1.5 rounded-full border px-2 py-1 text-[11px] font-semibold sm:gap-2 sm:px-3 sm:py-1.5 sm:text-xs",
                  isActive && "border-primary/40 bg-primary/10 text-primary shadow-sm",
                  isDone && "border-emerald-200/80 bg-emerald-50/90 text-emerald-900",
                  !isActive && !isDone && "border-border/80 bg-muted/40 text-muted-foreground"
                )}
              >
                <span
                  className={cn(
                    "flex h-5 w-5 shrink-0 items-center justify-center rounded-full border text-[10px] font-bold sm:h-6 sm:w-6 sm:text-[11px]",
                    isActive && "border-primary/50 bg-background text-primary",
                    isDone && "border-emerald-300 bg-emerald-100 text-emerald-700",
                    !isActive && !isDone && "border-muted-foreground/20 bg-background text-muted-foreground"
                  )}
                >
                  {isDone ? <Check className="h-3 w-3 sm:h-3.5 sm:w-3.5" strokeWidth={3} /> : n}
                </span>
                <span className="truncate sm:max-w-[10rem]">{s.title}</span>
              </span>
            </li>
          );
        })}
      </ol>
    </nav>
  );
}

import { cn } from "@/utils/cn";

export type OperationalTimelineEvent = {
  id: string;
  at: string;
  title: string;
  detail?: string;
  tone?: "default" | "warning" | "danger" | "success" | "muted";
};

type OperationalTimelineProps = {
  events: OperationalTimelineEvent[];
  title?: string;
  description?: string;
  emptyHint?: string;
  className?: string;
};

const dotTone: Record<NonNullable<OperationalTimelineEvent["tone"]>, string> = {
  default: "border-border/80 bg-muted-foreground/35",
  muted: "border-border/60 bg-muted-foreground/25",
  warning: "border-amber-500/50 bg-amber-500",
  danger: "border-destructive/50 bg-destructive",
  success: "border-emerald-500/50 bg-emerald-600",
};

/**
 * Trục thời gian gọn — mốc hợp đồng + thay đổi / hoạt động.
 */
export function OperationalTimeline({
  events,
  title = "Diễn biến & mốc quan trọng",
  description,
  emptyHint = "Chưa có mốc hoặc đề xuất để hiển thị.",
  className,
}: OperationalTimelineProps) {
  const sorted = [...events].sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime()).slice(0, 8);

  return (
    <div className={cn("rounded-2xl border border-border/70 bg-card/80 p-4 shadow-soft sm:p-5", className)}>
      <div className="mb-3">
        <h2 className="text-sm font-semibold text-foreground">{title}</h2>
        {description ? <p className="mt-0.5 text-xs text-muted-foreground">{description}</p> : null}
      </div>

      {sorted.length === 0 ? (
        <p className="rounded-lg border border-dashed border-border/70 bg-muted/20 px-3 py-6 text-center text-xs text-muted-foreground">{emptyHint}</p>
      ) : (
        <ul className="relative space-y-0 pl-1">
          {sorted.map((ev, i) => (
            <li key={ev.id} className="relative flex gap-3 pb-4 last:pb-0">
              {i < sorted.length - 1 ? (
                <span className="absolute left-[7px] top-4 h-[calc(100%-2px)] w-px bg-border/80" aria-hidden />
              ) : null}
              <span
                className={cn(
                  "relative z-[1] mt-1 flex h-2.5 w-2.5 shrink-0 rounded-full border-2",
                  dotTone[ev.tone ?? "default"]
                )}
                aria-hidden
              />
              <div className="min-w-0 flex-1 pt-0.5">
                <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                  {new Date(ev.at).toLocaleString("vi-VN", {
                    day: "2-digit",
                    month: "2-digit",
                    year: "numeric",
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </p>
                <p className="text-sm font-semibold text-foreground">{ev.title}</p>
                {ev.detail ? <p className="mt-0.5 text-xs leading-relaxed text-muted-foreground">{ev.detail}</p> : null}
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

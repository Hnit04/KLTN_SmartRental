import type { ReactNode } from "react";
import { cn } from "@/utils/cn";

type DashboardPanelProps = {
  title: string;
  description?: string;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
};

/**
 * Khối nội dung dashboard (tiêu đề + vùng body) — nhất quán với section-card.
 */
export function DashboardPanel({ title, description, action, children, className }: DashboardPanelProps) {
  return (
    <section
      className={cn(
        "flex min-h-0 flex-col overflow-hidden rounded-2xl border border-border/80 bg-card shadow-soft",
        className
      )}
    >
      <div
        className="flex flex-col gap-1 border-b border-border/60 bg-muted/[0.15] px-4 py-3 sm:flex-row sm:items-center sm:justify-between sm:gap-3 sm:px-5 sm:py-4"
      >
        <div className="min-w-0">
          <h2 className="text-base font-semibold tracking-tight text-foreground">{title}</h2>
          {description ? <p className="mt-0.5 text-xs text-muted-foreground">{description}</p> : null}
        </div>
        {action ? <div className="shrink-0 pt-1 sm:pt-0">{action}</div> : null}
      </div>
      <div className="min-h-0 flex-1">{children}</div>
    </section>
  );
}

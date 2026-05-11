import type { ReactNode } from "react";
import { cn } from "@/utils/cn";

type DetailSectionProps = {
  title: string;
  description?: string;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
};

/**
 * Khối nội dung chi tiết chuẩn SaaS — tiêu đề rõ, hành động phụ tách bạch.
 */
export function DetailSection({ title, description, action, children, className }: DetailSectionProps) {
  return (
    <section className={cn("rounded-2xl border border-border/70 bg-card p-4 shadow-soft transition-shadow duration-300 hover:shadow-card sm:p-5", className)}>
      <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between sm:gap-3">
        <div className="min-w-0">
          <h2 className="text-sm font-semibold tracking-tight text-foreground">{title}</h2>
          {description ? <p className="mt-0.5 text-xs leading-relaxed text-muted-foreground">{description}</p> : null}
        </div>
        {action ? <div className="flex shrink-0 flex-wrap gap-2">{action}</div> : null}
      </div>
      {children}
    </section>
  );
}

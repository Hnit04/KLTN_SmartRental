import type { ReactNode } from "react";
import { cn } from "@/utils/cn";

type PageHeaderProps = {
  title: string;
  description?: string;
  actions?: ReactNode;
  className?: string;
};

/**
 * Tiêu đề trang thống nhất (SaaS) — hierarchy rõ, spacing chuẩn.
 */
export function PageHeader({ title, description, actions, className }: PageHeaderProps) {
  return (
    <div
      className={cn(
        "mb-6 flex flex-col gap-3 border-b border-border/60 pb-5 sm:mb-8 sm:flex-row sm:items-end sm:justify-between sm:pb-6 animate-fade-in-up",
        className
      )}
    >
      <div className="min-w-0 space-y-1">
        <h1 className="page-title">{title}</h1>
        {description ? <p className="page-subtitle max-w-2xl">{description}</p> : null}
      </div>
      {actions ? <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div> : null}
    </div>
  );
}

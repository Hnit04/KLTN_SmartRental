import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";
import { cn } from "@/utils/cn";

export type AttentionTone = "info" | "warning" | "danger" | "success";

type AttentionBannerProps = {
  tone: AttentionTone;
  title: string;
  description?: string;
  icon?: LucideIcon;
  children?: ReactNode;
  className?: string;
};

const toneClass: Record<AttentionTone, string> = {
  info: "border-primary/25 bg-primary/[0.06] text-foreground",
  warning: "border-amber-500/35 bg-amber-500/[0.08] text-amber-950",
  danger: "border-destructive/35 bg-destructive/[0.06] text-destructive",
  success: "border-emerald-500/30 bg-emerald-500/[0.07] text-emerald-950",
};

const iconWrap: Record<AttentionTone, string> = {
  info: "border-primary/20 bg-primary/10 text-primary",
  warning: "border-amber-500/30 bg-amber-500/15 text-amber-800",
  danger: "border-destructive/25 bg-destructive/10 text-destructive",
  success: "border-emerald-500/25 bg-emerald-500/10 text-emerald-800",
};

/**
 * Cảnh báo / chú ý vận hành — ưu tiên hành động, không chen lấn với EmptyState.
 */
export function AttentionBanner({ tone, title, description, icon: Icon, children, className }: AttentionBannerProps) {
  return (
    <div
      role="status"
      className={cn(
        "flex gap-3 rounded-xl border px-4 py-3 text-sm shadow-xs transition-colors sm:items-start sm:gap-3.5 sm:px-4 sm:py-3.5",
        toneClass[tone],
        className
      )}
    >
      {Icon ? (
        <div className={cn("mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border", iconWrap[tone])}>
          <Icon className="h-4 w-4" strokeWidth={2} />
        </div>
      ) : null}
      <div className="min-w-0 flex-1">
        <p className="font-semibold leading-snug">{title}</p>
        {description ? <p className="mt-1 text-xs leading-relaxed opacity-90">{description}</p> : null}
        {children ? <div className="mt-2">{children}</div> : null}
      </div>
    </div>
  );
}

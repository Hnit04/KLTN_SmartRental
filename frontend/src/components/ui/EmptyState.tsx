import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";
import { cn } from "@/utils/cn";

type EmptyStateProps = {
  icon?: LucideIcon;
  title: string;
  description?: string;
  action?: ReactNode;
  className?: string;
};

export function EmptyState({ icon: Icon, title, description, action, className }: EmptyStateProps) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center rounded-3xl border border-dashed border-primary/20 bg-primary/5 px-6 py-14 text-center animate-in fade-in duration-500",
        className
      )}
    >
      {Icon ? (
        <div className="mb-5 flex h-16 w-16 items-center justify-center rounded-2xl bg-background text-primary shadow-sm border border-border/40">
          <Icon className="h-8 w-8" strokeWidth={1.5} />
        </div>
      ) : null}
      <h3 className="text-lg font-bold text-foreground">{title}</h3>
      {description ? <p className="mt-2 max-w-sm text-sm leading-relaxed text-muted-foreground">{description}</p> : null}
      {action ? <div className="mt-6">{action}</div> : null}
    </div>
  );
}

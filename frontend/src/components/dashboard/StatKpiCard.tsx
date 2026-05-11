import { Link } from "react-router-dom";
import type { ReactNode } from "react";
import { cn } from "@/utils/cn";

export type StatKpiCardProps = {
  /** Nếu có — cả thẻ là liên kết (điều hướng nhanh). */
  to?: string;
  icon: ReactNode;
  iconClassName?: string;
  label: string;
  value: ReactNode;
  description?: ReactNode;
  /** Ví dụ thanh tiến độ, sparkline… */
  footer?: ReactNode;
  badge?: ReactNode;
  className?: string;
};

/**
 * Thẻ KPI dùng chung cho Admin / Landlord / Tenant — border mềm, hover tinh tế.
 */
export function StatKpiCard({
  to,
  icon,
  iconClassName,
  label,
  value,
  description,
  footer,
  badge,
  className,
}: StatKpiCardProps) {
  const body = (
    <>
      <div className="flex items-start justify-between gap-2">
        <div
          className={cn(
            "flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-primary/5 text-primary transition-transform duration-300 group-hover:scale-110 group-hover:-rotate-3",
            iconClassName
          )}
        >
          {icon}
        </div>
        {badge ? <div className="max-w-[55%] shrink-0 text-right text-[10px] font-semibold leading-tight">{badge}</div> : null}
      </div>
      <div className="mt-5 text-3xl font-extrabold tabular-nums tracking-tight text-foreground">{value}</div>
      <p className="mt-1.5 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">{label}</p>
      {description ? (
        <div className="mt-3 text-xs font-medium text-muted-foreground/80">{description}</div>
      ) : null}
      {footer ? <div className="mt-3">{footer}</div> : null}
    </>
  );

  const shell = cn(
    "group rounded-2xl border border-border/80 bg-card p-5 shadow-soft transition-all duration-200 hover:border-primary/20 hover:shadow-card hover:-translate-y-0.5",
    to && "block cursor-pointer active:scale-[0.98] active:duration-75 motion-reduce:transition-none motion-reduce:active:scale-100",
    className
  );

  if (to) {
    return (
      <Link to={to} className={shell}>
        {body}
      </Link>
    );
  }
  return <div className={shell}>{body}</div>;
}

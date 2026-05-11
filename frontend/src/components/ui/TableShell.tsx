import type { ReactNode } from "react";
import { cn } from "@/utils/cn";

type TableShellProps = {
  children: ReactNode;
  className?: string;
  /** Giữ thead dính khi cuộn trong khung (overflow-x-auto). */
  stickyHeader?: boolean;
};

/**
 * Vỏ bảng chuẩn SaaS: viền mềm, shadow nhẹ, overflow an toàn mobile.
 */
export function TableShell({ children, className, stickyHeader = true }: TableShellProps) {
  return (
    <div
      className={cn(
        "overflow-x-auto rounded-xl border border-border/80 bg-card shadow-xs",
        stickyHeader &&
          "[&_thead]:sticky [&_thead]:top-0 [&_thead]:z-[1] [&_thead_tr]:bg-muted/95 [&_thead_th]:backdrop-blur-sm",
        className
      )}
    >
      {children}
    </div>
  );
}

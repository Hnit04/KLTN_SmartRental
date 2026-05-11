import { Skeleton } from "@/components/ui/Skeleton";

/**
 * Trạng thái tải ban đầu (route bảo vệ) — branded skeleton thay vì chữ trần.
 */
export default function PageLoader() {
  return (
    <div className="flex min-h-[100dvh] flex-col items-center justify-center bg-background px-4">
      <div className="w-full max-w-md space-y-4 animate-fade-in-up">
        {/* Branded icon */}
        <div className="flex justify-center">
          <div className="relative h-14 w-14 rounded-2xl bg-primary/10 flex items-center justify-center">
            <div className="h-7 w-7 rounded-lg bg-primary/80" style={{ animation: 'subtle-pulse 1.5s ease-in-out infinite' }} />
            <div className="absolute inset-0 rounded-2xl border-2 border-primary/20" style={{ animation: 'subtle-pulse 2s ease-in-out infinite' }} />
          </div>
        </div>
        <Skeleton className="mx-auto h-4 w-48 rounded-md skeleton-shimmer" />
        <Skeleton className="mx-auto h-3 w-64 rounded-md opacity-70 skeleton-shimmer" />
        <div className="space-y-2 pt-4">
          <Skeleton className="h-10 w-full rounded-lg skeleton-shimmer" />
          <Skeleton className="h-10 w-full rounded-lg opacity-80 skeleton-shimmer" />
          <Skeleton className="h-10 w-3/4 rounded-lg opacity-60 skeleton-shimmer" />
        </div>
      </div>
      <p className="mt-8 text-xs font-medium text-muted-foreground" style={{ animation: 'subtle-pulse 2s ease-in-out infinite' }}>
        Đang tải…
      </p>
    </div>
  );
}

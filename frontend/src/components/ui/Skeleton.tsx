import * as React from "react";
import { cn } from "@/utils/cn";

interface SkeletonProps extends React.HTMLAttributes<HTMLDivElement> {}

const Skeleton = React.forwardRef<HTMLDivElement, SkeletonProps>(
  ({ className, ...props }, ref) => (
    <div
      ref={ref}
      className={cn("rounded-md bg-muted skeleton-shimmer motion-reduce:animate-pulse", className)}
      {...props}
    />
  )
);
Skeleton.displayName = "Skeleton";

export { Skeleton };
import { AlertTriangle, RefreshCw } from "lucide-react";
import { cn } from "@/utils/cn";
import { Button } from "./Button";

type ErrorStateProps = {
  title?: string;
  description?: string;
  onRetry?: () => void;
  className?: string;
};

export function ErrorState({ 
  title = "Đã xảy ra lỗi", 
  description = "Không thể tải dữ liệu lúc này. Vui lòng thử lại sau.", 
  onRetry, 
  className 
}: ErrorStateProps) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center rounded-3xl border border-dashed border-red-500/20 bg-red-500/5 px-6 py-14 text-center animate-in fade-in duration-500",
        className
      )}
    >
      <div className="mb-5 flex h-16 w-16 items-center justify-center rounded-2xl bg-background text-red-500 shadow-sm border border-red-200">
        <AlertTriangle className="h-8 w-8" strokeWidth={1.5} />
      </div>
      
      <h3 className="text-lg font-bold text-foreground">{title}</h3>
      
      {description ? (
        <p className="mt-2 max-w-sm text-sm leading-relaxed text-muted-foreground">{description}</p>
      ) : null}
      
      {onRetry ? (
        <div className="mt-6">
          <Button variant="outline" onClick={onRetry} className="border-red-200 hover:bg-red-50 text-red-700">
            <RefreshCw className="mr-2 h-4 w-4" />
            Thử lại
          </Button>
        </div>
      ) : null}
    </div>
  );
}

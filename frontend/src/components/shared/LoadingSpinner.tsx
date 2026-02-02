import { Loader2 } from "lucide-react";

export default function LoadingSpinner() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[400px] text-muted-foreground">
      <Loader2 className="h-10 w-10 animate-spin mb-2 text-primary" />
      <p>Đang tải dữ liệu...</p>
    </div>
  );
}
import { Blocks, CheckCircle2 } from "lucide-react";
import { cn } from "@/utils/cn";

type BlockchainCardProps = {
  selected: boolean;
  onClick: () => void;
};

export default function BlockchainCard({ selected, onClick }: BlockchainCardProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "w-full rounded-2xl border p-4 text-left transition-all duration-200",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
        selected
          ? "border-teal-500 bg-teal-50/70 shadow-sm"
          : "border-border bg-background hover:border-teal-400 hover:bg-muted/30"
      )}
      aria-pressed={selected}
    >
      <div className="mb-2 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Blocks className="h-4 w-4 text-teal-700" />
          <p className="text-sm font-semibold text-foreground">Ký bằng blockchain</p>
        </div>
      </div>
      <p className="text-xs text-muted-foreground">Có bằng chứng chống chỉnh sửa</p>
      {selected && (
        <div className="mt-3 inline-flex items-center gap-1 rounded-full bg-teal-100 px-2 py-1 text-[10px] font-semibold text-teal-700">
          <CheckCircle2 className="h-3.5 w-3.5" />
          Đang chọn
        </div>
      )}
    </button>
  );
}

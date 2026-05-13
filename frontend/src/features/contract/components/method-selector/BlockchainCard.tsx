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
        "h-full w-full rounded-2xl border p-4 text-left transition-all duration-hover",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
        selected
          ? "border-trust bg-trust/10 shadow-sm"
          : "border-surface-2 bg-background hover:border-trust/70 hover:bg-muted/30"
      )}
      aria-pressed={selected}
    >
      <div className="mb-2 flex flex-wrap items-start justify-between gap-2">
        <div className="flex min-w-0 items-start gap-2">
          <Blocks className="h-4 w-4 text-trust" />
          <p className="text-sm font-semibold leading-5 text-foreground">Ky bang blockchain</p>
        </div>
      </div>
      <p className="text-xs text-muted-foreground">Co bang chung chong chinh sua</p>
      {selected && (
        <div className="mt-3 inline-flex items-center gap-1 rounded-full bg-trust/15 px-2 py-1 text-[10px] font-semibold text-trust">
          <CheckCircle2 className="h-3.5 w-3.5" />
          Dang chon
        </div>
      )}
    </button>
  );
}

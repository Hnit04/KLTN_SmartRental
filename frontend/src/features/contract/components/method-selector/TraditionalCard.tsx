import { CheckCircle2, ShieldCheck } from "lucide-react";
import { cn } from "@/utils/cn";

type TraditionalCardProps = {
  selected: boolean;
  onClick: () => void;
};

export default function TraditionalCard({ selected, onClick }: TraditionalCardProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "h-full w-full rounded-2xl border p-4 text-left transition-all duration-hover",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
        selected
          ? "border-primary bg-primary/5 shadow-sm"
          : "border-surface-2 bg-background hover:border-primary/40 hover:bg-muted/30"
      )}
      aria-pressed={selected}
    >
      <div className="mb-2 flex flex-wrap items-start justify-between gap-2">
        <div className="flex min-w-0 items-start gap-2">
          <ShieldCheck className="h-4 w-4 text-primary" />
          <p className="text-sm font-semibold leading-5 text-foreground">Ky dien tu truyen thong</p>
        </div>
        <span className="shrink-0 rounded-full bg-success/15 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-success">
          Recommended
        </span>
      </div>
      <p className="text-xs text-muted-foreground">Nhanh chong va quen thuoc</p>
      {selected && (
        <div className="mt-3 inline-flex items-center gap-1 rounded-full bg-primary/10 px-2 py-1 text-[10px] font-semibold text-primary">
          <CheckCircle2 className="h-3.5 w-3.5" />
          Dang chon
        </div>
      )}
    </button>
  );
}

import { cn } from "@/utils/cn";
import type { ContractSigningStep } from "@/flows/contract-signing/machine/contractSigningMachine";

const STEP_ORDER: ContractSigningStep[] = ["REVIEW", "METHOD", "SIGN", "PAYMENT"];
const STEP_LABELS: Record<ContractSigningStep, string> = {
  REVIEW: "Review",
  METHOD: "Choose Method",
  SIGN: "Sign",
  PAYMENT: "Deposit / Payment",
};

type ContractSigningProgressProps = {
  currentStep: ContractSigningStep;
  onJump?: (step: ContractSigningStep) => void;
};

export default function ContractSigningProgress({
  currentStep,
  onJump,
}: ContractSigningProgressProps) {
  const activeIndex = STEP_ORDER.indexOf(currentStep);

  return (
    <div className="rounded-2xl border border-border bg-background p-4">
      <div className="grid grid-cols-2 gap-2 md:grid-cols-4">
        {STEP_ORDER.map((step, index) => {
          const isDone = index < activeIndex;
          const isCurrent = index === activeIndex;
          const isClickable = Boolean(onJump) && index <= activeIndex;

          return (
            <button
              key={step}
              type="button"
              disabled={!isClickable}
              onClick={() => onJump?.(step)}
              className={cn(
                "rounded-xl border px-3 py-2 text-left transition-colors",
                isDone && "border-emerald-200 bg-emerald-50 text-emerald-800",
                isCurrent && "border-primary/30 bg-primary/5 text-primary",
                !isDone && !isCurrent && "border-border bg-background text-muted-foreground",
                isClickable ? "cursor-pointer" : "cursor-default"
              )}
            >
              <p className="text-[11px] font-semibold uppercase tracking-wide">Step {index + 1}</p>
              <p className="text-sm font-semibold">{STEP_LABELS[step]}</p>
            </button>
          );
        })}
      </div>
    </div>
  );
}


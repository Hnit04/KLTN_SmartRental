import { Check, Circle } from "lucide-react";
import type { ContractSettlementStep } from "../machine/contractSettlementMachine";
import { CONTRACT_SETTLEMENT_STEPS } from "../machine/contractSettlementMachine";
import { cn } from "@/utils/cn";

type SettlementProgressProps = {
  currentStep: ContractSettlementStep;
  onJump?: (step: ContractSettlementStep) => void;
};

const STEP_LABELS: Record<ContractSettlementStep, string> = {
  INSPECTION: "Kiểm kê",
  DEDUCTION: "Khấu trừ",
  REVIEW: "Duyệt",
  PAYOUT: "Hoàn tiền",
};

export default function SettlementProgress({
  currentStep,
  onJump,
}: SettlementProgressProps) {
  const currentIndex = CONTRACT_SETTLEMENT_STEPS.indexOf(currentStep);

  return (
    <div className="relative flex justify-between">
      {/* Connector Line */}
      <div className="absolute top-5 left-0 h-0.5 w-full bg-gray-200 -z-10" />
      <div 
        className="absolute top-5 left-0 h-0.5 bg-blue-600 transition-all duration-300 -z-10" 
        style={{ width: `${(currentIndex / (CONTRACT_SETTLEMENT_STEPS.length - 1)) * 100}%` }}
      />

      {CONTRACT_SETTLEMENT_STEPS.map((step, index) => {
        const isActive = step === currentStep;
        const isCompleted = index < currentIndex;
        const Label = STEP_LABELS[step];

        return (
          <button
            key={step}
            type="button"
            disabled={!onJump || index > currentIndex + 1}
            onClick={() => onJump?.(step)}
            className="flex flex-col items-center gap-2 group"
          >
            <div
              className={cn(
                "w-10 h-10 rounded-full flex items-center justify-center border-2 transition-all",
                isActive
                  ? "bg-blue-600 border-blue-600 text-white shadow-lg scale-110"
                  : isCompleted
                  ? "bg-green-500 border-green-500 text-white"
                  : "bg-white border-gray-300 text-gray-400"
              )}
            >
              {isCompleted ? <Check className="h-5 w-5" /> : index + 1}
            </div>
            <span
              className={cn(
                "text-xs font-medium transition-colors",
                isActive ? "text-blue-700 font-bold" : "text-gray-500"
              )}
            >
              {Label}
            </span>
          </button>
        );
      })}
    </div>
  );
}

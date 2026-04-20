import { cn } from "@/utils/cn";

type StatusTone = "success" | "warning" | "danger" | "info" | "neutral";

const toneClasses: Record<StatusTone, string> = {
  success: "bg-green-50 text-green-700 border-green-200",
  warning: "bg-amber-50 text-amber-700 border-amber-200",
  danger: "bg-red-50 text-red-700 border-red-200",
  info: "bg-blue-50 text-blue-700 border-blue-200",
  neutral: "bg-gray-100 text-gray-600 border-gray-200",
};

type Props = {
  label: string;
  tone?: StatusTone;
  className?: string;
};

export default function StatusBadge({ label, tone = "neutral", className }: Props) {
  return (
    <span className={cn("status-badge", toneClasses[tone], className)}>
      {label}
    </span>
  );
}


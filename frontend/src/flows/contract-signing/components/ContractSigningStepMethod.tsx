import type { ContractSignMethod } from "@/types";
import { ContractMethodSelector } from "@/features/contract/components/method-selector";

type ContractSigningStepMethodProps = {
  value: ContractSignMethod;
  onChange: (method: ContractSignMethod) => void;
};

export default function ContractSigningStepMethod({
  value,
  onChange,
}: ContractSigningStepMethodProps) {
  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-border bg-background p-4">
        <h3 className="text-sm font-semibold text-foreground">Chọn phương thức ký</h3>
        <p className="mt-1 text-sm text-muted-foreground">
          Truyền thống dễ dùng hơn. Blockchain phù hợp khi bạn cần bằng chứng minh bạch và chống chỉnh sửa.
        </p>
      </div>

      <ContractMethodSelector value={value} onChange={onChange} />
    </div>
  );
}


import { type ContractSignMethod } from "@/types";
import TraditionalCard from "./TraditionalCard";
import BlockchainCard from "./BlockchainCard";

type ContractMethodSelectorProps = {
  value: ContractSignMethod;
  onChange: (method: ContractSignMethod) => void;
};

export default function ContractMethodSelector({
  value,
  onChange,
}: ContractMethodSelectorProps) {
  return (
    <div className="space-y-2">
      <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        Phương thức ký hợp đồng
      </p>
      <div className="grid gap-3 sm:grid-cols-2">
        <TraditionalCard
          selected={value === "TRADITIONAL"}
          onClick={() => onChange("TRADITIONAL")}
        />
        <BlockchainCard
          selected={value === "BLOCKCHAIN"}
          onClick={() => onChange("BLOCKCHAIN")}
        />
      </div>
    </div>
  );
}


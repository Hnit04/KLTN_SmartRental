import { Calendar, Home, MapPin, ShieldCheck } from "lucide-react";
import type { Contract, ContractSignMethod } from "@/types";
import AIExplainCard from "@/components/shared/AIExplainCard";

type ContractSigningStepReviewProps = {
  contract: Contract;
  selectedMethod: ContractSignMethod;
  onAdjustMethod: () => void;
};

export default function ContractSigningStepReview({
  contract,
  selectedMethod,
  onAdjustMethod,
}: ContractSigningStepReviewProps) {
  const confidence = selectedMethod === "TRADITIONAL" ? 0.91 : 0.84;
  const reason =
    selectedMethod === "TRADITIONAL"
      ? "Ho so hien tai phu hop voi flow ky nhanh, it buoc va than thien cho nguoi dung pho thong."
      : "Ban chon blockchain de co bang chung chong chinh sua va kha nang kiem chung minh bach.";

  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-border bg-background p-4">
        <h3 className="mb-3 text-sm font-semibold text-foreground">Tom tat hop dong</h3>
        <div className="grid gap-3 md:grid-cols-2">
          <div className="flex items-start gap-2">
            <Home className="mt-0.5 h-4 w-4 text-primary" />
            <div>
              <p className="text-xs text-muted-foreground">Phong</p>
              <p className="text-sm font-semibold text-foreground">
                {contract.roomName || `Phong #${contract.roomId}`}
              </p>
            </div>
          </div>

          <div className="flex items-start gap-2">
            <MapPin className="mt-0.5 h-4 w-4 text-primary" />
            <div>
              <p className="text-xs text-muted-foreground">Dia chi</p>
              <p className="text-sm font-semibold text-foreground">
                {contract.propertyAddress || "Dang cap nhat"}
              </p>
            </div>
          </div>

          <div className="flex items-start gap-2">
            <Calendar className="mt-0.5 h-4 w-4 text-primary" />
            <div>
              <p className="text-xs text-muted-foreground">Thoi han</p>
              <p className="text-sm font-semibold text-foreground">
                {new Date(contract.startDate).toLocaleDateString("vi-VN")} -{" "}
                {new Date(contract.endDate).toLocaleDateString("vi-VN")}
              </p>
            </div>
          </div>

          <div className="flex items-start gap-2">
            <ShieldCheck className="mt-0.5 h-4 w-4 text-success" />
            <div>
              <p className="text-xs text-muted-foreground">Gia tri coc</p>
              <p className="text-sm font-semibold text-foreground">
                {Number(contract.depositAmount || 0).toLocaleString("vi-VN")}d
              </p>
            </div>
          </div>
        </div>
      </div>

      <AIExplainCard
        reason={reason}
        confidence={confidence}
        keyFactors={[
          "Lich su hop dong va trang thai KYC",
          "Phuong thuc ky hien tai va muc do tien dung",
          "Muc uu tien hoan tat ky va thanh toan nhanh",
        ]}
        onAdjust={onAdjustMethod}
      />
    </div>
  );
}

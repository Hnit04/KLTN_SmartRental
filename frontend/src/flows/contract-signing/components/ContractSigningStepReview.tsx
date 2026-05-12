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
      ? "Hồ sơ hiện tại phù hợp với flow ký nhanh, ít bước và thân thiện cho người dùng phổ thông."
      : "Bạn đã chọn blockchain để có bằng chứng chống chỉnh sửa và khả năng kiểm chứng minh bạch.";

  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-border bg-background p-4">
        <h3 className="mb-3 text-sm font-semibold text-foreground">Tóm tắt hợp đồng</h3>
        <div className="grid gap-3 md:grid-cols-2">
          <div className="flex items-start gap-2">
            <Home className="mt-0.5 h-4 w-4 text-primary" />
            <div>
              <p className="text-xs text-muted-foreground">Phòng</p>
              <p className="text-sm font-semibold text-foreground">
                {contract.roomName || `Phòng #${contract.roomId}`}
              </p>
            </div>
          </div>
          <div className="flex items-start gap-2">
            <MapPin className="mt-0.5 h-4 w-4 text-primary" />
            <div>
              <p className="text-xs text-muted-foreground">Địa chỉ</p>
              <p className="text-sm font-semibold text-foreground">
                {contract.propertyAddress || "Đang cập nhật"}
              </p>
            </div>
          </div>
          <div className="flex items-start gap-2">
            <Calendar className="mt-0.5 h-4 w-4 text-primary" />
            <div>
              <p className="text-xs text-muted-foreground">Thời hạn</p>
              <p className="text-sm font-semibold text-foreground">
                {new Date(contract.startDate).toLocaleDateString("vi-VN")} -{" "}
                {new Date(contract.endDate).toLocaleDateString("vi-VN")}
              </p>
            </div>
          </div>
          <div className="flex items-start gap-2">
            <ShieldCheck className="mt-0.5 h-4 w-4 text-emerald-600" />
            <div>
              <p className="text-xs text-muted-foreground">Giá trị cọc</p>
              <p className="text-sm font-semibold text-foreground">
                {Number(contract.depositAmount || 0).toLocaleString("vi-VN")}đ
              </p>
            </div>
          </div>
        </div>
      </div>

      <AIExplainCard
        reason={reason}
        confidence={confidence}
        keyFactors={[
          "Lịch sử hợp đồng và trạng thái KYC",
          "Phương thức ký hiện tại và mức độ tiện dụng",
          "Mức ưu tiên hoàn tất ký và thanh toán nhanh",
        ]}
        onAdjust={onAdjustMethod}
      />
    </div>
  );
}


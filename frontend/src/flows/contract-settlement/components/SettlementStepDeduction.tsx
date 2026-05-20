import { useState } from "react";
import { Plus, Trash2, Lock, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Label } from "@/components/ui/Label";
import { toast } from "sonner";
import type { UtilityBill } from "./SettlementStepInspection";
import { proposeDeduction } from "@/utils/contractHelper";
import { contractApi } from "@/api/contractApi";
import { useSystemConfig } from "@/context/SystemConfigContext";
import { ethers } from "ethers";

type DeductionItem = {
  reason: string;
  amount: number;
  type?: string;
  locked?: boolean;
};

type SettlementStepDeductionProps = {
  contractId: number;
  depositAmount: number;
  utilityBill?: UtilityBill;
  inspectionNote?: string;
  items: DeductionItem[];
  isWeb3: boolean;
  smartContractAddress?: string;
  isEarlyTermination: boolean;
  onComplete: (items: DeductionItem[]) => void;
  onBack: () => void;
  onRefresh: () => Promise<void>;
};

export default function SettlementStepDeduction({
  contractId,
  depositAmount,
  utilityBill,
  inspectionNote,
  items: initialItems,
  isWeb3,
  smartContractAddress,
  isEarlyTermination,
  onComplete,
  onBack,
  onRefresh,
}: SettlementStepDeductionProps) {
  const { config } = useSystemConfig();

  // Build initial items with locked utility item
  const buildInitialItems = (): DeductionItem[] => {
    const result: DeductionItem[] = [];

    // Auto-add locked utility item
    if (utilityBill && utilityBill.total > 0) {
      result.push({
        reason: "Tiền điện nước cuối kỳ",
        amount: utilityBill.total,
        type: "UTILITY",
        locked: true,
      });
    }

    // Add existing non-utility items
    const existingNonUtility = initialItems.filter(i => i.type !== "UTILITY" && !i.locked);
    if (existingNonUtility.length > 0) {
      result.push(...existingNonUtility);
    } else {
      result.push({ reason: "", amount: 0, type: "OTHER" });
    }

    return result;
  };

  const [items, setItems] = useState<DeductionItem[]>(buildInitialItems());
  const [isSubmitting, setIsSubmitting] = useState(false);

  const addItem = () => setItems([...items, { reason: "", amount: 0, type: "OTHER" }]);
  const removeItem = (index: number) => {
    if (items[index].locked) return;
    setItems(items.filter((_, i) => i !== index));
  };
  const updateItem = (index: number, field: keyof DeductionItem, value: string | number) => {
    if (items[index].locked && (field === "amount" || field === "reason")) return;
    const newItems = [...items];
    (newItems[index] as any)[field] = value;
    setItems(newItems);
  };

  const totalDeduction = items.reduce((acc, item) => acc + (Number(item.amount) || 0), 0);
  const finalRefund = Math.max(0, depositAmount - totalDeduction);

  const handleSubmit = async () => {
    // Validate
    const validItems = items.filter(i => i.locked || (i.reason.trim() && i.amount > 0));
    if (totalDeduction > depositAmount) {
      toast.error("Tổng khấu trừ không được vượt quá tiền cọc!");
      return;
    }

    setIsSubmitting(true);
    try {
      let txHash: string | undefined;

      // 1. Blockchain: gọi proposeDeduction on-chain TRƯỚC
      if (isWeb3 && smartContractAddress) {
        toast.info("Đang gửi đề xuất lên Blockchain... Vui lòng xác nhận MetaMask.");
        const deductionWei = ethers.parseEther((totalDeduction / config.vndEthRate).toFixed(18)).toString();
        txHash = await proposeDeduction(
          smartContractAddress,
          deductionWei,
          isEarlyTermination,
        );
        toast.success("Đã gửi lên Blockchain!");
      }

      // 2. Backend: lưu proposal + thông báo tenant
      toast.info("Đang lưu đề xuất...");
      await contractApi.proposeSettlement(contractId, {
        deductionAmount: totalDeduction,
        earlyTermination: isEarlyTermination,
        txHash,
        inspectionNote,
        utilityBill,
        items: validItems.map(i => ({
          reason: i.reason,
          amount: i.amount,
          type: i.type,
          locked: i.locked,
        })),
      });

      toast.success("Đã gửi đề xuất quyết toán thành công! Đang chờ khách thuê phản hồi.");
      await onRefresh();
      onComplete(validItems);
    } catch (err: any) {
      toast.error(err?.message || err?.response?.data?.message || "Lỗi khi gửi đề xuất quyết toán");
    } finally {
      setIsSubmitting(false);
    }
  };

  const fmt = (n: number) => new Intl.NumberFormat("vi-VN").format(n);

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <h3 className="text-lg font-bold">Đề xuất khoản khấu trừ</h3>
        <p className="text-sm text-muted-foreground">Liệt kê các khoản chi phí sửa chữa hoặc tiền điện nước còn thiếu.</p>
      </div>

      <div className="p-4 bg-blue-50 rounded-xl border border-blue-100 flex justify-between items-center">
        <span className="text-blue-700 font-medium">Tiền cọc gốc:</span>
        <span className="text-blue-900 font-bold">{fmt(depositAmount)}đ</span>
      </div>

      <div className="space-y-4">
        {items.map((item, index) => (
          <div key={index} className={`flex gap-3 items-end p-3 border rounded-lg ${item.locked ? "bg-amber-50/50 border-amber-200" : "bg-gray-50/50"}`}>
            <div className="flex-1 space-y-2">
              <Label className="flex items-center gap-1.5">
                {item.locked && <Lock className="w-3 h-3 text-amber-600" />}
                Lý do khấu trừ
              </Label>
              <Input
                placeholder="Ví dụ: Tiền điện tháng cuối..."
                value={item.reason}
                onChange={(e) => updateItem(index, "reason", e.target.value)}
                disabled={item.locked}
                className={item.locked ? "bg-amber-50 text-amber-900 font-medium" : ""}
              />
            </div>
            <div className="w-36 space-y-2">
              <Label>Số tiền (VNĐ)</Label>
              <Input
                type="number"
                value={item.amount}
                onChange={(e) => updateItem(index, "amount", Number(e.target.value))}
                disabled={item.locked}
                className={item.locked ? "bg-amber-50 text-amber-900 font-bold" : ""}
              />
            </div>
            {!item.locked && (
              <Button variant="ghost" size="icon" className="text-red-500 shrink-0" onClick={() => removeItem(index)}>
                <Trash2 className="h-4 w-4" />
              </Button>
            )}
          </div>
        ))}

        <Button type="button" variant="outline" className="w-full border-dashed" onClick={addItem}>
          <Plus className="mr-2 h-4 w-4" /> Thêm khoản khấu trừ
        </Button>
      </div>

      <div className="p-6 bg-gray-900 text-white rounded-2xl space-y-3">
        <div className="flex justify-between text-sm text-gray-400">
          <span>Tổng khấu trừ:</span>
          <span className="text-red-400">-{fmt(totalDeduction)}đ</span>
        </div>
        <div className="flex justify-between text-xl font-bold border-t border-gray-700 pt-3">
          <span>Tiền hoàn lại:</span>
          <span className="text-green-400">{fmt(finalRefund)}đ</span>
        </div>
        {totalDeduction > depositAmount && (
          <p className="text-red-400 text-xs">⚠️ Tổng khấu trừ vượt quá tiền cọc!</p>
        )}
      </div>

      <div className="flex justify-between pt-4">
        <Button variant="outline" onClick={onBack} disabled={isSubmitting}>Quay lại</Button>
        <Button
          onClick={handleSubmit}
          disabled={isSubmitting || totalDeduction > depositAmount}
          className="min-w-[200px]"
        >
          {isSubmitting ? (
            <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Đang xử lý...</>
          ) : (
            isWeb3 ? "Gửi đề xuất (MetaMask)" : "Gửi đề xuất quyết toán"
          )}
        </Button>
      </div>
    </div>
  );
}

import { useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Label } from "@/components/ui/Label";

type DeductionItem = {
  reason: string;
  amount: number;
};

type SettlementStepDeductionProps = {
  depositAmount: number;
  items: DeductionItem[];
  onComplete: (items: DeductionItem[]) => void;
  onBack: () => void;
};

export default function SettlementStepDeduction({
  depositAmount,
  items: initialItems,
  onComplete,
  onBack,
}: SettlementStepDeductionProps) {
  const [items, setItems] = useState<DeductionItem[]>(initialItems.length > 0 ? initialItems : [{ reason: "", amount: 0 }]);

  const addItem = () => setItems([...items, { reason: "", amount: 0 }]);
  const removeItem = (index: number) => setItems(items.filter((_, i) => i !== index));
  const updateItem = (index: number, field: keyof DeductionItem, value: string | number) => {
    const newItems = [...items];
    (newItems[index] as any)[field] = value;
    setItems(newItems);
  };

  const totalDeduction = items.reduce((acc, item) => acc + (Number(item.amount) || 0), 0);
  const finalRefund = Math.max(0, depositAmount - totalDeduction);

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <h3 className="text-lg font-bold">Đề xuất khoản khấu trừ</h3>
        <p className="text-sm text-muted-foreground">Liệt kê các khoản chi phí sửa chữa hoặc tiền điện nước còn thiếu.</p>
      </div>

      <div className="p-4 bg-blue-50 rounded-xl border border-blue-100 flex justify-between items-center">
        <span className="text-blue-700 font-medium">Tiền cọc gốc:</span>
        <span className="text-blue-900 font-bold">{depositAmount.toLocaleString("vi-VN")}đ</span>
      </div>

      <div className="space-y-4">
        {items.map((item, index) => (
          <div key={index} className="flex gap-3 items-end p-3 border rounded-lg bg-gray-50/50">
            <div className="flex-1 space-y-2">
              <Label>Lý do khấu trừ</Label>
              <Input 
                placeholder="Ví dụ: Tiền điện tháng cuối..." 
                value={item.reason}
                onChange={(e) => updateItem(index, "reason", e.target.value)}
              />
            </div>
            <div className="w-32 space-y-2">
              <Label>Số tiền (VNĐ)</Label>
              <Input 
                type="number"
                value={item.amount}
                onChange={(e) => updateItem(index, "amount", Number(e.target.value))}
              />
            </div>
            <Button variant="ghost" size="icon" className="text-red-500" onClick={() => removeItem(index)}>
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        ))}

        <Button type="button" variant="outline" className="w-full border-dashed" onClick={addItem}>
          <Plus className="mr-2 h-4 w-4" /> Thêm khoản khấu trừ
        </Button>
      </div>

      <div className="p-6 bg-gray-900 text-white rounded-2xl space-y-3">
        <div className="flex justify-between text-sm text-gray-400">
          <span>Tổng khấu trừ:</span>
          <span className="text-red-400">-{totalDeduction.toLocaleString("vi-VN")}đ</span>
        </div>
        <div className="flex justify-between text-xl font-bold border-t border-gray-700 pt-3">
          <span>Tiền hoàn lại:</span>
          <span className="text-green-400">{finalRefund.toLocaleString("vi-VN")}đ</span>
        </div>
      </div>

      <div className="flex justify-between pt-4">
        <Button variant="outline" onClick={onBack}>Quay lại</Button>
        <Button onClick={() => onComplete(items)}>Gửi đề xuất quyết toán</Button>
      </div>
    </div>
  );
}

import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Label } from "@/components/ui/Label";
import { Textarea } from "@/components/ui/Textarea";
import { Zap, Droplets, Wifi } from "lucide-react";

export type UtilityBill = {
  electricityUsage: number;
  waterUsage: number;
  electricityFee: number;
  waterFee: number;
  internetFee: number;
  total: number;
};

type SettlementStepInspectionProps = {
  initialData?: { electricityUsage: number; waterUsage: number; note?: string };
  elecPrice: number;
  waterPrice: number;
  internetPrice: number;
  onComplete: (data: { electricityUsage: number; waterUsage: number; note?: string; utilityBill: UtilityBill }) => void;
};

export default function SettlementStepInspection({
  initialData,
  elecPrice,
  waterPrice,
  internetPrice,
  onComplete,
}: SettlementStepInspectionProps) {
  const [electricityUsage, setElectricityUsage] = useState(initialData?.electricityUsage ?? 0);
  const [waterUsage, setWaterUsage] = useState(initialData?.waterUsage ?? 0);
  const [note, setNote] = useState(initialData?.note ?? "");

  const electricityFee = electricityUsage * elecPrice;
  const waterFee = waterUsage * waterPrice;
  const internetFee = internetPrice;
  const total = electricityFee + waterFee + internetFee;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onComplete({
      electricityUsage,
      waterUsage,
      note: note || undefined,
      utilityBill: { electricityUsage, waterUsage, electricityFee, waterFee, internetFee, total },
    });
  };

  const fmt = (n: number) => new Intl.NumberFormat("vi-VN").format(n);

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="space-y-2">
        <h3 className="text-lg font-bold">Kiểm kê tình trạng phòng</h3>
        <p className="text-sm text-muted-foreground">Nhập số điện nước sử dụng cuối kỳ và ghi chú tình trạng tài sản.</p>
      </div>

      <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg">
        <p className="text-xs text-amber-800">
          ⚠️ <strong>Lưu ý:</strong> Số liệu điện nước bạn nhập sẽ được gửi đến khách thuê để xác nhận.
          Khách thuê có quyền <strong>từ chối</strong> nếu chỉ số không đúng thực tế.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>Số điện sử dụng cuối kỳ (kWh)</Label>
          <Input
            type="number"
            min={0}
            step="0.1"
            value={electricityUsage}
            onChange={(e) => setElectricityUsage(Number(e.target.value))}
            required
          />
        </div>
        <div className="space-y-2">
          <Label>Số nước sử dụng cuối kỳ (m³)</Label>
          <Input
            type="number"
            min={0}
            step="0.1"
            value={waterUsage}
            onChange={(e) => setWaterUsage(Number(e.target.value))}
            required
          />
        </div>
      </div>

      {/* Preview tiền điện nước */}
      <div className="bg-gradient-to-br from-blue-50 via-white to-indigo-50 border border-blue-200/60 rounded-xl p-5 space-y-3">
        <p className="text-sm font-bold text-blue-900 uppercase tracking-wider">Chi phí điện nước cuối kỳ</p>
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="flex items-center gap-2 text-gray-600">
              <Zap className="w-4 h-4 text-yellow-500" />
              Điện: {fmt(electricityUsage)} kWh × {fmt(elecPrice)}đ
            </span>
            <span className="font-bold text-gray-900">{fmt(electricityFee)}đ</span>
          </div>
          <div className="flex items-center justify-between text-sm">
            <span className="flex items-center gap-2 text-gray-600">
              <Droplets className="w-4 h-4 text-blue-500" />
              Nước: {fmt(waterUsage)} m³ × {fmt(waterPrice)}đ
            </span>
            <span className="font-bold text-gray-900">{fmt(waterFee)}đ</span>
          </div>
          {internetPrice > 0 && (
            <div className="flex items-center justify-between text-sm">
              <span className="flex items-center gap-2 text-gray-600">
                <Wifi className="w-4 h-4 text-green-500" />
                Internet
              </span>
              <span className="font-bold text-gray-900">{fmt(internetFee)}đ</span>
            </div>
          )}
          <div className="flex items-center justify-between text-base pt-2 border-t border-blue-200">
            <span className="font-bold text-blue-800">Tổng cuối kỳ</span>
            <span className="font-black text-blue-900 text-lg">{fmt(total)}đ</span>
          </div>
        </div>
      </div>

      <div className="space-y-2">
        <Label>Ghi chú tình trạng phòng / Tài sản</Label>
        <Textarea
          placeholder="Ví dụ: Tường bẩn, hỏng bóng đèn nhà vệ sinh..."
          value={note}
          onChange={(e) => setNote(e.target.value)}
        />
      </div>

      <div className="flex justify-end">
        <Button type="submit">Tiếp tục: Đề xuất khấu trừ</Button>
      </div>
    </form>
  );
}

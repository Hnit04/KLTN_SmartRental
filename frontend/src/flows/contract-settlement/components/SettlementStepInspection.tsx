import { useForm } from "react-hook-form";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Label } from "@/components/ui/Label";
import { Textarea } from "@/components/ui/Textarea";

type SettlementStepInspectionProps = {
  initialData?: { electricity: number; water: number; note?: string };
  onComplete: (data: { electricity: number; water: number; note?: string }) => void;
};

export default function SettlementStepInspection({
  initialData,
  onComplete,
}: SettlementStepInspectionProps) {
  const { register, handleSubmit } = useForm({
    defaultValues: initialData || { electricity: 0, water: 0, note: "" },
  });

  return (
    <form onSubmit={handleSubmit(onComplete)} className="space-y-6">
      <div className="space-y-2">
        <h3 className="text-lg font-bold">Kiểm kê tình trạng phòng</h3>
        <p className="text-sm text-muted-foreground">Nhập chỉ số điện nước cuối cùng và ghi chú tình trạng tài sản.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>Chỉ số Điện (kWh)</Label>
          <Input type="number" {...register("electricity", { required: true, min: 0 })} />
        </div>
        <div className="space-y-2">
          <Label>Chỉ số Nước (m³)</Label>
          <Input type="number" {...register("water", { required: true, min: 0 })} />
        </div>
      </div>

      <div className="space-y-2">
        <Label>Ghi chú tình trạng phòng / Tài sản</Label>
        <Textarea 
          placeholder="Ví dụ: Tường bẩn, hỏng bóng đèn nhà vệ sinh..." 
          {...register("note")}
        />
      </div>

      <div className="flex justify-end">
        <Button type="submit">Tiếp tục: Đề xuất khấu trừ</Button>
      </div>
    </form>
  );
}

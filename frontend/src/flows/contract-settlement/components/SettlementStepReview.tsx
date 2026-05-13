import { CheckCircle, XCircle, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/Button";
import type { Contract } from "@/types";
import type { ContractSettlementContext } from "../machine/contractSettlementMachine";

type SettlementStepReviewProps = {
  contract: Contract;
  context: ContractSettlementContext;
  role: string;
  onAction: (agree: boolean) => void;
  onBack: () => void;
};

export default function SettlementStepReview({
  contract,
  context,
  role,
  onAction,
  onBack,
}: SettlementStepReviewProps) {
  const isLandlord = role === "LANDLORD";
  const totalDeduction = context.deductions.reduce((acc, item) => acc + (item.amount || 0), 0);
  const finalRefund = Math.max(0, (contract.depositAmount || 0) - totalDeduction);

  return (
    <div className="space-y-6">
      <div className="text-center space-y-2">
        <div className="mx-auto w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center">
          <AlertTriangle className="h-8 w-8 text-blue-600" />
        </div>
        <h3 className="text-xl font-bold">Xem lại Đề xuất Quyết toán</h3>
        <p className="text-sm text-muted-foreground">
          {isLandlord 
            ? "Đang chờ khách thuê xem và xác nhận đề xuất của bạn." 
            : "Vui lòng xem kỹ các khoản khấu trừ bên dưới trước khi xác nhận."}
        </p>
      </div>

      <div className="space-y-4 border rounded-2xl p-6 bg-gray-50/30">
        <div className="flex justify-between pb-4 border-b">
          <span className="text-gray-500">Tiền cọc ban đầu</span>
          <span className="font-bold">{(contract.depositAmount || 0).toLocaleString("vi-VN")}đ</span>
        </div>

        <div className="space-y-3">
          <span className="text-sm font-medium text-gray-500">Các khoản khấu trừ:</span>
          {context.deductions.map((item, idx) => (
            <div key={idx} className="flex justify-between text-sm">
              <span className="text-gray-700">• {item.reason}</span>
              <span className="text-red-600">-{item.amount.toLocaleString("vi-VN")}đ</span>
            </div>
          ))}
          {context.deductions.length === 0 && <p className="text-sm text-green-600 italic">Không có khoản khấu trừ nào.</p>}
        </div>

        <div className="flex justify-between pt-4 border-t text-lg">
          <span className="font-bold">Số tiền hoàn lại</span>
          <span className="font-extrabold text-blue-600">{finalRefund.toLocaleString("vi-VN")}đ</span>
        </div>
      </div>

      {!isLandlord ? (
        <div className="grid grid-cols-2 gap-4">
          <Button variant="outline" className="border-red-200 text-red-600 hover:bg-red-50" onClick={() => onAction(false)}>
            <XCircle className="mr-2 h-4 w-4" /> Khiếu nại / Từ chối
          </Button>
          <Button className="bg-green-600 hover:bg-green-700" onClick={() => onAction(true)}>
            <CheckCircle className="mr-2 h-4 w-4" /> Đồng ý Quyết toán
          </Button>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          <p className="text-xs text-center text-gray-400 italic">Hệ thống đã gửi thông báo đến khách thuê. Bạn sẽ nhận được kết quả ngay khi khách phản hồi.</p>
          <Button variant="outline" className="w-full" onClick={onBack}>Chỉnh sửa đề xuất</Button>
        </div>
      )}
    </div>
  );
}

import { useState } from "react";
import { CheckCircle2, ShieldCheck, Wallet } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { toast } from "sonner";
import type { Contract } from "@/types";
import type { ContractSettlementContext } from "../machine/contractSettlementMachine";
import { contractApi } from "@/api/contractApi";
import { useNavigate } from "react-router-dom";

type SettlementStepPayoutProps = {
  contract: Contract;
  context: ContractSettlementContext;
  onSuccess: (settledAt: string) => void;
  onBack: () => void;
};

export default function SettlementStepPayout({
  contract,
  context,
  onSuccess,
  onBack,
}: SettlementStepPayoutProps) {
  const [isProcessing, setIsProcessing] = useState(false);
  const navigate = useNavigate();
  const isWeb3 = contract.signMethod === "BLOCKCHAIN";
  
  const totalDeduction = context.deductions.reduce((acc, item) => acc + (item.amount || 0), 0);
  const finalRefund = Math.max(0, (contract.depositAmount || 0) - totalDeduction);

  const handleSettle = async () => {
    setIsProcessing(true);
    try {
      // Gọi API quyết toán cuối cùng
      await contractApi.confirmDepositRefund(contract.id); 
      
      const settledAt = new Date().toISOString();
      onSuccess(settledAt);
      toast.success("Hợp đồng đã được quyết toán thành công!");
    } catch (error: any) {
      toast.error(error?.response?.data?.message || "Lỗi xử lý hoàn tiền");
    } finally {
      setIsProcessing(false);
    }
  };

  if (context.settledAt) {
    return (
      <div className="text-center py-10 space-y-6">
        <div className="mx-auto w-20 h-20 bg-green-100 rounded-full flex items-center justify-center">
          <CheckCircle2 className="h-12 w-12 text-green-600" />
        </div>
        <div className="space-y-2">
          <h3 className="text-2xl font-bold text-gray-900">Quyết toán Hoàn tất!</h3>
          <p className="text-gray-500 max-w-sm mx-auto">
            Giao dịch đã được ghi nhận. Hợp đồng hiện đã ở trạng thái kết thúc hoàn toàn.
          </p>
        </div>
        <Button onClick={() => navigate(`/landlord/contracts/${contract.id}`)}>
          Quay lại chi tiết hợp đồng
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="space-y-2">
        <h3 className="text-lg font-bold">Thực hiện Hoàn tiền</h3>
        <p className="text-sm text-muted-foreground">
          Bước cuối cùng để giải phóng tiền cọc và đóng hợp đồng.
        </p>
      </div>

      <div className="p-6 border-2 border-dashed border-blue-200 rounded-2xl bg-blue-50/30 text-center">
        <p className="text-blue-700 text-sm font-medium mb-1">Số tiền cần hoàn lại cho Khách thuê:</p>
        <p className="text-3xl font-black text-blue-900">{finalRefund.toLocaleString("vi-VN")}đ</p>
      </div>

      <div className="grid gap-4">
        {isWeb3 ? (
          <div className="flex items-start gap-3 p-4 bg-indigo-50 rounded-xl border border-indigo-100">
            <Wallet className="h-5 w-5 text-indigo-600 mt-0.5" />
            <div className="space-y-1">
              <p className="text-sm font-bold text-indigo-900">Quyết toán qua Blockchain</p>
              <p className="text-xs text-indigo-700">Hệ thống sẽ gọi Smart Contract để hoàn cọc. Bạn cần xác nhận giao dịch qua MetaMask.</p>
            </div>
          </div>
        ) : (
          <div className="flex items-start gap-3 p-4 bg-amber-50 rounded-xl border border-amber-100">
            <ShieldCheck className="h-5 w-5 text-amber-600 mt-0.5" />
            <div className="space-y-1">
              <p className="text-sm font-bold text-amber-900">Xác nhận hoàn tiền truyền thống</p>
              <p className="text-xs text-amber-700">Hãy đảm bảo bạn đã chuyển khoản số tiền trên cho khách thuê qua ngân hàng.</p>
            </div>
          </div>
        )}
      </div>

      <div className="flex gap-3 pt-4">
        <Button variant="outline" className="flex-1" onClick={onBack} disabled={isProcessing}>
          Quay lại kiểm tra
        </Button>
        <Button className="flex-1 bg-blue-600 hover:bg-blue-700" onClick={handleSettle} isLoading={isProcessing}>
          {isWeb3 ? "Ký lệnh Hoàn cọc (Web3)" : "Xác nhận Đã hoàn tiền"}
        </Button>
      </div>
    </div>
  );
}

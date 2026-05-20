import { useState } from "react";
import { CheckCircle2, ShieldCheck, Wallet, Loader2, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { toast } from "sonner";
import type { Contract } from "@/types";
import { executeEndContract } from "@/utils/contractHelper";
import { contractApi } from "@/api/contractApi";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";

type SettlementStepPayoutProps = {
  contract: Contract;
  onRefresh: () => Promise<void>;
  onBack: () => void;
};

export default function SettlementStepPayout({
  contract,
  onRefresh,
  onBack,
}: SettlementStepPayoutProps) {
  const [isExecuting, setIsExecuting] = useState(false);
  const [isWithdrawing, setIsWithdrawing] = useState(false);
  const [executed, setExecuted] = useState(contract.settlementProposalStatus === "COMPLETED");
  const navigate = useNavigate();
  const { user } = useAuth();
  const isWeb3 = contract.signMethod === "BLOCKCHAIN";
  const basePath = user?.role === "LANDLORD" ? "/landlord" : "/tenant";

  const canExecute =
    contract.isProposalActive &&
    contract.hasLandlordConsented &&
    contract.hasTenantConsented;

  const handleExecute = async () => {
    setIsExecuting(true);
    try {
      if (isWeb3 && contract.smartContractAddress) {
        toast.info("Đang thực thi kết thúc trên Blockchain... Vui lòng xác nhận MetaMask.");
        await executeEndContract(contract.smartContractAddress);
        toast.success("Đã kết thúc hợp đồng trên Blockchain!");
      }

      await contractApi.executeSettlement(contract.id);
      toast.success("Hợp đồng đã được quyết toán thành công!");
      setExecuted(true);
      await onRefresh();
    } catch (err: any) {
      toast.error(err?.message || err?.response?.data?.message || "Lỗi thực thi quyết toán");
    } finally {
      setIsExecuting(false);
    }
  };

  const handleWithdraw = async () => {
    if (!contract.smartContractAddress) return;
    setIsWithdrawing(true);
    try {
      const { ethers } = await import("ethers");
      const provider = new ethers.BrowserProvider((window as any).ethereum);
      const signer = await provider.getSigner();
      const abi = ["function withdraw() external"];
      const sc = new ethers.Contract(contract.smartContractAddress, abi, signer);

      toast.info("Đang rút tiền... Vui lòng xác nhận MetaMask.");
      const tx = await sc.withdraw();
      await tx.wait();
      toast.success("Đã rút tiền thành công về ví MetaMask!");
      await onRefresh();
    } catch (err: any) {
      const msg = err?.reason || err?.message || "";
      if (msg.includes("Nothing")) {
        toast.error("Không có khoản tiền nào để rút. Có thể bạn đã rút rồi hoặc hợp đồng chưa được kết thúc on-chain.");
      } else {
        toast.error("Lỗi rút tiền: " + msg);
      }
    } finally {
      setIsWithdrawing(false);
    }
  };

  // Already executed
  if (executed) {
    return (
      <div className="space-y-6">
        <div className="text-center py-6 space-y-4">
          <div className="mx-auto w-20 h-20 bg-green-100 rounded-full flex items-center justify-center">
            <CheckCircle2 className="h-12 w-12 text-green-600" />
          </div>
          <div className="space-y-2">
            <h3 className="text-2xl font-bold text-gray-900">Quyết toán Hoàn tất!</h3>
            <p className="text-gray-500 max-w-sm mx-auto">
              Giao dịch đã được ghi nhận. Hợp đồng hiện đã ở trạng thái kết thúc hoàn toàn.
            </p>
          </div>
        </div>

        {isWeb3 && (
          <div className="space-y-4">
            <div className="p-4 bg-indigo-50 rounded-xl border border-indigo-100">
              <div className="flex items-center gap-2 mb-2">
                <Wallet className="h-5 w-5 text-indigo-600" />
                <p className="text-sm font-bold text-indigo-900">Rút tiền về ví MetaMask</p>
              </div>
              <p className="text-xs text-indigo-700 mb-3">
                Tiền cọc hoàn / khấu trừ đã được ghi nhận trong Smart Contract. Nhấn nút bên dưới để rút về ví.
              </p>
              <Button
                className="w-full bg-indigo-600 hover:bg-indigo-700"
                onClick={handleWithdraw}
                disabled={isWithdrawing}
              >
                {isWithdrawing ? (
                  <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Đang rút tiền...</>
                ) : (
                  "💰 Rút tiền từ Contract về ví"
                )}
              </Button>
            </div>
          </div>
        )}

        <Button
          variant="outline"
          className="w-full"
          onClick={() => navigate(`${basePath}/contracts/${contract.id}`)}
        >
          Quay lại chi tiết hợp đồng
        </Button>
      </div>
    );
  }

  // Not ready to execute
  return (
    <div className="space-y-8">
      <div className="space-y-2">
        <h3 className="text-lg font-bold">Thực hiện Kết thúc Hợp đồng</h3>
        <p className="text-sm text-muted-foreground">
          Bước cuối cùng để giải phóng tiền cọc và đóng hợp đồng.
        </p>
      </div>

      {!canExecute ? (
        <div className="p-6 border-2 border-dashed border-amber-200 rounded-2xl bg-amber-50/30 text-center space-y-3">
          <AlertTriangle className="h-8 w-8 text-amber-500 mx-auto" />
          <p className="text-amber-800 font-medium">Chưa đủ đồng thuận</p>
          <p className="text-sm text-amber-700">
            Cần cả chủ trọ và khách thuê đều đồng ý quyết toán trên{isWeb3 ? " Blockchain" : " hệ thống"} trước khi thực thi.
          </p>
          <Button variant="outline" onClick={onBack}>Quay lại kiểm tra</Button>
        </div>
      ) : (
        <>
          <div className="grid gap-4">
            {isWeb3 ? (
              <div className="flex items-start gap-3 p-4 bg-indigo-50 rounded-xl border border-indigo-100">
                <Wallet className="h-5 w-5 text-indigo-600 mt-0.5" />
                <div className="space-y-1">
                  <p className="text-sm font-bold text-indigo-900">Kết thúc qua Blockchain</p>
                  <p className="text-xs text-indigo-700">
                    Hệ thống sẽ gọi endContract() trên Smart Contract. Sau đó tiền sẽ được ghi vào pendingWithdrawals để mỗi bên tự rút.
                  </p>
                </div>
              </div>
            ) : (
              <div className="flex items-start gap-3 p-4 bg-amber-50 rounded-xl border border-amber-100">
                <ShieldCheck className="h-5 w-5 text-amber-600 mt-0.5" />
                <div className="space-y-1">
                  <p className="text-sm font-bold text-amber-900">Xác nhận kết thúc truyền thống</p>
                  <p className="text-xs text-amber-700">
                    Hãy đảm bảo bạn đã chuyển khoản số tiền hoàn cọc cho khách thuê qua ngân hàng.
                  </p>
                </div>
              </div>
            )}
          </div>

          <div className="flex gap-3 pt-4">
            <Button variant="outline" className="flex-1" onClick={onBack} disabled={isExecuting}>
              Quay lại
            </Button>
            <Button
              className="flex-1 bg-blue-600 hover:bg-blue-700"
              onClick={handleExecute}
              disabled={isExecuting}
            >
              {isExecuting ? (
                <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Đang xử lý...</>
              ) : (
                isWeb3 ? "🚀 Thực thi Kết thúc (Web3)" : "✅ Xác nhận Kết thúc"
              )}
            </Button>
          </div>
        </>
      )}
    </div>
  );
}

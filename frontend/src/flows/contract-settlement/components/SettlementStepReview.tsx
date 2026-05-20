import { useState } from "react";
import { CheckCircle, XCircle, AlertTriangle, CheckCircle2, Clock, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Textarea } from "@/components/ui/Textarea";
import { toast } from "sonner";
import type { Contract } from "@/types";
import { contractApi } from "@/api/contractApi";
import { consentEndContract } from "@/utils/contractHelper";

type SettlementStepReviewProps = {
  contract: Contract;
  role: string;
  onBack: () => void;
  onRefresh: () => Promise<void>;
  onGoToStep: (step: string) => void;
};

export default function SettlementStepReview({
  contract,
  role,
  onBack,
  onRefresh,
  onGoToStep,
}: SettlementStepReviewProps) {
  const isLandlord = role === "LANDLORD";
  const isTenant = role === "TENANT";
  const isWeb3 = contract.signMethod === "BLOCKCHAIN";
  const [isConsenting, setIsConsenting] = useState(false);
  const [isRejecting, setIsRejecting] = useState(false);
  const [showRejectForm, setShowRejectForm] = useState(false);
  const [rejectReason, setRejectReason] = useState("");

  // Parse settlement items from server
  const settlementItems = (() => {
    try {
      if (contract.settlementItemsJson) {
        return JSON.parse(contract.settlementItemsJson) as { reason: string; amount: number; type?: string; locked?: boolean }[];
      }
    } catch { }
    return [];
  })();

  const totalDeduction = settlementItems.reduce((acc, item) => acc + (item.amount || 0), 0);
  const finalRefund = Math.max(0, (contract.depositAmount || 0) - totalDeduction);
  const proposalStatus = contract.settlementProposalStatus;

  const fmt = (n: number) => new Intl.NumberFormat("vi-VN").format(n);

  // Tenant consent handler
  const handleConsent = async () => {
    setIsConsenting(true);
    try {
      if (isWeb3 && contract.smartContractAddress) {
        toast.info("Đang ký đồng ý trên Blockchain... Vui lòng xác nhận MetaMask.");
        await consentEndContract(contract.smartContractAddress);
        toast.success("Đã ký đồng ý trên Blockchain!");
      }
      await contractApi.consentSettlement(contract.id);
      toast.success("Đã đồng ý quyết toán!");
      await onRefresh();
    } catch (err: any) {
      toast.error(err?.message || "Lỗi khi đồng ý quyết toán");
    } finally {
      setIsConsenting(false);
    }
  };

  // Tenant reject handler
  const handleReject = async () => {
    setIsRejecting(true);
    try {
      await contractApi.rejectSettlement(contract.id, { reason: rejectReason });
      toast.success("Đã từ chối đề xuất. Chủ trọ sẽ nhận thông báo.");
      setShowRejectForm(false);
      await onRefresh();
    } catch (err: any) {
      toast.error(err?.message || "Lỗi khi từ chối quyết toán");
    } finally {
      setIsRejecting(false);
    }
  };

  // No proposal yet
  if (!proposalStatus || proposalStatus === "TENANT_REJECTED") {
    return (
      <div className="text-center py-10 space-y-4">
        <div className="mx-auto w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center">
          <Clock className="h-8 w-8 text-gray-400" />
        </div>
        {proposalStatus === "TENANT_REJECTED" ? (
          <>
            <h3 className="text-lg font-bold text-red-800">Đề xuất đã bị từ chối</h3>
            <p className="text-sm text-gray-500 max-w-sm mx-auto">
              {isLandlord
                ? "Khách thuê đã từ chối đề xuất quyết toán của bạn. Vui lòng chỉnh sửa và gửi lại."
                : "Bạn đã từ chối đề xuất. Đang chờ chủ trọ gửi đề xuất mới."}
            </p>
            {isLandlord && (
              <Button onClick={onBack} className="mt-4">Chỉnh sửa đề xuất</Button>
            )}
          </>
        ) : (
          <>
            <h3 className="text-lg font-bold text-gray-700">Chưa có đề xuất quyết toán</h3>
            <p className="text-sm text-gray-500">
              {isTenant
                ? "Đang chờ Chủ trọ gửi đề xuất quyết toán tiền cọc..."
                : "Vui lòng quay lại bước trước để gửi đề xuất."}
            </p>
          </>
        )}
      </div>
    );
  }

  // Both consented - show proceed button
  const bothConsented = contract.hasLandlordConsented && contract.hasTenantConsented;

  return (
    <div className="space-y-6">
      <div className="text-center space-y-2">
        <div className="mx-auto w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center">
          <AlertTriangle className="h-8 w-8 text-blue-600" />
        </div>
        <h3 className="text-xl font-bold">Xem lại Đề xuất Quyết toán</h3>
        <p className="text-sm text-muted-foreground">
          {isLandlord
            ? (proposalStatus === "TENANT_ACCEPTED"
              ? "Khách thuê đã đồng ý! Bạn có thể tiến hành kết thúc hợp đồng."
              : "Đang chờ khách thuê xem và xác nhận đề xuất của bạn.")
            : "Vui lòng xem kỹ các khoản khấu trừ bên dưới trước khi xác nhận."}
        </p>
      </div>

      {/* Consent Status */}
      <div className="grid grid-cols-2 gap-3">
        <div className={`p-3 rounded-xl text-center border-2 ${contract.hasLandlordConsented ? "bg-green-50 border-green-200 text-green-700" : "bg-gray-50 border-gray-100 text-gray-400"}`}>
          <p className="text-[10px] font-bold uppercase mb-1">Chủ trọ</p>
          <p className="text-sm font-black flex items-center justify-center gap-1">
            {contract.hasLandlordConsented ? <><CheckCircle2 className="w-4 h-4" /> Đã ký</> : "⏳ Đang chờ"}
          </p>
        </div>
        <div className={`p-3 rounded-xl text-center border-2 ${contract.hasTenantConsented ? "bg-green-50 border-green-200 text-green-700" : "bg-gray-50 border-gray-100 text-gray-400"}`}>
          <p className="text-[10px] font-bold uppercase mb-1">Khách thuê</p>
          <p className="text-sm font-black flex items-center justify-center gap-1">
            {contract.hasTenantConsented ? <><CheckCircle2 className="w-4 h-4" /> Đã ký</> : "⏳ Đang chờ"}
          </p>
        </div>
      </div>

      {/* Deduction Details from SERVER */}
      <div className="space-y-4 border rounded-2xl p-6 bg-gray-50/30">
        <div className="flex justify-between pb-4 border-b">
          <span className="text-gray-500">Tiền cọc ban đầu</span>
          <span className="font-bold">{fmt(contract.depositAmount || 0)}đ</span>
        </div>

        <div className="space-y-3">
          <span className="text-sm font-medium text-gray-500">Các khoản khấu trừ:</span>
          {settlementItems.map((item, idx) => (
            <div key={idx} className="flex justify-between text-sm">
              <span className="text-gray-700">
                {item.locked ? "🔒" : "•"} {item.reason}
              </span>
              <span className="text-red-600">-{fmt(item.amount)}đ</span>
            </div>
          ))}
          {settlementItems.length === 0 && (
            <p className="text-sm text-green-600 italic">Không có khoản khấu trừ nào.</p>
          )}
        </div>

        <div className="flex justify-between pt-4 border-t text-lg">
          <span className="font-bold">Số tiền hoàn lại</span>
          <span className="font-extrabold text-blue-600">{fmt(finalRefund)}đ</span>
        </div>
      </div>

      {/* Inspection note */}
      {contract.settlementInspectionNote && (
        <div className="p-4 bg-amber-50 rounded-xl border border-amber-100">
          <p className="text-xs font-bold text-amber-800 uppercase mb-1">Ghi chú kiểm kê</p>
          <p className="text-sm text-amber-900">{contract.settlementInspectionNote}</p>
        </div>
      )}

      {/* Tenant Actions */}
      {isTenant && proposalStatus === "PROPOSED" && !contract.hasTenantConsented && (
        <>
          {showRejectForm ? (
            <div className="space-y-3 p-4 border border-red-200 rounded-xl bg-red-50">
              <p className="text-sm font-bold text-red-800">Lý do từ chối (không bắt buộc)</p>
              <Textarea
                placeholder="Ví dụ: Không đồng ý khoản sửa chữa cửa..."
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
              />
              <div className="flex gap-2">
                <Button variant="outline" onClick={() => setShowRejectForm(false)} disabled={isRejecting}>Hủy</Button>
                <Button variant="destructive" onClick={handleReject} disabled={isRejecting}>
                  {isRejecting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                  Xác nhận từ chối
                </Button>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-4">
              <Button
                variant="outline"
                className="border-red-200 text-red-600 hover:bg-red-50"
                onClick={() => setShowRejectForm(true)}
              >
                <XCircle className="mr-2 h-4 w-4" /> Từ chối
              </Button>
              <Button
                className="bg-green-600 hover:bg-green-700"
                onClick={handleConsent}
                disabled={isConsenting}
              >
                {isConsenting ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <CheckCircle className="mr-2 h-4 w-4" />
                )}
                Đồng ý Quyết toán
              </Button>
            </div>
          )}
        </>
      )}

      {/* Landlord view */}
      {isLandlord && proposalStatus === "PROPOSED" && !bothConsented && (
        <div className="flex flex-col gap-3">
          <p className="text-xs text-center text-gray-400 italic">
            Hệ thống đã gửi thông báo đến khách thuê. Bạn sẽ nhận được kết quả ngay khi khách phản hồi.
          </p>
          <Button variant="outline" className="w-full" onClick={onBack}>Chỉnh sửa đề xuất</Button>
        </div>
      )}

      {/* Both consented - proceed to payout */}
      {bothConsented && (
        <Button
          className="w-full bg-indigo-600 hover:bg-indigo-700 h-12 text-lg"
          onClick={() => onGoToStep("PAYOUT")}
        >
          🚀 Tiến hành Thực thi Kết thúc Hợp đồng
        </Button>
      )}
    </div>
  );
}

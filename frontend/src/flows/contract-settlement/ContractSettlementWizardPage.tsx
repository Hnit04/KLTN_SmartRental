import { useCallback, useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { PageHeader } from "@/components/ui/PageHeader";
import { toast } from "sonner";
import { contractApi } from "@/api/contractApi";
import type { Contract } from "@/types";
import { useAuth } from "@/context/AuthContext";
import { useContractSettlementFlow } from "@/flows/contract-settlement/hooks/useContractSettlementFlow";
import {
  SettlementProgress,
  SettlementStepInspection,
  SettlementStepDeduction,
  SettlementStepReview,
  SettlementStepPayout,
} from "@/flows/contract-settlement/components";

export default function ContractSettlementWizardPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();

  const contractId = Number(id);
  const basePath = user?.role === "LANDLORD" ? "/landlord" : "/tenant";

  const [contract, setContract] = useState<Contract | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const {
    context,
    lastSavedAt,
    goBack,
    goToStep,
    submitInspection,
    setDeductions,
    resetDraft,
  } = useContractSettlementFlow(contractId);

  const fetchContract = useCallback(async () => {
    try {
      setIsLoading(true);
      const res = await contractApi.getDetail(contractId);
      setContract((res as any).data ?? res);
    } catch (error: any) {
      toast.error(error?.response?.data?.message || "Không tải được dữ liệu hợp đồng");
      navigate(-1);
    } finally {
      setIsLoading(false);
    }
  }, [contractId, navigate]);

  const refreshContract = useCallback(async () => {
    try {
      const res = await contractApi.getDetail(contractId);
      setContract((res as any).data ?? res);
    } catch (e) {
      // silent refresh failure
    }
  }, [contractId]);

  useEffect(() => {
    if (!id || Number.isNaN(contractId)) {
      toast.error("Không tìm thấy hợp đồng");
      navigate(-1);
      return;
    }
    fetchContract();
  }, [contractId, fetchContract, id, navigate]);

  // Auto-navigate tenant to REVIEW step if proposal exists
  useEffect(() => {
    if (!contract || !user) return;
    if (user.role === "TENANT" && contract.settlementProposalStatus) {
      if (contract.settlementProposalStatus === "PROPOSED" || contract.settlementProposalStatus === "TENANT_ACCEPTED") {
        if (context.step === "INSPECTION" || context.step === "DEDUCTION") {
          goToStep("REVIEW");
        }
      }
      if (contract.settlementProposalStatus === "COMPLETED") {
        goToStep("PAYOUT");
      }
    }
  }, [contract, user, context.step, goToStep]);

  // Auto-refresh for REVIEW step (polling every 10s)
  useEffect(() => {
    if (context.step !== "REVIEW") return;
    const interval = setInterval(refreshContract, 10000);
    return () => clearInterval(interval);
  }, [context.step, refreshContract]);

  if (isLoading || !contract) {
    return <div className="p-4 text-sm text-muted-foreground">Đang tải quy trình quyết toán...</div>;
  }

  const isWeb3 = contract.signMethod === "BLOCKCHAIN";
  const isEarlyTermination = contract.status === "TERMINATED_EARLY" || (contract.endDate && new Date(contract.endDate) > new Date());
  const isLandlord = user?.role === "LANDLORD";
  const isTenant = user?.role === "TENANT";

  // Role-based step access
  const canAccessStep = (step: string) => {
    if (step === "INSPECTION" || step === "DEDUCTION") return isLandlord;
    return true; // REVIEW and PAYOUT accessible to both
  };

  return (
    <div className="mx-auto w-full max-w-5xl space-y-6 px-3 py-4 sm:px-4">
      <div className="flex items-center justify-between gap-3">
        <Button type="button" variant="outline" onClick={() => navigate(`${basePath}/contracts/${contract.id}`)}>
          <ArrowLeft className="h-4 w-4" />
          Về chi tiết hợp đồng
        </Button>
        {isLandlord && (
          <Button type="button" variant="ghost" onClick={resetDraft}>
            Reset draft
          </Button>
        )}
      </div>

      <PageHeader
        title="Quyết toán Hợp đồng"
        description={`Hợp đồng #${contract.id} · ${contract.roomName} · ${lastSavedAt ? `Đã lưu: ${new Date(lastSavedAt).toLocaleTimeString("vi-VN")}` : "Bản nháp"}`}
      />

      <SettlementProgress currentStep={context.step} onJump={(step) => {
        if (canAccessStep(step)) goToStep(step);
        else toast.error("Bạn không có quyền truy cập bước này.");
      }} />

      <div className="bg-white rounded-2xl border shadow-sm p-6 min-h-[400px]">
        {context.step === "INSPECTION" && (
          canAccessStep("INSPECTION") ? (
            <SettlementStepInspection
              initialData={context.lastReading ? {
                electricityUsage: context.lastReading.electricity,
                waterUsage: context.lastReading.water,
                note: context.lastReading.note,
              } : undefined}
              elecPrice={contract.elecPrice || 0}
              waterPrice={contract.waterPrice || 0}
              internetPrice={contract.internetPrice || 0}
              onComplete={(data) => {
                submitInspection({
                  electricity: data.electricityUsage,
                  water: data.waterUsage,
                  note: data.note,
                }, data.utilityBill);
              }}
            />
          ) : (
            <div className="text-center py-10 text-gray-500">
              <p className="font-medium">Chưa có đề xuất quyết toán từ chủ trọ.</p>
              <p className="text-sm mt-1">Đang chờ chủ trọ kiểm kê và gửi đề xuất...</p>
            </div>
          )
        )}

        {context.step === "DEDUCTION" && (
          canAccessStep("DEDUCTION") ? (
            <SettlementStepDeduction
              contractId={contractId}
              depositAmount={contract.depositAmount || 0}
              utilityBill={context.utilityBill}
              inspectionNote={context.lastReading?.note}
              items={context.deductions}
              isWeb3={isWeb3}
              smartContractAddress={contract.smartContractAddress}
              isEarlyTermination={!!isEarlyTermination}
              onComplete={(items) => setDeductions(items)}
              onBack={goBack}
              onRefresh={refreshContract}
            />
          ) : (
            <div className="text-center py-10 text-gray-500">
              <p className="font-medium">Đang chờ chủ trọ gửi đề xuất khấu trừ...</p>
            </div>
          )
        )}

        {context.step === "REVIEW" && (
          <SettlementStepReview
            contract={contract}
            role={user?.role || "TENANT"}
            onBack={goBack}
            onRefresh={refreshContract}
            onGoToStep={goToStep as any}
          />
        )}

        {context.step === "PAYOUT" && (
          <SettlementStepPayout
            contract={contract}
            onRefresh={refreshContract}
            onBack={goBack}
          />
        )}
      </div>

      {context.step !== "INSPECTION" && context.step !== "PAYOUT" && isLandlord && (
        <div className="flex flex-wrap gap-2">
          <Button type="button" variant="outline" onClick={goBack}>
            Quay lại
          </Button>
        </div>
      )}
    </div>
  );
}

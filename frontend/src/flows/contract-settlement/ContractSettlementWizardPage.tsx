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
    goNext,
    goToStep,
    submitInspection,
    setDeductions,
    setTenantAction,
    markSettled,
    setError,
    clearError,
    resetDraft,
  } = useContractSettlementFlow(contractId);

  const fetchContract = useCallback(async () => {
    try {
      setIsLoading(true);
      const res = await contractApi.getDetail(contractId);
      setContract(res as any);
    } catch (error: any) {
      toast.error(error?.response?.data?.message || "Không tải được dữ liệu hợp đồng");
      navigate(-1);
    } finally {
      setIsLoading(false);
    }
  }, [contractId, navigate]);

  useEffect(() => {
    if (!id || Number.isNaN(contractId)) {
      toast.error("Không tìm thấy hợp đồng");
      navigate(-1);
      return;
    }
    fetchContract();
  }, [contractId, fetchContract, id, navigate]);

  if (isLoading || !contract) {
    return <div className="p-4 text-sm text-muted-foreground">Đang tải quy trình quyết toán...</div>;
  }

  return (
    <div className="mx-auto w-full max-w-5xl space-y-6 px-3 py-4 sm:px-4">
      <div className="flex items-center justify-between gap-3">
        <Button type="button" variant="outline" onClick={() => navigate(`${basePath}/contracts/${contract.id}`)}>
          <ArrowLeft className="h-4 w-4" />
          Về chi tiết hợp đồng
        </Button>
        <Button type="button" variant="ghost" onClick={resetDraft}>
          Reset draft
        </Button>
      </div>

      <PageHeader
        title="Quyết toán Hợp đồng"
        description={`Hợp đồng #${contract.id} · ${contract.roomName} · ${lastSavedAt ? `Đã lưu: ${new Date(lastSavedAt).toLocaleTimeString("vi-VN")}` : "Bản nháp"}`}
      />

      <SettlementProgress currentStep={context.step} onJump={goToStep} />

      <div className="bg-white rounded-2xl border shadow-sm p-6 min-h-[400px]">
        {context.step === "INSPECTION" && (
          <SettlementStepInspection
            initialData={context.lastReading}
            onComplete={submitInspection}
          />
        )}

        {context.step === "DEDUCTION" && (
          <SettlementStepDeduction
            depositAmount={contract.depositAmount || 0}
            items={context.deductions}
            onComplete={setDeductions}
            onBack={goBack}
          />
        )}

        {context.step === "REVIEW" && (
          <SettlementStepReview
            contract={contract}
            context={context}
            role={user?.role || "TENANT"}
            onAction={setTenantAction}
            onBack={goBack}
          />
        )}

        {context.step === "PAYOUT" && (
          <SettlementStepPayout
            contract={contract}
            context={context}
            onSuccess={markSettled}
            onBack={goBack}
          />
        )}
      </div>

      <div className="flex flex-wrap gap-2">
        {context.step !== "INSPECTION" && context.step !== "PAYOUT" && (
          <Button type="button" variant="outline" onClick={goBack}>
            Quay lại
          </Button>
        )}
      </div>
    </div>
  );
}

import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { PageHeader } from "@/components/ui/PageHeader";
import { toast } from "sonner";
import { contractApi } from "@/api/contractApi";
import type { Contract, ContractSignMethod } from "@/types";
import { useAuth } from "@/context/AuthContext";
import { useSystemConfig } from "@/context/SystemConfigContext";
import { trackEvent } from "@/utils/analytics";
import {
  getBlockchainRuntimeConfig,
  isWalletOnExpectedChain,
} from "@/config/blockchainConfig";
import type { BlockchainRuntimeConfig } from "@/config/blockchainConfig";
import { useContractSigningFlow } from "@/flows/contract-signing/hooks/useContractSigningFlow";
import {
  ContractSigningProgress,
  ContractSigningStepMethod,
  ContractSigningStepPayment,
  ContractSigningStepReview,
  ContractSigningStepSign,
} from "@/flows/contract-signing/components";

async function requestBlockchainSignature(params: {
  contractHash: string;
  runtimeConfig: BlockchainRuntimeConfig;
  walletAddress?: string;
}) {
  const ethereum = (window as any).ethereum as any;
  if (!ethereum) throw new Error("Vui lòng cài MetaMask để dùng ký blockchain.");

  try {
    await ethereum.request({
      method: "wallet_switchEthereumChain",
      params: [{ chainId: params.runtimeConfig.chainIdHex }],
    });
  } catch (switchError: any) {
    if (switchError?.code !== 4902) throw switchError;
    await ethereum.request({
      method: "wallet_addEthereumChain",
      params: [
        {
          chainId: params.runtimeConfig.chainIdHex,
          chainName: params.runtimeConfig.chainName,
          nativeCurrency: params.runtimeConfig.nativeCurrency,
          rpcUrls: [params.runtimeConfig.rpcUrl],
          blockExplorerUrls: [params.runtimeConfig.explorerUrl],
        },
      ],
    });
  }

  await ethereum.request({ method: "eth_requestAccounts" });
  const accounts: string[] = await ethereum.request({ method: "eth_accounts" });
  const connectedWallet = accounts?.[0];
  if (!connectedWallet) throw new Error("Không lấy được địa chỉ ví để ký.");

  if (
    params.walletAddress &&
    connectedWallet.toLowerCase() !== params.walletAddress.toLowerCase()
  ) {
    throw new Error("Ví đang kết nối không trùng với ví đã đăng ký trong hồ sơ.");
  }

  const chainHex: string | undefined = await ethereum.request({ method: "eth_chainId" });
  if (!isWalletOnExpectedChain(chainHex, params.runtimeConfig)) {
    throw new Error(`Ví chưa ở đúng mạng ${params.runtimeConfig.chainName}.`);
  }

  const signature = await ethereum.request({
    method: "personal_sign",
    params: [params.contractHash, connectedWallet],
  });

  if (!signature) throw new Error("Bạn đã từ chối ký giao dịch.");
  return { walletAddress: connectedWallet, signature };
}

export default function ContractSigningWizardPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { config } = useSystemConfig();

  const runtimeConfig = useMemo(() => getBlockchainRuntimeConfig(config), [config]);
  const contractId = Number(id);
  const basePath = user?.role === "LANDLORD" ? "/landlord" : "/tenant";
  const v2Enabled = (import.meta.env.VITE_CONTRACT_SIGNING_V2 ?? "true") !== "false";

  const [contract, setContract] = useState<Contract | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSigning, setIsSigning] = useState(false);
  const [isQuickPaying, setIsQuickPaying] = useState(false);
  const [paymentNote, setPaymentNote] = useState<string | null>(null);
  const [methodSeeded, setMethodSeeded] = useState(false);

  const {
    context,
    lastSavedAt,
    goBack,
    goNext,
    goToStep,
    setMethod,
    markSigned,
    setPaymentState,
    setError,
    clearError,
    resetDraft,
  } = useContractSigningFlow(contractId, "TRADITIONAL");

  const fetchContract = useCallback(async () => {
    const res = await contractApi.getDetail(contractId);
    const data = (res as any).data || res;
    setContract(data);
    if (data.depositStatus === "DEPOSITED") {
      setPaymentState("synced");
    }
  }, [contractId, setPaymentState]);

  useEffect(() => {
    if (!v2Enabled) {
      navigate(`${basePath}/contracts/${contractId}`, { replace: true });
      return;
    }
    if (!id || Number.isNaN(contractId)) {
      toast.error("Không tìm thấy hợp đồng");
      navigate(-1);
      return;
    }

    let mounted = true;
    const run = async () => {
      try {
        setIsLoading(true);
        await fetchContract();
      } catch (error: any) {
        if (!mounted) return;
        toast.error(error?.response?.data?.message || "Không tải được dữ liệu hợp đồng");
      } finally {
        if (mounted) setIsLoading(false);
      }
    };
    run();
    return () => {
      mounted = false;
    };
  }, [basePath, contractId, fetchContract, id, navigate, v2Enabled]);

  useEffect(() => {
    if (!contract || methodSeeded) return;
    if (contract.signMethod === "TRADITIONAL" || contract.signMethod === "BLOCKCHAIN") {
      setMethod(contract.signMethod);
      setMethodSeeded(true);
    }
  }, [contract, methodSeeded, setMethod]);

  const handleSign = useCallback(async () => {
    if (!contract) return;
    setIsSigning(true);
    clearError();
    trackEvent("sign_started", { contractId: contract.id, method: context.selectedMethod });
    try {
      let signature: string | undefined;
      if (context.selectedMethod === "BLOCKCHAIN") {
        if (!contract.contractHash) {
          throw new Error("Hợp đồng chưa có hash để ký blockchain. Vui lòng thử lại sau.");
        }
        const signed = await requestBlockchainSignature({
          contractHash: contract.contractHash,
          runtimeConfig,
          walletAddress: user?.walletAddress,
        });
        signature = signed.signature;
      }

      await contractApi.signContract(contract.id, {
        signMethod: context.selectedMethod,
        signature,
      });

      const signedAt = new Date().toISOString();
      markSigned(signedAt);
      trackEvent("sign_success", { contractId: contract.id, method: context.selectedMethod });
      toast.success("Đã ký hợp đồng thành công.");
      await fetchContract();
    } catch (error: any) {
      const message =
        error?.response?.data?.message ||
        error?.reason ||
        error?.message ||
        "Không thể ký hợp đồng lúc này.";
      setError(message);
      toast.error(message);
    } finally {
      setIsSigning(false);
    }
  }, [
    clearError,
    context.selectedMethod,
    contract,
    fetchContract,
    markSigned,
    runtimeConfig.chainIdHex,
    runtimeConfig.chainName,
    runtimeConfig.explorerUrl,
    runtimeConfig.rpcUrl,
    setError,
    user?.walletAddress,
  ]);

  const handleFallbackTraditional = useCallback(() => {
    setMethod("TRADITIONAL");
    clearError();
    trackEvent("sign_fallback_traditional", { contractId, from: "BLOCKCHAIN" });
    toast.info("Đã chuyển sang ký truyền thống.");
  }, [clearError, contractId, setMethod]);

  const handleQuickPaymentConfirm = useCallback(async () => {
    if (!contract) return;
    if (context.selectedMethod === "BLOCKCHAIN") {
      setPaymentNote("Với blockchain, hãy mở Payment Intent để đồng bộ Transaction Hash.");
      setPaymentState("initiated");
      return;
    }

    setIsQuickPaying(true);
    setPaymentState("pending");
    try {
      trackEvent("payment_started", { contractId: contract.id, method: context.selectedMethod });
      await contractApi.confirmTraditionalDeposit(contract.id);
      await fetchContract();
      setPaymentState("synced");
      setPaymentNote("Đã xác nhận cọc thành công.");
      trackEvent("payment_success", { contractId: contract.id, method: context.selectedMethod });
      toast.success("Đã xác nhận thanh toán cọc.");
    } catch (error: any) {
      const message = error?.response?.data?.message || "Không thể xác nhận thanh toán lúc này.";
      setPaymentState("failed");
      setPaymentNote(message);
      trackEvent("payment_failed", { contractId: contract.id, method: context.selectedMethod, message });
      toast.error(message);
    } finally {
      setIsQuickPaying(false);
    }
  }, [context.selectedMethod, contract, fetchContract, setPaymentState]);

  const openPaymentIntent = useCallback(() => {
    navigate(
      `${basePath}/contracts/${contractId}/payment-intent?method=${context.selectedMethod}`
    );
  }, [basePath, context.selectedMethod, contractId, navigate]);

  if (isLoading || !contract) {
    return <div className="p-4 text-sm text-muted-foreground">Đang tải contract wizard...</div>;
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
        title="Contract Signing Wizard"
        description={`Hợp đồng #${contract.id} · Lưu nháp tự động${lastSavedAt ? ` · ${new Date(lastSavedAt).toLocaleTimeString("vi-VN")}` : ""}`}
      />

      <ContractSigningProgress currentStep={context.step} onJump={goToStep} />

      {context.step === "REVIEW" && (
        <ContractSigningStepReview
          contract={contract}
          selectedMethod={context.selectedMethod}
          onAdjustMethod={() => goToStep("METHOD")}
        />
      )}

      {context.step === "METHOD" && (
        <ContractSigningStepMethod
          value={context.selectedMethod}
          onChange={(method) => {
            setMethod(method);
            trackEvent("contract_method_selected", { contractId: contract.id, method, source: "wizard" });
          }}
        />
      )}

      {context.step === "SIGN" && (
        <ContractSigningStepSign
          selectedMethod={context.selectedMethod}
          isSubmitting={isSigning}
          lastError={context.lastError}
          signedAt={context.signedAt}
          onSign={handleSign}
          onFallbackTraditional={handleFallbackTraditional}
        />
      )}

      {context.step === "PAYMENT" && (
        <ContractSigningStepPayment
          method={context.selectedMethod}
          paymentState={context.paymentState}
          note={paymentNote || context.lastError}
          updatedAt={lastSavedAt}
          isSubmitting={isQuickPaying}
          onRetry={() => {
            setPaymentState("initiated");
            clearError();
            setPaymentNote(null);
          }}
          onSupport={() => navigate("/contact")}
          onConfirmQuick={handleQuickPaymentConfirm}
          onOpenPaymentIntent={openPaymentIntent}
        />
      )}

      <div className="flex flex-wrap gap-2">
        {context.step !== "REVIEW" && (
          <Button type="button" variant="outline" onClick={goBack}>
            Quay lại
          </Button>
        )}
        {context.step !== "PAYMENT" && (
          <Button type="button" onClick={goNext}>
            Tiếp tục
          </Button>
        )}
      </div>
    </div>
  );
}

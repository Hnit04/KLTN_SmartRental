import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { ethers } from "ethers";
import { toast } from "sonner";
import { contractApi } from "@/api/contractApi";
import { useAuth } from "@/context/AuthContext";
import { useSystemConfig } from "@/context/SystemConfigContext";
import { getBlockchainRuntimeConfig, isWalletOnExpectedChain } from "@/config/blockchainConfig";
import type { BlockchainRuntimeConfig } from "@/config/blockchainConfig";
import { featureFlags } from "@/config/featureFlags";
import type { Contract } from "@/types";
import { trackEvent } from "@/utils/analytics";
import { depositContract } from "@/utils/contractHelper";
import { Button } from "@/components/ui/Button";
import { PageHeader } from "@/components/ui/PageHeader";
import RiskNotice from "@/components/shared/RiskNotice";
import { useContractSigningFlow } from "@/flows/contract-signing/hooks/useContractSigningFlow";
import {
  BlockchainQuickGuideSheet,
  ContractSigningProgress,
  ContractSigningStepMethod,
  ContractSigningStepPayment,
  ContractSigningStepReview,
  ContractSigningStepSign,
} from "@/flows/contract-signing/components";
import {
  canAccessContractSigningWizard,
  canPayDeposit,
  canSignContract,
  resolveContractSigningStep,
} from "@/features/contract/utils/contractFlowGuards";

type WalletGuideState = {
  isProviderAvailable: boolean;
  connectedAddress: string | null;
  walletChainIdHex: string | null;
  isExpectedNetwork: boolean;
  registeredAddress: string | null;
  isWalletMatched: boolean;
};

async function requestBlockchainSignature(params: {
  contractHash: string;
  runtimeConfig: BlockchainRuntimeConfig;
  walletAddress?: string;
}) {
  const ethereum = (window as any).ethereum as any;
  if (!ethereum) throw new Error("Vui long cai MetaMask truoc khi ky blockchain.");

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
  if (!connectedWallet) throw new Error("Khong lay duoc dia chi vi de ky.");

  if (params.walletAddress && connectedWallet.toLowerCase() !== params.walletAddress.toLowerCase()) {
    throw new Error("Vi dang ket noi khong trung voi vi da dang ky.");
  }

  const chainHex: string | undefined = await ethereum.request({ method: "eth_chainId" });
  if (!isWalletOnExpectedChain(chainHex, params.runtimeConfig)) {
    throw new Error(`Vi chua o dung mang ${params.runtimeConfig.chainName}.`);
  }

  const signature = await ethereum.request({
    method: "personal_sign",
    params: [params.contractHash, connectedWallet],
  });

  if (!signature) throw new Error("Ban da tu choi ky giao dich.");
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
  const detailPath = `${basePath}/contracts/${contractId}`;

  const chainRiskMessage = useMemo(() => {
    const envChainId = (import.meta.env.VITE_BLOCKCHAIN_CHAIN_ID as string | undefined)?.toLowerCase();
    if (!envChainId) return null;
    if (envChainId !== runtimeConfig.chainIdHex.toLowerCase()) {
      return `Mang frontend (${envChainId}) khac backend (${runtimeConfig.chainIdHex}). Vui long dong bo cau hinh truoc khi ky blockchain.`;
    }
    return null;
  }, [runtimeConfig.chainIdHex]);

  const [contract, setContract] = useState<Contract | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSigning, setIsSigning] = useState(false);
  const [isQuickPaying, setIsQuickPaying] = useState(false);
  const [paymentNote, setPaymentNote] = useState<string | null>(null);
  const [methodSeeded, setMethodSeeded] = useState(false);
  const [isGuideOpen, setIsGuideOpen] = useState(false);
  const [hasAutoOpenedGuide, setHasAutoOpenedGuide] = useState(false);
  const [isWalletRefreshing, setIsWalletRefreshing] = useState(false);
  const [isWalletConnecting, setIsWalletConnecting] = useState(false);
  const [walletGuideState, setWalletGuideState] = useState<WalletGuideState>({
    isProviderAvailable: false,
    connectedAddress: null,
    walletChainIdHex: null,
    isExpectedNetwork: false,
    registeredAddress: null,
    isWalletMatched: true,
  });

  const {
    context,
    isHydrated,
    hasRecoveredDraft,
    lastSavedAt,
    goBack,
    goNext,
    goToStep,
    setMethod,
    markSigned,
    setPaymentState,
    setError,
    setTxHash,
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

  const refreshWalletGuideState = useCallback(async () => {
    const ethereum = (window as any).ethereum as any;
    const registeredAddress = user?.walletAddress || null;

    if (!ethereum) {
      setWalletGuideState({
        isProviderAvailable: false,
        connectedAddress: null,
        walletChainIdHex: null,
        isExpectedNetwork: false,
        registeredAddress,
        isWalletMatched: true,
      });
      return;
    }

    setIsWalletRefreshing(true);
    try {
      const [accountsResult, chainResult] = await Promise.all([
        ethereum.request({ method: "eth_accounts" }).catch(() => []),
        ethereum.request({ method: "eth_chainId" }).catch(() => null),
      ]);

      const accounts = Array.isArray(accountsResult) ? (accountsResult as string[]) : [];
      const connectedAddress = accounts[0] || null;
      const walletChainIdHex =
        typeof chainResult === "string" && chainResult.length > 0 ? chainResult : null;
      const isWalletMatched =
        !registeredAddress ||
        !connectedAddress ||
        connectedAddress.toLowerCase() === registeredAddress.toLowerCase();

      setWalletGuideState({
        isProviderAvailable: true,
        connectedAddress,
        walletChainIdHex,
        isExpectedNetwork: isWalletOnExpectedChain(walletChainIdHex ?? undefined, runtimeConfig),
        registeredAddress,
        isWalletMatched,
      });
    } finally {
      setIsWalletRefreshing(false);
    }
  }, [runtimeConfig, user?.walletAddress]);

  useEffect(() => {
    if (!featureFlags.contractSigningV2) {
      navigate(detailPath, { replace: true });
      return;
    }

    if (!id || Number.isNaN(contractId)) {
      toast.error("Khong tim thay hop dong hop le.");
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
        toast.error(error?.response?.data?.message || "Khong tai duoc du lieu hop dong.");
      } finally {
        if (mounted) setIsLoading(false);
      }
    };

    run();
    return () => {
      mounted = false;
    };
  }, [contractId, detailPath, fetchContract, id, navigate]);

  useEffect(() => {
    if (!contract || methodSeeded || !isHydrated || hasRecoveredDraft) return;
    if (contract.signMethod === "TRADITIONAL" || contract.signMethod === "BLOCKCHAIN") {
      setMethod(contract.signMethod);
      setMethodSeeded(true);
    }
  }, [contract, methodSeeded, isHydrated, hasRecoveredDraft, setMethod]);

  useEffect(() => {
    if (!contract) return;
    const targetStep = resolveContractSigningStep(contract);
    if (targetStep === "PAYMENT" && context.step !== "PAYMENT") {
      goToStep("PAYMENT");
      return;
    }
    if (targetStep === "SIGN" && context.step === "PAYMENT") {
      goToStep("SIGN");
    }
  }, [context.step, contract, goToStep]);

  // Poll for smart contract deployment when on PAYMENT step with BLOCKCHAIN method
  // The outbox processor deploys the contract async (every 10s), so we need to
  // refresh until smartContractAddress is available.
  const isDeployPending =
    context.step === "PAYMENT" &&
    context.selectedMethod === "BLOCKCHAIN" &&
    contract?.status === "AWAITING_DEPOSIT" &&
    !contract?.smartContractAddress;

  useEffect(() => {
    if (!isDeployPending) return;
    const interval = setInterval(() => {
      fetchContract();
    }, 5000);
    return () => clearInterval(interval);
  }, [isDeployPending, fetchContract]);

  useEffect(() => {
    if (context.step !== "SIGN" || context.selectedMethod !== "BLOCKCHAIN") return;
    void refreshWalletGuideState();

    if (!hasAutoOpenedGuide) {
      setIsGuideOpen(true);
      setHasAutoOpenedGuide(true);
      trackEvent("blockchain_guide_opened", { contractId, source: "auto_sign_step" });
    }
  }, [
    context.selectedMethod,
    context.step,
    contractId,
    hasAutoOpenedGuide,
    refreshWalletGuideState,
  ]);

  const canUseWizard = useMemo(
    () => (contract ? canAccessContractSigningWizard(contract) : false),
    [contract]
  );
  const canSignNow = useMemo(() => (contract ? canSignContract(contract) : false), [contract]);
  const canPayNow = useMemo(() => (contract ? canPayDeposit(contract) : false), [contract]);

  const handleSign = useCallback(async () => {
    if (!contract) return;

    if (!canSignNow) {
      toast.info("Hop dong hien tai khong o trang thai co the ky.");
      return;
    }

    if (context.selectedMethod === "BLOCKCHAIN" && chainRiskMessage) {
      setError(chainRiskMessage);
      toast.error(chainRiskMessage);
      return;
    }

    setIsSigning(true);
    clearError();
    trackEvent("sign_started", { contractId: contract.id, method: context.selectedMethod });

    try {
      let signature: string | undefined;
      if (context.selectedMethod === "BLOCKCHAIN") {
        if (!contract.contractHash) {
          throw new Error("Hop dong chua co hash de ky blockchain.");
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
      toast.success("Da ky hop dong thanh cong.");
      await fetchContract();
    } catch (error: any) {
      const message =
        error?.response?.data?.message ||
        error?.reason ||
        error?.message ||
        "Khong the ky hop dong luc nay.";
      setError(message);
      toast.error(message);
    } finally {
      setIsSigning(false);
    }
  }, [
    canSignNow,
    chainRiskMessage,
    clearError,
    context.selectedMethod,
    contract,
    fetchContract,
    markSigned,
    runtimeConfig,
    setError,
    user?.walletAddress,
  ]);

  const handleFallbackTraditional = useCallback(() => {
    setMethod("TRADITIONAL");
    clearError();
    setIsGuideOpen(false);
    trackEvent("sign_fallback_traditional", { contractId, from: "BLOCKCHAIN" });
    toast.info("Da chuyen sang ky truyen thong.");
  }, [clearError, contractId, setMethod]);

  const handleOpenGuide = useCallback(() => {
    setIsGuideOpen(true);
    trackEvent("blockchain_guide_opened", { contractId, source: "manual" });
    void refreshWalletGuideState();
  }, [contractId, refreshWalletGuideState]);

  const handleConnectWallet = useCallback(async () => {
    const ethereum = (window as any).ethereum as any;
    if (!ethereum) {
      toast.error("Chua phat hien MetaMask. Vui long cai vi truoc.");
      return;
    }

    setIsWalletConnecting(true);
    try {
      await ethereum.request({ method: "eth_requestAccounts" });
      await refreshWalletGuideState();
      toast.success("Da ket noi vi. Ban co the tiep tuc ky.");
    } catch (error: any) {
      const message = error?.message || "Khong the ket noi vi luc nay.";
      toast.error(message);
    } finally {
      setIsWalletConnecting(false);
    }
  }, [refreshWalletGuideState]);

  const handleQuickPaymentConfirm = useCallback(async () => {
    if (!contract) return;

    if (!canPayNow) {
      toast.info("Buoc dat coc chua san sang cho hop dong nay.");
      return;
    }

    if (context.selectedMethod === "BLOCKCHAIN" && chainRiskMessage) {
      setPaymentState("failed");
      setPaymentNote(chainRiskMessage);
      toast.error(chainRiskMessage);
      return;
    }

    setIsQuickPaying(true);
    setPaymentState("pending");
    clearError();

    try {
      trackEvent("payment_started", { contractId: contract.id, method: context.selectedMethod });

      if (context.selectedMethod === "BLOCKCHAIN") {
        if (!contract.smartContractAddress) {
          throw new Error("Chua co dia chi smart contract de dat coc blockchain.");
        }

        const rate = Number(config.vndEthRate || 0);
        if (rate <= 0) {
          throw new Error("Ty gia VND/ETH khong hop le. Vui long thu lai sau.");
        }

        const amountEth = ((contract.depositAmount || 0) / rate).toFixed(18);
        const amountWei = ethers.parseEther(amountEth).toString();

        await depositContract(contract.smartContractAddress, amountWei, (hash) => {
          setTxHash(hash);
          setPaymentNote("Da bat duoc giao dich. Dang cho blockchain xac nhan.");
        });

        setPaymentState("synced");
        setPaymentNote("Dat coc thanh cong va da dong bo.");
      } else {
        await contractApi.confirmTraditionalDeposit(contract.id);
        setPaymentState("synced");
        setPaymentNote("Da xac nhan dat coc truyen thong thanh cong.");
      }

      await fetchContract();
      trackEvent("payment_success", { contractId: contract.id, method: context.selectedMethod });
      toast.success("Thanh toan dat coc thanh cong.");
    } catch (error: any) {
      const message =
        error?.response?.data?.message ||
        error?.message ||
        "Khong the xac nhan thanh toan luc nay.";
      setPaymentState("failed");
      setPaymentNote(message);
      trackEvent("payment_failed", { contractId: contract.id, method: context.selectedMethod, message });
      toast.error(message);
    } finally {
      setIsQuickPaying(false);
    }
  }, [
    canPayNow,
    chainRiskMessage,
    clearError,
    config.vndEthRate,
    context.selectedMethod,
    contract,
    fetchContract,
    setPaymentState,
    setTxHash,
  ]);

  const openPaymentIntent = useCallback(() => {
    navigate(`${basePath}/contracts/${contractId}/payment-intent?method=${context.selectedMethod}`);
  }, [basePath, context.selectedMethod, contractId, navigate]);

  const handleNext = useCallback(() => {
    if (!contract) return;
    if (context.step === "SIGN" && !context.signedAt && !canPayNow) {
      toast.info("Vui long ky hop dong truoc khi sang buoc thanh toan.");
      return;
    }
    goNext();
  }, [canPayNow, context.signedAt, context.step, contract, goNext]);

  if (isLoading || !contract) {
    return <div className="p-4 text-sm text-muted-foreground">Dang tai contract wizard...</div>;
  }

  if (!canUseWizard) {
    return (
      <div className="mx-auto w-full max-w-3xl space-y-4 px-3 py-4 sm:px-4">
        <RiskNotice
          title="Flow khong kha dung"
          description="Hop dong da qua buoc ky/dat coc hoac khong phu hop de vao flow moi."
        />
        <div>
          <Button type="button" onClick={() => navigate(detailPath)}>
            Mo chi tiet hop dong
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-5xl space-y-6 px-3 py-4 sm:px-4">
      <div className="flex items-center justify-between gap-3">
        <Button type="button" variant="outline" onClick={() => navigate(detailPath)}>
          <ArrowLeft className="h-4 w-4" />
          Ve chi tiet hop dong
        </Button>
        <Button type="button" variant="ghost" onClick={resetDraft}>
          Reset draft
        </Button>
      </div>

      <PageHeader
        title="Wizard Ky Hop Dong"
        description={`Hop dong #${contract.id} - Luu nhap tu dong${
          lastSavedAt ? ` - ${new Date(lastSavedAt).toLocaleTimeString("vi-VN")}` : ""
        }`}
      />

      {chainRiskMessage && context.selectedMethod === "BLOCKCHAIN" && (
        <RiskNotice description={chainRiskMessage} onRetry={fetchContract} retryLabel="Tai lai" />
      )}

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
          lastError={context.lastError ?? (context.selectedMethod === "BLOCKCHAIN" ? chainRiskMessage : null)}
          signedAt={context.signedAt}
          onSign={handleSign}
          onFallbackTraditional={handleFallbackTraditional}
          onOpenGuide={handleOpenGuide}
        />
      )}

      {context.step === "PAYMENT" && (
        <ContractSigningStepPayment
          method={context.selectedMethod}
          paymentState={context.paymentState}
          txHash={context.txHash}
          explorerUrl={runtimeConfig.explorerUrl}
          note={paymentNote || context.lastError}
          updatedAt={lastSavedAt}
          isSubmitting={isQuickPaying}
          isDeployPending={isDeployPending}
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

      <BlockchainQuickGuideSheet
        open={isGuideOpen && context.selectedMethod === "BLOCKCHAIN"}
        onOpenChange={setIsGuideOpen}
        chainName={runtimeConfig.chainName}
        chainIdHex={runtimeConfig.chainIdHex}
        chainRiskMessage={chainRiskMessage}
        isProviderAvailable={walletGuideState.isProviderAvailable}
        connectedAddress={walletGuideState.connectedAddress}
        registeredAddress={walletGuideState.registeredAddress}
        walletChainIdHex={walletGuideState.walletChainIdHex}
        isWalletMatched={walletGuideState.isWalletMatched}
        isExpectedNetwork={walletGuideState.isExpectedNetwork}
        isConnecting={isWalletConnecting}
        isRefreshing={isWalletRefreshing}
        onConnectWallet={handleConnectWallet}
        onRefreshWalletState={refreshWalletGuideState}
        onSwitchTraditional={handleFallbackTraditional}
      />

      <div className="flex flex-wrap gap-2">
        {context.step !== "REVIEW" && (
          <Button type="button" variant="outline" onClick={goBack}>
            Quay lai
          </Button>
        )}
        {context.step !== "PAYMENT" && (
          <Button type="button" onClick={handleNext}>
            Tiep tuc
          </Button>
        )}
      </div>
    </div>
  );
}

import { Blocks, FileSignature, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/Button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/Dialog";
import RiskNotice from "@/components/shared/RiskNotice";
import WalletConnectStep from "@/flows/contract-signing/components/WalletConnectStep";
import NetworkMismatchNotice from "@/flows/contract-signing/components/NetworkMismatchNotice";

type BlockchainQuickGuideSheetProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  chainName: string;
  chainIdHex: string;
  chainRiskMessage: string | null;
  isProviderAvailable: boolean;
  connectedAddress: string | null;
  registeredAddress: string | null;
  walletChainIdHex: string | null;
  isWalletMatched: boolean;
  isExpectedNetwork: boolean;
  isConnecting: boolean;
  isRefreshing: boolean;
  onConnectWallet: () => Promise<void> | void;
  onRefreshWalletState: () => Promise<void> | void;
  onSwitchTraditional: () => void;
};

function StepItem({
  index,
  title,
  description,
}: {
  index: string;
  title: string;
  description: string;
}) {
  return (
    <div className="rounded-xl border border-border/70 bg-card/70 p-3">
      <p className="text-[11px] font-semibold uppercase tracking-wide text-primary">{index}</p>
      <p className="mt-1 text-sm font-semibold text-foreground">{title}</p>
      <p className="mt-1 text-xs text-muted-foreground">{description}</p>
    </div>
  );
}

export default function BlockchainQuickGuideSheet({
  open,
  onOpenChange,
  chainName,
  chainIdHex,
  chainRiskMessage,
  isProviderAvailable,
  connectedAddress,
  registeredAddress,
  walletChainIdHex,
  isWalletMatched,
  isExpectedNetwork,
  isConnecting,
  isRefreshing,
  onConnectWallet,
  onRefreshWalletState,
  onSwitchTraditional,
}: BlockchainQuickGuideSheetProps) {
  const showWalletMismatch = Boolean(connectedAddress && registeredAddress && !isWalletMatched);
  const showNetworkMismatch = Boolean(
    connectedAddress &&
      isProviderAvailable &&
      !isExpectedNetwork
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        size="lg"
        className="!left-0 !top-auto !bottom-0 !w-full !max-w-none !translate-x-0 !translate-y-0 rounded-t-2xl border-x-0 border-b-0 p-0 sm:!left-1/2 sm:!top-1/2 sm:!bottom-auto sm:!w-full sm:!max-w-3xl sm:!-translate-x-1/2 sm:!-translate-y-1/2 sm:rounded-2xl sm:border"
      >
        <div className="max-h-[88dvh] overflow-y-auto p-4 sm:p-6">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Blocks className="h-5 w-5 text-primary" />
              Huong dan ky blockchain (khong bat buoc)
            </DialogTitle>
            <DialogDescription>
              Blockchain la lop bao chung bo sung. Neu ban muon nhanh gon, ban van co the ky truyen thong.
            </DialogDescription>
          </DialogHeader>

          <div className="mt-4 grid gap-3 sm:grid-cols-3">
            <StepItem
              index="Step 1"
              title="Connect wallet"
              description="Ket noi MetaMask de kich hoat xac minh blockchain."
            />
            <StepItem
              index="Step 2"
              title="Verify network"
              description={`Dung ${chainName} (${chainIdHex}) de tranh sai lech giao dich.`}
            />
            <StepItem
              index="Step 3"
              title="Sign"
              description="Ky xac nhan de luu bang chung co the kiem chung."
            />
          </div>

          {chainRiskMessage && (
            <div className="mt-4">
              <RiskNotice description={chainRiskMessage} />
            </div>
          )}

          <div className="mt-4">
            <WalletConnectStep
              isProviderAvailable={isProviderAvailable}
              connectedAddress={connectedAddress}
              registeredAddress={registeredAddress}
              walletChainIdHex={walletChainIdHex}
              chainName={chainName}
              chainIdHex={chainIdHex}
              isWalletMatched={isWalletMatched}
              isExpectedNetwork={isExpectedNetwork}
              isConnecting={isConnecting}
              isRefreshing={isRefreshing}
              onConnect={onConnectWallet}
              onRefresh={onRefreshWalletState}
            />
          </div>

          {showWalletMismatch && (
            <div className="mt-4 rounded-xl border border-destructive/35 bg-destructive/10 p-3 text-xs text-foreground">
              Vi dang ket noi khong trung voi vi da dang ky. Vui long chon dung vi hoac chuyen sang ky truyen thong.
            </div>
          )}

          {showNetworkMismatch && (
            <div className="mt-4">
              <NetworkMismatchNotice
                expectedChainName={chainName}
                expectedChainIdHex={chainIdHex}
                walletChainIdHex={walletChainIdHex}
                onRetry={onRefreshWalletState}
                onSwitchTraditional={onSwitchTraditional}
              />
            </div>
          )}

          <div className="mt-5 grid gap-2 sm:grid-cols-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                onSwitchTraditional();
                onOpenChange(false);
              }}
            >
              <ShieldCheck className="h-4 w-4" />
              Chuyen sang ky truyen thong
            </Button>
            <Button type="button" onClick={() => onOpenChange(false)}>
              <FileSignature className="h-4 w-4" />
              Toi da hieu, tiep tuc ky
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}


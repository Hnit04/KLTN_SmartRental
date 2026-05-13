import { CheckCircle2, CircleDashed, RefreshCcw, Wallet } from "lucide-react";
import { Button } from "@/components/ui/Button";

type WalletConnectStepProps = {
  isProviderAvailable: boolean;
  connectedAddress: string | null;
  registeredAddress: string | null;
  walletChainIdHex: string | null;
  chainName: string;
  chainIdHex: string;
  isWalletMatched: boolean;
  isExpectedNetwork: boolean;
  isConnecting: boolean;
  isRefreshing: boolean;
  onConnect: () => Promise<void> | void;
  onRefresh: () => Promise<void> | void;
};

function shortAddress(address: string) {
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

function StepStatus({ done, label }: { done: boolean; label: string }) {
  return (
    <div className="flex items-center gap-2 text-xs">
      {done ? (
        <CheckCircle2 className="h-3.5 w-3.5 text-success" />
      ) : (
        <CircleDashed className="h-3.5 w-3.5 text-muted-foreground" />
      )}
      <span className={done ? "text-foreground" : "text-muted-foreground"}>{label}</span>
    </div>
  );
}

export default function WalletConnectStep({
  isProviderAvailable,
  connectedAddress,
  registeredAddress,
  walletChainIdHex,
  chainName,
  chainIdHex,
  isWalletMatched,
  isExpectedNetwork,
  isConnecting,
  isRefreshing,
  onConnect,
  onRefresh,
}: WalletConnectStepProps) {
  const hasConnectedWallet = Boolean(connectedAddress);
  const addressStatusDone = hasConnectedWallet && isWalletMatched;
  const networkStatusDone = hasConnectedWallet && isExpectedNetwork;

  return (
    <div className="space-y-3 rounded-xl border border-border/70 bg-background/70 p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="space-y-1">
          <p className="text-sm font-semibold text-foreground">Ket noi vi blockchain</p>
          <p className="text-xs text-muted-foreground">
            Ket noi vi chi khi ban chon ky blockchain. Ban van co the chuyen sang ky truyen thong bat cu luc nao.
          </p>
        </div>
        <div className="rounded-lg border border-border/60 bg-card/70 p-2">
          <Wallet className="h-4 w-4 text-primary" />
        </div>
      </div>

      {!isProviderAvailable ? (
        <div className="rounded-lg border border-warning/40 bg-warning/10 p-3 text-xs text-foreground">
          Chua phat hien MetaMask. Vui long cai extension roi quay lai buoc nay.
        </div>
      ) : (
        <div className="space-y-2 rounded-lg border border-border/60 bg-card/70 p-3 text-xs">
          <div className="flex items-center justify-between gap-3">
            <span className="text-muted-foreground">Vi dang ket noi</span>
            <span className="font-medium text-foreground">
              {connectedAddress ? shortAddress(connectedAddress) : "Chua ket noi"}
            </span>
          </div>

          {registeredAddress && (
            <div className="flex items-center justify-between gap-3">
              <span className="text-muted-foreground">Vi da dang ky</span>
              <span className="font-medium text-foreground">{shortAddress(registeredAddress)}</span>
            </div>
          )}

          <div className="flex items-center justify-between gap-3">
            <span className="text-muted-foreground">Mang can dung</span>
            <span className="font-medium text-foreground">
              {chainName} ({chainIdHex})
            </span>
          </div>

          <div className="flex items-center justify-between gap-3">
            <span className="text-muted-foreground">Mang hien tai</span>
            <span className="font-medium text-foreground">{walletChainIdHex || "Chua ket noi"}</span>
          </div>
        </div>
      )}

      <div className="grid gap-2 sm:grid-cols-3">
        <StepStatus done={hasConnectedWallet} label="1. Connect" />
        <StepStatus done={addressStatusDone} label="2. Verify address" />
        <StepStatus done={networkStatusDone} label="3. Verify network" />
      </div>

      <div className="flex flex-wrap gap-2">
        <Button
          type="button"
          size="sm"
          onClick={onConnect}
          isLoading={isConnecting}
          disabled={!isProviderAvailable}
        >
          Ket noi vi
        </Button>
        <Button
          type="button"
          size="sm"
          variant="outline"
          onClick={onRefresh}
          isLoading={isRefreshing}
          disabled={!isProviderAvailable}
        >
          <RefreshCcw className="h-3.5 w-3.5" />
          Tai trang thai vi
        </Button>
      </div>
    </div>
  );
}


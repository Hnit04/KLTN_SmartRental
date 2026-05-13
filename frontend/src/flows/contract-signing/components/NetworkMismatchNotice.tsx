import { AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/Button";

type NetworkMismatchNoticeProps = {
  expectedChainName: string;
  expectedChainIdHex: string;
  walletChainIdHex: string | null;
  onRetry?: () => Promise<void> | void;
  onSwitchTraditional?: () => void;
};

export default function NetworkMismatchNotice({
  expectedChainName,
  expectedChainIdHex,
  walletChainIdHex,
  onRetry,
  onSwitchTraditional,
}: NetworkMismatchNoticeProps) {
  return (
    <div className="rounded-xl border border-warning/40 bg-warning/10 p-4 text-foreground">
      <div className="flex items-start gap-3">
        <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-warning" />
        <div className="min-w-0 flex-1 space-y-2">
          <p className="text-sm font-semibold">Mang vi chua dung</p>
          <p className="text-xs leading-relaxed text-muted-foreground">
            He thong can {expectedChainName} ({expectedChainIdHex}) de tiep tuc ky blockchain.
            {walletChainIdHex ? ` Vi hien dang o ${walletChainIdHex}.` : ""}
          </p>
          <p className="text-xs leading-relaxed text-muted-foreground">
            Ban co the thu lai sau khi chuyen mang trong MetaMask, hoac chuyen sang ky truyen thong ma khong mat du lieu.
          </p>
          <div className="flex flex-wrap gap-2">
            {onRetry && (
              <Button type="button" size="sm" variant="outline" onClick={() => void onRetry()}>
                Kiem tra lai
              </Button>
            )}
            {onSwitchTraditional && (
              <Button type="button" size="sm" variant="ghost" onClick={onSwitchTraditional}>
                Chuyen sang truyen thong
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}


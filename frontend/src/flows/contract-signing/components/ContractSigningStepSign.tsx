import { AlertTriangle, CheckCircle2, FileSignature, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/Button";
import type { ContractSignMethod } from "@/types";

type ContractSigningStepSignProps = {
  selectedMethod: ContractSignMethod;
  isSubmitting: boolean;
  lastError: string | null;
  signedAt: string | null;
  onSign: () => Promise<void> | void;
  onFallbackTraditional: () => void;
  onOpenGuide?: () => void;
};

export default function ContractSigningStepSign({
  selectedMethod,
  isSubmitting,
  lastError,
  signedAt,
  onSign,
  onFallbackTraditional,
  onOpenGuide,
}: ContractSigningStepSignProps) {
  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-border bg-background p-4">
        <h3 className="text-sm font-semibold text-foreground">Buoc ky hop dong</h3>
        <p className="mt-1 text-sm text-muted-foreground">
          {selectedMethod === "BLOCKCHAIN"
            ? "Ket noi vi de ky va tao bang chung blockchain co the kiem chung."
            : "Ky dien tu truyen thong, nhanh va quen thuoc voi da so nguoi dung."}
        </p>
      </div>

      {lastError && (
        <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          <div className="flex items-start gap-2">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
            <p>{lastError}</p>
          </div>
          {selectedMethod === "BLOCKCHAIN" && (
            <Button type="button" variant="outline" className="mt-3" onClick={onFallbackTraditional}>
              Chuyen sang ky truyen thong
            </Button>
          )}
        </div>
      )}

      {signedAt ? (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4" />
            <p>Da ky thanh cong luc {new Date(signedAt).toLocaleString("vi-VN")}</p>
          </div>
        </div>
      ) : null}

      <div className="flex flex-wrap gap-2">
        <Button type="button" isLoading={isSubmitting} onClick={onSign}>
          <FileSignature className="h-4 w-4" />
          {selectedMethod === "BLOCKCHAIN" ? "Ky blockchain" : "Ky truyen thong"}
        </Button>
        {selectedMethod === "BLOCKCHAIN" && (
          <Button type="button" variant="outline" onClick={onOpenGuide}>
            Huong dan MetaMask
          </Button>
        )}
        {selectedMethod === "BLOCKCHAIN" && (
          <div className="inline-flex items-center gap-1 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">
            <ShieldCheck className="h-3.5 w-3.5" />
            Can vi dung mang truoc khi ky.
          </div>
        )}
      </div>
    </div>
  );
}

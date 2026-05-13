import { useCallback, useEffect, useMemo, useState } from "react";
import type { ContractSignMethod } from "@/types";
import {
  contractSigningTransition,
  createInitialContractSigningContext,
  type ContractSigningContext,
  type ContractSigningStep,
} from "@/flows/contract-signing/machine/contractSigningMachine";
import type { PaymentIntentState } from "@/flows/payment-intent/types";

const DRAFT_VERSION = 1;

type PersistedDraft = {
  version: number;
  context: ContractSigningContext;
};

function isValidStep(step: unknown): step is ContractSigningStep {
  return step === "REVIEW" || step === "METHOD" || step === "SIGN" || step === "PAYMENT";
}

function isValidMethod(value: unknown): value is ContractSignMethod {
  return value === "TRADITIONAL" || value === "BLOCKCHAIN";
}

function isValidPaymentState(value: unknown): value is PaymentIntentState {
  return (
    value === "initiated" ||
    value === "pending" ||
    value === "confirmed" ||
    value === "synced" ||
    value === "failed"
  );
}

function sanitizeContext(input: unknown): ContractSigningContext | null {
  if (!input || typeof input !== "object") return null;
  const raw = input as Record<string, unknown>;
  if (!isValidStep(raw.step)) return null;
  if (!isValidMethod(raw.selectedMethod)) return null;
  if (!isValidPaymentState(raw.paymentState)) return null;

  return {
    step: raw.step,
    selectedMethod: raw.selectedMethod,
    signedAt: typeof raw.signedAt === "string" ? raw.signedAt : null,
    paymentState: raw.paymentState,
    txHash: typeof raw.txHash === "string" ? raw.txHash : null,
    lastError: typeof raw.lastError === "string" ? raw.lastError : null,
    updatedAt: typeof raw.updatedAt === "number" ? raw.updatedAt : Date.now(),
  };
}

export function useContractSigningFlow(contractId: number, initialMethod: ContractSignMethod) {
  const storageKey = useMemo(
    () => `contract-signing-draft:v${DRAFT_VERSION}:${contractId}`,
    [contractId]
  );

  const [context, setContext] = useState<ContractSigningContext>(
    createInitialContractSigningContext(initialMethod)
  );
  const [isHydrated, setIsHydrated] = useState(false);
  const [hasRecoveredDraft, setHasRecoveredDraft] = useState(false);
  const [lastSavedAt, setLastSavedAt] = useState<string | null>(null);

  useEffect(() => {
    const fallback = createInitialContractSigningContext(initialMethod);
    try {
      const raw = localStorage.getItem(storageKey);
      if (!raw) {
        setContext(fallback);
        setHasRecoveredDraft(false);
        setIsHydrated(true);
        return;
      }

      const parsed: PersistedDraft = JSON.parse(raw);
      if (parsed.version !== DRAFT_VERSION) {
        setContext(fallback);
        setHasRecoveredDraft(false);
        setIsHydrated(true);
        return;
      }

      const sanitized = sanitizeContext(parsed.context);
      setContext(sanitized ?? fallback);
      setHasRecoveredDraft(Boolean(sanitized));
      setIsHydrated(true);
    } catch {
      setContext(fallback);
      setHasRecoveredDraft(false);
      setIsHydrated(true);
    }
  }, [initialMethod, storageKey]);

  useEffect(() => {
    if (!isHydrated) return;
    const timer = window.setTimeout(() => {
      const payload: PersistedDraft = { version: DRAFT_VERSION, context };
      localStorage.setItem(storageKey, JSON.stringify(payload));
      setLastSavedAt(new Date().toISOString());
    }, 400);
    return () => window.clearTimeout(timer);
  }, [context, isHydrated, storageKey]);

  const dispatch = useCallback((event: Parameters<typeof contractSigningTransition>[1]) => {
    setContext((prev) => contractSigningTransition(prev, event));
  }, []);

  const goNext = useCallback(() => dispatch({ type: "NEXT" }), [dispatch]);
  const goBack = useCallback(() => dispatch({ type: "BACK" }), [dispatch]);
  const goToStep = useCallback(
    (step: ContractSigningStep) => dispatch({ type: "GO_TO", step }),
    [dispatch]
  );
  const setMethod = useCallback(
    (method: ContractSignMethod) => dispatch({ type: "SELECT_METHOD", method }),
    [dispatch]
  );
  const markSigned = useCallback(
    (signedAt: string) => dispatch({ type: "SIGN_SUCCESS", signedAt }),
    [dispatch]
  );
  const setPaymentState = useCallback(
    (state: PaymentIntentState) => dispatch({ type: "PAYMENT_UPDATED", state }),
    [dispatch]
  );
  const setTxHash = useCallback(
    (hash: string) => dispatch({ type: "SET_TX_HASH", hash }),
    [dispatch]
  );
  const setError = useCallback(
    (message: string) => dispatch({ type: "FAIL", message }),
    [dispatch]
  );
  const clearError = useCallback(() => dispatch({ type: "CLEAR_ERROR" }), [dispatch]);

  const resetDraft = useCallback(() => {
    localStorage.removeItem(storageKey);
    setContext(createInitialContractSigningContext(initialMethod));
    setHasRecoveredDraft(false);
    setLastSavedAt(null);
  }, [initialMethod, storageKey]);

  return {
    context,
    isHydrated,
    hasRecoveredDraft,
    lastSavedAt,
    goNext,
    goBack,
    goToStep,
    setMethod,
    markSigned,
    setPaymentState,
    setTxHash,
    setError,
    clearError,
    resetDraft,
  };
}

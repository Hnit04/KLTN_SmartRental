import { useCallback, useEffect, useMemo, useState } from "react";
import {
  contractSettlementTransition,
  createInitialSettlementContext,
  type ContractSettlementContext,
  type ContractSettlementStep,
} from "@/flows/contract-settlement/machine/contractSettlementMachine";

const DRAFT_VERSION = 1;

type PersistedDraft = {
  version: number;
  context: ContractSettlementContext;
};

function isValidStep(step: unknown): step is ContractSettlementStep {
  return (
    step === "INSPECTION" || step === "DEDUCTION" || step === "REVIEW" || step === "PAYOUT"
  );
}

function sanitizeContext(input: unknown): ContractSettlementContext | null {
  if (!input || typeof input !== "object") return null;
  const raw = input as Record<string, unknown>;
  if (!isValidStep(raw.step)) return null;

  return {
    step: raw.step,
    lastReading: raw.lastReading as any,
    deductions: Array.isArray(raw.deductions) ? raw.deductions : [],
    isTenantAgreed: !!raw.isTenantAgreed,
    txHash: typeof raw.txHash === "string" ? raw.txHash : null,
    settledAt: typeof raw.settledAt === "string" ? raw.settledAt : null,
    lastError: typeof raw.lastError === "string" ? raw.lastError : null,
    updatedAt: typeof raw.updatedAt === "number" ? raw.updatedAt : Date.now(),
  };
}

export function useContractSettlementFlow(contractId: number) {
  const storageKey = useMemo(
    () => `contract-settlement-draft:v${DRAFT_VERSION}:${contractId}`,
    [contractId]
  );

  const [context, setContext] = useState<ContractSettlementContext>(
    createInitialSettlementContext()
  );
  const [isHydrated, setIsHydrated] = useState(false);
  const [lastSavedAt, setLastSavedAt] = useState<string | null>(null);

  useEffect(() => {
    const fallback = createInitialSettlementContext();
    try {
      const raw = localStorage.getItem(storageKey);
      if (!raw) {
        setContext(fallback);
        setIsHydrated(true);
        return;
      }

      const parsed: PersistedDraft = JSON.parse(raw);
      if (parsed.version !== DRAFT_VERSION) {
        setContext(fallback);
        setIsHydrated(true);
        return;
      }

      const sanitized = sanitizeContext(parsed.context);
      setContext(sanitized ?? fallback);
      setIsHydrated(true);
    } catch {
      setContext(fallback);
      setIsHydrated(true);
    }
  }, [storageKey]);

  useEffect(() => {
    if (!isHydrated) return;
    const timer = window.setTimeout(() => {
      const payload: PersistedDraft = { version: DRAFT_VERSION, context };
      localStorage.setItem(storageKey, JSON.stringify(payload));
      setLastSavedAt(new Date().toISOString());
    }, 400);
    return () => window.clearTimeout(timer);
  }, [context, isHydrated, storageKey]);

  const dispatch = useCallback((event: Parameters<typeof contractSettlementTransition>[1]) => {
    setContext((prev) => contractSettlementTransition(prev, event));
  }, []);

  const goNext = useCallback(() => dispatch({ type: "NEXT" }), [dispatch]);
  const goBack = useCallback(() => dispatch({ type: "BACK" }), [dispatch]);
  const goToStep = useCallback(
    (step: ContractSettlementStep) => dispatch({ type: "GO_TO", step }),
    [dispatch]
  );
  
  const submitInspection = useCallback(
    (reading: { electricity: number; water: number; note?: string }, utilityBill?: any) => 
      dispatch({ type: "SUBMIT_INSPECTION", reading, utilityBill }),
    [dispatch]
  );

  const setDeductions = useCallback(
    (items: { reason: string; amount: number }[]) => 
      dispatch({ type: "SET_DEDUCTIONS", items }),
    [dispatch]
  );

  const setTenantAction = useCallback(
    (agree: boolean) => dispatch({ type: "TENANT_ACTION", agree }),
    [dispatch]
  );

  const setTxHash = useCallback(
    (hash: string) => dispatch({ type: "SET_TX_HASH", hash }),
    [dispatch]
  );

  const markSettled = useCallback(
    (settledAt: string) => dispatch({ type: "SETTLE_SUCCESS", settledAt }),
    [dispatch]
  );

  const setError = useCallback(
    (message: string) => dispatch({ type: "FAIL", message }),
    [dispatch]
  );
  
  const clearError = useCallback(() => dispatch({ type: "CLEAR_ERROR" }), [dispatch]);

  const resetDraft = useCallback(() => {
    localStorage.removeItem(storageKey);
    setContext(createInitialSettlementContext());
    setLastSavedAt(null);
  }, [storageKey]);

  return {
    context,
    isHydrated,
    lastSavedAt,
    goNext,
    goBack,
    goToStep,
    submitInspection,
    setDeductions,
    setTenantAction,
    setTxHash,
    markSettled,
    setError,
    clearError,
    resetDraft,
  };
}

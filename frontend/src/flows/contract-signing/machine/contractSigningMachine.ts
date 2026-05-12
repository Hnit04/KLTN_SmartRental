import type { ContractSignMethod } from "@/types";
import type { PaymentIntentState } from "@/flows/payment-intent/types";

export type ContractSigningStep = "REVIEW" | "METHOD" | "SIGN" | "PAYMENT";

export type ContractSigningContext = {
  step: ContractSigningStep;
  selectedMethod: ContractSignMethod;
  signedAt: string | null;
  paymentState: PaymentIntentState;
  lastError: string | null;
  updatedAt: number;
};

export type ContractSigningEvent =
  | { type: "GO_TO"; step: ContractSigningStep }
  | { type: "NEXT" }
  | { type: "BACK" }
  | { type: "SELECT_METHOD"; method: ContractSignMethod }
  | { type: "SIGN_SUCCESS"; signedAt: string }
  | { type: "PAYMENT_UPDATED"; state: PaymentIntentState }
  | { type: "FAIL"; message: string }
  | { type: "CLEAR_ERROR" };

export const CONTRACT_SIGNING_STEPS: ContractSigningStep[] = [
  "REVIEW",
  "METHOD",
  "SIGN",
  "PAYMENT",
];

export function createInitialContractSigningContext(
  initialMethod: ContractSignMethod = "TRADITIONAL"
): ContractSigningContext {
  return {
    step: "REVIEW",
    selectedMethod: initialMethod,
    signedAt: null,
    paymentState: "initiated",
    lastError: null,
    updatedAt: Date.now(),
  };
}

function stepIndex(step: ContractSigningStep) {
  return CONTRACT_SIGNING_STEPS.indexOf(step);
}

function nextStep(step: ContractSigningStep): ContractSigningStep {
  const index = stepIndex(step);
  if (index < 0 || index >= CONTRACT_SIGNING_STEPS.length - 1) return step;
  return CONTRACT_SIGNING_STEPS[index + 1];
}

function prevStep(step: ContractSigningStep): ContractSigningStep {
  const index = stepIndex(step);
  if (index <= 0) return step;
  return CONTRACT_SIGNING_STEPS[index - 1];
}

export function contractSigningTransition(
  current: ContractSigningContext,
  event: ContractSigningEvent
): ContractSigningContext {
  const withUpdatedAt = (next: Omit<ContractSigningContext, "updatedAt">): ContractSigningContext => ({
    ...next,
    updatedAt: Date.now(),
  });

  switch (event.type) {
    case "GO_TO":
      return withUpdatedAt({ ...current, step: event.step, lastError: null });
    case "NEXT":
      return withUpdatedAt({ ...current, step: nextStep(current.step), lastError: null });
    case "BACK":
      return withUpdatedAt({ ...current, step: prevStep(current.step), lastError: null });
    case "SELECT_METHOD":
      return withUpdatedAt({
        ...current,
        selectedMethod: event.method,
        lastError: null,
      });
    case "SIGN_SUCCESS":
      return withUpdatedAt({
        ...current,
        signedAt: event.signedAt,
        step: "PAYMENT",
        lastError: null,
      });
    case "PAYMENT_UPDATED":
      return withUpdatedAt({
        ...current,
        paymentState: event.state,
        lastError: null,
      });
    case "FAIL":
      return withUpdatedAt({
        ...current,
        lastError: event.message,
      });
    case "CLEAR_ERROR":
      return withUpdatedAt({
        ...current,
        lastError: null,
      });
    default:
      return current;
  }
}


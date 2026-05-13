import type { Contract } from "@/types";

export type ContractFlowStep = "REVIEW" | "METHOD" | "SIGN" | "PAYMENT";

export function hasBothPartiesSigned(contract: Contract): boolean {
  return Boolean(contract.isTenantSigned && contract.isLandlordSigned);
}

export function canSignContract(contract: Contract): boolean {
  if (contract.status !== "PENDING_SIGNATURE") return false;
  return !hasBothPartiesSigned(contract);
}

export function canPayDeposit(contract: Contract): boolean {
  if (contract.depositStatus === "DEPOSITED") return false;
  if (contract.status === "AWAITING_DEPOSIT") return true;
  return contract.status === "PENDING_SIGNATURE" && hasBothPartiesSigned(contract);
}

export function canAccessContractSigningWizard(contract: Contract): boolean {
  return canSignContract(contract) || canPayDeposit(contract);
}

export function resolveContractSigningStep(contract: Contract): ContractFlowStep {
  if (canPayDeposit(contract)) return "PAYMENT";
  if (canSignContract(contract)) return "SIGN";
  return "REVIEW";
}


export type ContractSettlementStep =
  | "INSPECTION" // Chủ trọ nhập chỉ số điện nước, tình trạng phòng
  | "DEDUCTION"  // Chủ trọ đề xuất các khoản trừ cọc
  | "REVIEW"     // Khách thuê xem và phản hồi (Đồng ý/Khiếu nại)
  | "PAYOUT";    // Thực hiện hoàn tiền (Web3/Chuyển khoản)

export type ContractSettlementContext = {
  step: ContractSettlementStep;
  lastReading?: {
    electricity: number;
    water: number;
    note?: string;
  };
  utilityBill?: {
    electricityUsage: number;
    waterUsage: number;
    electricityFee: number;
    waterFee: number;
    internetFee: number;
    total: number;
  };
  deductions: {
    reason: string;
    amount: number;
  }[];
  isTenantAgreed: boolean;
  txHash: string | null; // ✅ Thêm để track Web3
  settledAt: string | null;
  lastError: string | null;
  updatedAt: number;
};

export type ContractSettlementEvent =
  | { type: "GO_TO"; step: ContractSettlementStep }
  | { type: "NEXT" }
  | { type: "BACK" }
  | { type: "SUBMIT_INSPECTION"; reading: { electricity: number; water: number; note?: string }; utilityBill?: { electricityUsage: number; waterUsage: number; electricityFee: number; waterFee: number; internetFee: number; total: number } }
  | { type: "SET_DEDUCTIONS"; items: { reason: string; amount: number }[] }
  | { type: "TENANT_ACTION"; agree: boolean }
  | { type: "SET_TX_HASH"; hash: string } // ✅ Event mới
  | { type: "SETTLE_SUCCESS"; settledAt: string }
  | { type: "FAIL"; message: string }
  | { type: "CLEAR_ERROR" };

export const CONTRACT_SETTLEMENT_STEPS: ContractSettlementStep[] = [
  "INSPECTION",
  "DEDUCTION",
  "REVIEW",
  "PAYOUT",
];

export function createInitialSettlementContext(): ContractSettlementContext {
  return {
    step: "INSPECTION",
    deductions: [],
    isTenantAgreed: false,
    txHash: null,
    settledAt: null,
    lastError: null,
    updatedAt: Date.now(),
  };
}

function stepIndex(step: ContractSettlementStep) {
  return CONTRACT_SETTLEMENT_STEPS.indexOf(step);
}

export function contractSettlementTransition(
  current: ContractSettlementContext,
  event: ContractSettlementEvent
): ContractSettlementContext {
  const withUpdatedAt = (next: Omit<ContractSettlementContext, "updatedAt">): ContractSettlementContext => ({
    ...next,
    updatedAt: Date.now(),
  });

  switch (event.type) {
    case "GO_TO":
      return withUpdatedAt({ ...current, step: event.step, lastError: null });
    case "NEXT": {
      const idx = stepIndex(current.step);
      const nextStep = idx < CONTRACT_SETTLEMENT_STEPS.length - 1 ? CONTRACT_SETTLEMENT_STEPS[idx + 1] : current.step;
      return withUpdatedAt({ ...current, step: nextStep, lastError: null });
    }
    case "BACK": {
      const idx = stepIndex(current.step);
      const prevStep = idx > 0 ? CONTRACT_SETTLEMENT_STEPS[idx - 1] : current.step;
      return withUpdatedAt({ ...current, step: prevStep, lastError: null });
    }
    case "SUBMIT_INSPECTION":
      return withUpdatedAt({
        ...current,
        lastReading: event.reading,
        utilityBill: event.utilityBill,
        step: "DEDUCTION",
        lastError: null,
      });
    case "SET_DEDUCTIONS":
      return withUpdatedAt({
        ...current,
        deductions: event.items,
        step: "REVIEW",
        lastError: null,
      });
    case "TENANT_ACTION":
      return withUpdatedAt({
        ...current,
        isTenantAgreed: event.agree,
        step: event.agree ? "PAYOUT" : "DEDUCTION", // Nếu không đồng ý thì quay về bước đề xuất
        lastError: null,
      });
    case "SETTLE_SUCCESS":
      return withUpdatedAt({
        ...current,
        settledAt: event.settledAt,
        lastError: null,
      });
    case "SET_TX_HASH":
      return withUpdatedAt({
        ...current,
        txHash: event.hash,
        lastError: null,
      });
    case "FAIL":
      return withUpdatedAt({ ...current, lastError: event.message });
    case "CLEAR_ERROR":
      return withUpdatedAt({ ...current, lastError: null });
    default:
      return current;
  }
}

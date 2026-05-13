function parseBooleanFlag(value: unknown, fallback: boolean): boolean {
  if (typeof value === "boolean") return value;
  if (typeof value !== "string") return fallback;

  const normalized = value.trim().toLowerCase();
  if (["1", "true", "yes", "on"].includes(normalized)) return true;
  if (["0", "false", "no", "off"].includes(normalized)) return false;
  return fallback;
}

export const featureFlags = {
  contractSigningV2: parseBooleanFlag(import.meta.env.VITE_CONTRACT_SIGNING_V2, true),
  paymentIntentV2: parseBooleanFlag(import.meta.env.VITE_PAYMENT_INTENT_V2, true),
};


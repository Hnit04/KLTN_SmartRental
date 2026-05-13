export type PaymentIntentState =
  | "initiated"
  | "pending"
  | "confirmed"
  | "synced"
  | "failed";

export const PAYMENT_INTENT_ORDER: PaymentIntentState[] = [
  "initiated",
  "pending",
  "confirmed",
  "synced",
  "failed",
];

export function getPaymentIntentLabel(state: PaymentIntentState) {
  switch (state) {
    case "initiated":
      return "Đã khởi tạo";
    case "pending":
      return "Đang xử lý";
    case "confirmed":
      return "Đã xác nhận";
    case "synced":
      return "Đã đồng bộ";
    case "failed":
      return "Thất bại";
    default:
      return state;
  }
}


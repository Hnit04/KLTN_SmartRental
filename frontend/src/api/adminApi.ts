import axiosClient from "./axiosClient";

export interface LandlordSettlement {
  landlordId: number;
  landlordName: string;
  landlordEmail: string;
  bankName: string;
  bankAccountNumber: string;
  bankAccountHolder: string;
  totalDepositAmount: number;
  totalBillAmount: number;
  totalRevenue: number;
  platformFee: number;
  finalPayoutAmount: number;
  pendingItemCount: number;
}

export interface SettlementItemDetail {
  type: "BILL" | "DEPOSIT";
  id: number;
  description: string;
  amount: number;
  paidAt: string;
  referenceCode: string;
}

export const adminApi = {
  getPendingSettlements: () => {
    return axiosClient.get<LandlordSettlement[]>("/admin/settlements/pending");
  },
  getSettledHistory: () => {
    return axiosClient.get<LandlordSettlement[]>("/admin/settlements/history");
  },
  getSettlementDetails: (landlordId: number, isSettled: boolean = false) => {
    return axiosClient.get<SettlementItemDetail[]>(`/admin/settlements/${landlordId}/details?isSettled=${isSettled}`);
  },
  getPayoutQrCode: (landlordId: number) => {
    return axiosClient.get<{qrUrl: string, realAmount: number, qrAmount: string, addInfo: string}>(`/admin/settlements/${landlordId}/qr-code`);
  },
  processPayout: (landlordId: number) => {
    return axiosClient.post(`/admin/settlements/${landlordId}/payout`);
  }
};

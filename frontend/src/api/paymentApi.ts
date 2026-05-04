import axiosClient from "./axiosClient";

export interface VietQrResponse {
  status: string;
  qrUrl: string;
  amount: string;
  addInfo: string;
  message?: string;
}

export const paymentApi = {
  getBillQrCode: (billId: number | string) => {
    return axiosClient.get<VietQrResponse>(`/payments/bill/${billId}/qr-code`);
  },
  getContractQrCode: (contractId: number | string) => {
    return axiosClient.get<VietQrResponse>(`/payments/contract/${contractId}/qr-code`);
  }
};

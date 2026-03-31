import axiosClient from "./axiosClient";
import type { Bill, RevenueChartData } from "@/types/index";

export const billApi = {
  createBill: (data: {
    contractId: number;
    month: number;
    year: number;
    oldElecIndex: number;
    newElecIndex: number;
    oldWaterIndex: number;
    newWaterIndex: number;
    deadline?: string;
    // Thêm các trường mới
    additionalFee?: number;
    discountAmount?: number;
    note?: string;
    elecMeterImageUrl?: string;
    waterMeterImageUrl?: string;
  }) => {
    return axiosClient.post("/bills", data);
  },

  // Lấy danh sách hóa đơn của 1 hợp đồng
  getBillsByContract: (contractId: number) => {
    return axiosClient.get(`/bills/contract/${contractId}`);
  },
  getBillingStatus: (month: number, year: number) => {
    return axiosClient.get(`/bills/billing-status?month=${month}&year=${year}`);
  },
  getRevenueThisAndLastMonth: () => {
    return axiosClient.get("/bills/revenue/compare");
  },
  getOverdueStats: () => {
  return axiosClient.get("/bills/overdue/stats");
  },
  getRevenueLast6Months: () => {
  return axiosClient.get<RevenueChartData[]>("/bills/revenue/last-6-months");
    },

  confirmWeb3Payment: (billId: number, txHash: string) => {
    return axiosClient.post(`/bills/${billId}/confirm-web3`, { txHash });
  },
};
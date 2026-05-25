import axiosClient from "./axiosClient";
import type { Contract, SignContractPayload, CreateContractPayload, ChangeRequestDTO, ContractChangeRequest } from "@/types"; 

export const contractApi = {
  // Admin: lấy tất cả hợp đồng
  getAll: () => {
    return axiosClient.get<Contract[]>("/contracts/all");
  },
  // Admin: xác minh tính toàn vẹn hợp đồng qua blockchain
  verify: (id: number | string) => {
    return axiosClient.get(`/contracts/${id}/verify`);
  },
  getMyContracts: () => {
    return axiosClient.get<Contract[]>("/contracts/mine");
  },
  getMyCurrentRoom: () => {
    return axiosClient.get<Contract>("/contracts/my-current-room");
  },
  getRentalHistory: (userId?: number) => {
    const url = userId ? `/contracts/history/${userId}` : "/contracts/history";
    return axiosClient.get<Contract[]>(url);
  },
  getDashboardInsights: () => {
    return axiosClient.get('/contracts/dashboard/insights');
  },
  createContract: (data: CreateContractPayload) => {
    return axiosClient.post<Contract>("/contracts", data);
  },
  getDetail: (id: number | string) => {
    return axiosClient.get<Contract>(`/contracts/${id}`);
  },
  approveContract: (id: number) => {
    return axiosClient.post<Contract>(`/contracts/${id}/approve`);
  },
  signContract: (id: number, data: SignContractPayload) => {
    return axiosClient.post(`/contracts/${id}/sign`, data); 
  },
  rejectContract: (id: number | string, reason?: string) => {
    return axiosClient.post(`/contracts/${id}/reject`, { reason });
  },
  
  // --- CÁC API CHO ĐỀ XUẤT CHỈNH SỬA (NEGOTIATION) ---
  requestChange: (id: number | string, data: ChangeRequestDTO) => {
    return axiosClient.post(`/contracts/${id}/change-requests`, data);
  },
  getChangeRequests: (id: number | string) => {
    return axiosClient.get<ContractChangeRequest[]>(`/contracts/${id}/change-requests`);
  },
  approveChangeRequest: (requestId: number | string) => {
    return axiosClient.put(`/contracts/change-requests/${requestId}/approve`);
  },
  rejectChangeRequest: (requestId: number | string) => {
    return axiosClient.put(`/contracts/change-requests/${requestId}/reject`);
  },
  
  // --- AI LEGAL ADVISOR ---
  analyzeTerms: (id: number | string, data: { terms: string }) => {
    return axiosClient.post<{ result: string }>(`/contracts/${id}/analyze-terms`, data, { timeout: 120000 });
  },

  // --- CẬP NHẬT ĐIỀU KHOẢN TRỰC TIẾP ---
  updateTerms: (id: number | string, data: { terms: string }) => {
    return axiosClient.put(`/contracts/${id}/terms`, data);
  },

  // --- XÁC NHẬN HOÀN CỌC ---
  confirmDepositRefund: (id: number | string) => {
    return axiosClient.put(`/contracts/${id}/confirm-deposit-refund`);
  },
  
  // --- XÁC NHẬN NẠP CỌC (WEB3 & TRADITIONAL) ---
  confirmWeb3Deposit: (id: number | string, txHash: string) => {
    return axiosClient.post(`/contracts/${id}/confirm-web3-deposit`, { txHash });
  },
  confirmTraditionalDeposit: (id: number | string) => {
    return axiosClient.post(`/contracts/${id}/confirm-traditional-deposit`);
  },

  // ✅ Lịch sử hợp đồng theo phòng
  getRoomHistory: (roomId: number | string) => {
    return axiosClient.get<Contract[]>(`/contracts/room/${roomId}/history`);
  },

  // 💰 QUYẾT TOÁN HỢP ĐỒNG (Settlement)
  proposeSettlement: (id: number | string, data: {
    deductionAmount: number;
    earlyTermination: boolean;
    txHash?: string;
    inspectionNote?: string;
    utilityBill?: {
      electricityUsage: number;
      waterUsage: number;
      electricityFee: number;
      waterFee: number;
      internetFee: number;
      total: number;
    };
    items?: { reason: string; amount: number; type?: string; locked?: boolean }[];
  }) => {
    return axiosClient.post<Contract>(`/contracts/${id}/settle/propose`, data);
  },
  consentSettlement: (id: number | string) => {
    return axiosClient.post<Contract>(`/contracts/${id}/settle/consent`);
  },
  executeSettlement: (id: number | string) => {
    return axiosClient.post<Contract>(`/contracts/${id}/settle/execute`);
  },
  rejectSettlement: (id: number | string, data?: { reason?: string }) => {
    return axiosClient.post<Contract>(`/contracts/${id}/settle/reject`, data || {});
  },

  // 🛡️ ADMIN: BLOCKCHAIN MONITORING
  getBlockchainMetrics: () => {
    return axiosClient.get('/contracts/admin/blockchain/metrics');
  },
  reconcileNonce: () => {
    return axiosClient.post('/contracts/admin/blockchain/reconcile-nonce');
  }
};
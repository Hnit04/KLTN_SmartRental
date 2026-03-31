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
  createContract: (data: CreateContractPayload) => {
    return axiosClient.post<Contract>("/contracts", data);
  },
  getDetail: (id: number | string) => {
    return axiosClient.get<Contract>(`/contracts/${id}`);
  },
  signContract: (id: number, data: SignContractPayload) => {
    return axiosClient.post(`/contracts/${id}/sign`, data); 
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
  }
};
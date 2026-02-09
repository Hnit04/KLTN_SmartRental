import axiosClient from "./axiosClient";
import type { Contract ,SignContractPayload, CreateContractPayload} from "@/types"; 
export const contractApi = {
  // Lấy danh sách hợp đồng của tôi
  getMyContracts: () => {
    return axiosClient.get<Contract[]>("/contracts/mine");
  },
  createContract: (data: CreateContractPayload) => {
    return axiosClient.post<Contract>("/contracts", data);
  },
  // Lấy chi tiết (dùng khi click vào xem chi tiết)
  getDetail: (id: number | string) => {
    return axiosClient.get<Contract>(`/contracts/${id}`);
  },
  signContract: (id: number | string, data: SignContractPayload) => {
    return axiosClient.put<Contract>(`/contracts/${id}/sign`, data);
  },
  requestChange: (id: number | string, content: string) => {
    return axiosClient.post(`/contracts/${id}/change-requests`, content);
  }
};
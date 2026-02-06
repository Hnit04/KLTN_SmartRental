import axiosClient from "./axiosClient";
import type { Contract } from "@/types"; 
export const contractApi = {
  // Lấy danh sách hợp đồng của tôi
  getMyContracts: () => {
    return axiosClient.get<Contract[]>("/contracts/mine");
  },

  // Lấy chi tiết (dùng khi click vào xem chi tiết)
  getDetail: (id: number | string) => {
    return axiosClient.get<Contract>(`/contracts/${id}`);
  },
  signContract: (id: number | string) => {
    return axiosClient.put(`/contracts/${id}/sign`);
  },
  requestChange: (id: number | string, content: string) => {
    return axiosClient.post(`/contracts/${id}/change-requests`, content);
  }
};
import axiosClient from "../axiosClient"; // Đảm bảo bạn đã có file này (nơi cấu hình baseURL)
import type { Property } from "@/types/index";

export const propertyApi = {
  // Lấy danh sách tất cả nhà trọ (Public)
  getAll: () => {
    return axiosClient.get<Property[]>("/properties");
  },

  // Lấy chi tiết 1 nhà trọ (Dùng cho trang chi tiết sau này)
  getDetail: (id: number) => {
    return axiosClient.get<Property>(`/properties/${id}`);
  },
  
  // Lấy danh sách phòng của 1 nhà trọ
  getRooms: (propertyId: number) => {
    return axiosClient.get(`/properties/${propertyId}/rooms`);
  }
};
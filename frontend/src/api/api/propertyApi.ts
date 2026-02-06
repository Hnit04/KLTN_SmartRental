import axiosClient from "../axiosClient";
import type { Property, Room } from "@/types/index";

export const propertyApi = {
  getAll: () => axiosClient.get<Property[]>("/properties"),

  // Lấy thông tin chi tiết khu trọ
  getDetail: (id: number | string) => axiosClient.get<Property>(`/properties/${id}`),

  // Lấy danh sách phòng của khu trọ đó
  getRooms: (id: number | string) => axiosClient.get<Room[]>(`/properties/${id}/rooms`),

  getMyProperties: () => {
    return axiosClient.get<Property[]>("/properties/mine");
  },

};
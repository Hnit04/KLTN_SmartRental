import axiosClient from "./axiosClient";
import type { Property, Room } from "@/types/index";

export interface PaginatedResponse<T> {
  content: T[];
  totalPages: number;
  totalElements: number;
  number: number;
  size: number;
}

export const propertyApi = {
  getAll: (page: number = 0, size: number = 12) => axiosClient.get<PaginatedResponse<Property>>(`/properties?page=${page}&size=${size}`),
  getDetail: (id: number | string) => axiosClient.get<Property>(`/properties/${id}`),
  getRooms: (id: number | string) => axiosClient.get<Room[]>(`/properties/${id}/rooms`),
  getRoomDetail: (roomId: number | string) => axiosClient.get<Room>(`/rooms/${roomId}`),
  getMyProperties: () => axiosClient.get<Property[]>("/properties/mine"),
  getPropertiesByLandlord: (landlordId: number | string) => axiosClient.get<Property[]>(`/properties/landlord/${landlordId}`),
  getRecommendedRooms: () => axiosClient.get<Room[]>("/recommendations/rooms"),

  // --- CÁC HÀM QUẢN LÝ KHU TRỌ ---
  createProperty: (data: Partial<Property>) => axiosClient.post<Property>("/properties", data),
  updateProperty: (id: number | string, data: Partial<Property>) => axiosClient.put<Property>(`/properties/${id}`, data),
  deleteProperty: (id: number | string) => axiosClient.delete(`/properties/${id}`),

  // --- CÁC HÀM QUẢN LÝ PHÒNG ---
  createRoom: (propertyId: number | string, data: Partial<Room>) => axiosClient.post<Room>(`/properties/${propertyId}/rooms`, data),
  updateRoom: (roomId: number | string, data: Partial<Room>) => axiosClient.put<Room>(`/rooms/${roomId}`, data),
  deleteRoom: (roomId: number | string) => axiosClient.delete(`/rooms/${roomId}`),

  // --- HÀM TÍCH HỢP AI (MỚI) ---
  generateRoomDescription: (keywords: string) => 
    axiosClient.post<{ description: string }>("/ai/generate-room-description", { prompt: keywords }),
  uploadImages: async (files: File[]) => {
    const formData = new FormData();
    files.forEach(file => {
      formData.append('files', file); 
    });
    return axiosClient.post<string[]>("/properties/upload-images", formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    });
  },
  reverseGeocode: (lat: number, lon: number) => {
    return axiosClient.get(`/properties/reverse-geocode?lat=${lat}&lon=${lon}`);
  },

  // --- CÁC HÀM DÀNH CHO ADMIN ---
  getPendingProperties: () => axiosClient.get<Property[]>("/properties/pending"),
  approveProperty: (id: number | string) => axiosClient.post(`/properties/${id}/approve`),
  rejectProperty: (id: number | string, reason?: string) => 
    axiosClient.post(`/properties/${id}/reject`, reason ? { reason } : {}),

  // --- ADMIN DUYỆT PHÒNG ---
  getPendingRooms: () => axiosClient.get<Room[]>("/rooms/pending"),
  approveRoom: (id: number | string) => axiosClient.post(`/rooms/${id}/approve`),
  rejectRoom: (id: number | string, reason?: string) => 
    axiosClient.post(`/rooms/${id}/reject`, reason ? { reason } : {}),
};
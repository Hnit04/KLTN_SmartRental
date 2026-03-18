import axiosClient from "./axiosClient";
import type { Property, Room } from "@/types/index";

export const propertyApi = {
  // --- CÁC HÀM GET (Giữ nguyên của bạn) ---
  getAll: () => axiosClient.get<Property[]>("/properties"),
  getDetail: (id: number | string) => axiosClient.get<Property>(`/properties/${id}`),
  getRooms: (id: number | string) => axiosClient.get<Room[]>(`/properties/${id}/rooms`),
  getRoomDetail: (roomId: number | string) => axiosClient.get<Room>(`/rooms/${roomId}`),
  getMyProperties: () => axiosClient.get<Property[]>("/properties/mine"),
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
  // API này sẽ truyền từ khóa lên Backend để Backend gọi tới FPT AI hoặc Gemini trả về đoạn văn
  generateRoomDescription: (keywords: string) => 
    axiosClient.post<{ description: string }>("/ai/generate-room-description", { prompt: keywords }),
  uploadImages: async (files: File[]) => {
    const formData = new FormData();
    files.forEach(file => {
      // Tên 'files' phải khớp chính xác với @RequestParam("files") bên Spring Boot
      formData.append('files', file); 
    });
    
    // axiosClient của bạn đã tự cấu hình token, chỉ cần thêm header multipart
    return axiosClient.post<string[]>("/properties/upload-images", formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    });
  },
  reverseGeocode: (lat: number, lon: number) => {
    return axiosClient.get(`/properties/reverse-geocode?lat=${lat}&lon=${lon}`);
  },
};
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
  getAll: (
    page: number = 0,
    size: number = 12,
    location?: { lat: number; lng: number } | null
  ) => {
    const params = new URLSearchParams({
      page: String(page),
      size: String(size),
    });
    if (location && Number.isFinite(location.lat) && Number.isFinite(location.lng)) {
      params.set("lat", String(location.lat));
      params.set("lng", String(location.lng));
    }
    return axiosClient.get<PaginatedResponse<Property>>(`/properties?${params.toString()}`);
  },
  getDetail: (id: number | string) => axiosClient.get<Property>(`/properties/${id}`),
  getRooms: (id: number | string) => axiosClient.get<Room[]>(`/properties/${id}/rooms`),
  getRoomDetail: (roomId: number | string) => axiosClient.get<Room>(`/rooms/${roomId}`),
  getMyProperties: () => axiosClient.get<Property[]>("/properties/mine"),
  getPropertiesByLandlordUsername: (username: string) => axiosClient.get<Property[]>(`/properties/landlord/${username}`),
  // Backward-compat alias. Prefer getPropertiesByLandlordUsername for clarity.
  getPropertiesByLandlord: (landlordUsername: string) => axiosClient.get<Property[]>(`/properties/landlord/${landlordUsername}`),
  getRecommendedRooms: () => axiosClient.get<Room[]>("/recommendations/rooms"),

  // --- CÁC HÀM QUẢN LÝ KHU TRỌ ---
  createProperty: (data: Partial<Property>) => axiosClient.post<Property>("/properties", data),
  updateProperty: (id: number | string, data: Partial<Property>) => axiosClient.put<Property>(`/properties/${id}`, data),
  deleteProperty: (id: number | string) => axiosClient.delete(`/properties/${id}`),
  updatePropertyStatus: (id: number | string, status: 'PENDING' | 'APPROVED' | 'REJECTED' | 'HIDDEN') => 
    axiosClient.patch<Property>(`/properties/${id}/status`, null, { params: { status } }),

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

  suggestRoomPrice: (data: { district: string, city: string, area: number, type: string, amenities: string[] }) =>
    axiosClient.post<{ suggestion: string, reason: string }>("/ai/suggest-room-price", data),

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

  // --- HÀM CHO PHÒNG YÊU THÍCH ---
  toggleFavoriteRoom: (roomId: number | string) => axiosClient.post(`/favorites/rooms/${roomId}`),
  getFavoriteRooms: () => axiosClient.get<Room[]>("/favorites/rooms"),
  getFavoriteRoomIds: () => axiosClient.get<number[]>("/favorites/rooms/ids"),
};

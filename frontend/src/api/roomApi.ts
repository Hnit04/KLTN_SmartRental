import type { Room, User } from "@/types";
import axiosClient from "./axiosClient";
export const roomApi = {
  getLandlordRoomStats: () => {
    return axiosClient.get("/rooms/stats/landlord");
  },
  getRoomTenants: async (roomId: number | string): Promise<User[]> => {
    const response = await axiosClient.get(`/rooms/${roomId}/tenants`);
    return response.data;
  },
  getRoomDetail: async (roomId: number | string): Promise<Room> => {
    const response = await axiosClient.get(`/rooms/${roomId}`);
    return response.data;          
  },
  updateRoomVisibility: async (roomId: number | string, status: "HIDDEN" | "AVAILABLE"| "REJECTED"|"MAINTENANCE") => {
    const response = await axiosClient.put(`/rooms/${roomId}/hide`, { status });
    return response.data;
  },
};
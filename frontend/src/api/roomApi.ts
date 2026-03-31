import type { Room, User } from "@/types";
import axiosClient from "./axiosClient";
export const roomApi = {
  getLandlordRoomStats: () => {
    return axiosClient.get("/rooms/stats/landlord");
  },
  getRoomTenants: (roomId: number | string): Promise<User[]> => {
    return axiosClient.get(`/rooms/${roomId}/tenants`);
  },
  getRoomDetail: (roomId: number | string): Promise<Room> => {
    return axiosClient.get(`/rooms/${roomId}`);
  }
};
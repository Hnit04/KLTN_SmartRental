import axiosClient from "./axiosClient";
export const roomApi = {
  getLandlordRoomStats: () => {
    return axiosClient.get("/rooms/stats/landlord");
  },
};
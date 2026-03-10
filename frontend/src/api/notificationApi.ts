import axiosClient from "./axiosClient";

export const notificationApi = {
  getMyNotifications: () => {
    return axiosClient.get("/notifications/mine");
  },
  markAsRead: (id: number) => {
    return axiosClient.put(`/notifications/${id}/read`);
  },
  markAllAsRead: () => {
    return axiosClient.put("/notifications/read-all");
  }
};
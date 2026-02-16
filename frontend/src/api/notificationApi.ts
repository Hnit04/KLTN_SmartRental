import axiosClient from "./axiosClient";
import type { Notification } from "../types";

export const notificationApi = {
  // Lấy danh sách thông báo của user đang đăng nhập
  getMyNotifications: () => {
    return axiosClient.get<any, Notification[]>("/notifications/me");
  },

  // Đánh dấu 1 thông báo đã đọc
  markAsRead: (id: number) => {
    return axiosClient.put(`/notifications/${id}/read`);
  },

  // Đánh dấu tất cả đã đọc
  markAllAsRead: () => {
    return axiosClient.put("/notifications/read-all");
  }
};
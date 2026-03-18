import axiosClient from "./axiosClient";

export const notificationApi = {
  // Lấy danh sách thông báo (có phân trang)
  getMyNotifications: (page = 0, size = 30) => {
    return axiosClient.get(`/notifications/mine?page=${page}&size=${size}`);
  },

  // Đếm số chưa đọc — nhẹ, dùng cho polling badge
  getUnreadCount: () => {
    return axiosClient.get("/notifications/unread-count");
  },

  markAsRead: (id: number) => {
    return axiosClient.put(`/notifications/${id}/read`);
  },

  markAllAsRead: () => {
    return axiosClient.put("/notifications/read-all");
  },

  // Xoá 1 thông báo
  deleteNotification: (id: number) => {
    return axiosClient.delete(`/notifications/${id}`);
  },
};
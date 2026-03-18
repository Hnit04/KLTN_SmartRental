import axiosClient from "./axiosClient";

export interface CreateAppointmentPayload {
  roomId: number;
  meetTime: string; // Format: YYYY-MM-DDTHH:mm
  note?: string;
  meetingLink?: string;
}

export const appointmentApi = {
  // 1. Khách thuê tạo lịch hẹn mới
  createAppointment: (data: CreateAppointmentPayload) => {
    return axiosClient.post("/appointments", data);
  },

  // 2. Khách thuê lấy danh sách lịch hẹn của mình
  getMyAppointments: () => {
    return axiosClient.get("/appointments/mine");
  },

  // 3. Chủ trọ lấy TẤT CẢ lịch hẹn (mọi trạng thái)
  getAllByLandlord: () => {
    return axiosClient.get("/appointments/my-appointments");
  },

  // 4. Chủ nhà lấy danh sách lịch hẹn đang chờ duyệt (legacy)
  getPendingByLandlord: (landlordId: number | string) => {
    return axiosClient.get(`/appointments/landlord/${landlordId}/pending`);
  },
  
  // 4. Cập nhật trạng thái lịch hẹn (Duyệt/Từ chối)
  updateStatus: (id: number | string, status: 'CONFIRMED' | 'CANCELLED' | 'COMPLETED') => {
    return axiosClient.put(`/appointments/${id}/status`, { status });
  }
};
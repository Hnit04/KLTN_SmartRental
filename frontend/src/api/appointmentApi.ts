import axiosClient from "./axiosClient";

export const appointmentApi = {
  // Lấy danh sách lịch hẹn đang chờ duyệt của chủ trọ
  getPendingByLandlord: (landlordId: number) => {
    return axiosClient.get(`/appointments/landlord/${landlordId}/pending`);
  },
  
  // API này bạn sẽ cần viết thêm ở Spring Boot nhé (để duyệt/từ chối)
  updateStatus: (id: number, status: 'CONFIRMED' | 'REJECTED' | 'CANCELLED') => {
    return axiosClient.put(`/appointments/${id}/status`, { status });
  }
};
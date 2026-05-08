import api from './axiosClient';

export const vipApi = {
  // Danh sách gói VIP (public)
  getPlans: () => api.get('/vip/plans'),

  // Gói hiện tại của Landlord
  getMyPlan: () => api.get('/vip/my-plan'),

  // Tạo đơn mua VIP → trả QR code
  purchaseVip: (tier: string) => api.post(`/vip/purchase/${tier}`),

  // Polling trạng thái đơn hàng
  getOrderStatus: (orderId: number) => api.get(`/vip/order/${orderId}/status`),

  // Lịch sử thanh toán
  getHistory: () => api.get('/vip/history'),
};

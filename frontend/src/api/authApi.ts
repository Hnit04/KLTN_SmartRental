import axiosClient from './axiosClient'; 
import type { 
  LoginRequest, 
  LoginResponse, 
  RegisterRequest, 
  User,
  TokenRefreshResponse,
  // Đừng quên thêm các type mới vào file types của bạn
  VerifyOtpRequest 
} from '../types';

export const authApi = {
  // Đăng nhập
  login: async (data: LoginRequest): Promise<LoginResponse> => {
    const response = await axiosClient.post<LoginResponse>('/auth/login', data);
    return response.data;
  },

  // Đăng ký
  register: async (data: RegisterRequest): Promise<any> => {
    // Lưu ý: Kết quả trả về từ API register hiện tại là một Map (Object) 
    // chứa status "PENDING_VERIFICATION" chứ không phải object User hoàn chỉnh.
    const response = await axiosClient.post('/auth/register', data);
    return response.data;
  },

  // Xác thực mã OTP
  verifyOtp: async (data: VerifyOtpRequest): Promise<{ status: string; message: string }> => {
    const response = await axiosClient.post('/auth/verify-otp', data);
    return response.data;
  },

  // Gửi lại mã OTP
  resendOtp: async (email: string): Promise<string> => {
    // API resend-otp nhận body là Map<String, String> { "email": "..." }
    const response = await axiosClient.post('/auth/resend-otp', { email });
    return response.data;
  },

  // Refresh Token
  refreshToken: async (refreshToken: string): Promise<TokenRefreshResponse> => {
    const response = await axiosClient.post<TokenRefreshResponse>('/auth/refresh-token', {
      refreshToken: refreshToken
    });
    return response.data;
  }
};
import axiosClient from './axiosClient'; 
import type { 
  LoginRequest, 
  LoginResponse, 
  RegisterRequest, 
  User,
  TokenRefreshResponse,
  VerifyOtpRequest,
  ResetPasswordRequest,
  GoogleLoginRequest
} from '../types';

export const authApi = {
  // Đăng nhập
  login: async (data: LoginRequest): Promise<LoginResponse> => {
    const response = await axiosClient.post<LoginResponse>('/auth/login', data);
    return response.data;
  },
  // Đăng nhập bằng Google
  googleLogin: async (data: GoogleLoginRequest): Promise<LoginResponse> => {
    const response = await axiosClient.post<LoginResponse>('/auth/google', data);
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
  forgotPassword: async (email: string): Promise<string> => {
    // Backend nhận: Map<String, String> body = body.get("email")
    const response = await axiosClient.post('/auth/forgot-password', { email });
    return response.data;
  },
  resetPassword: async (data: ResetPasswordRequest): Promise<string> => {
    const response = await axiosClient.post('/auth/reset-password', data);
    return response.data;
  },
  resetPasswordNoOtp: async (data: ResetPasswordRequest): Promise<string> => {
    const response = await axiosClient.post('/auth/reset-password-gg', data);
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
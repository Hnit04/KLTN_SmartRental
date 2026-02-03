import axiosClient from '../axiosClient'; // Import từ file axiosClient.ts bên ngoài
import type { 
  LoginRequest, 
  LoginResponse, 
  RegisterRequest, 
  User,
  TokenRefreshResponse 
} from '../../types';
export const authApi = {
  // Đăng nhập
  login: async (data: LoginRequest): Promise<LoginResponse> => {
    const response = await axiosClient.post<LoginResponse>('/auth/login', data);
    return response.data;
  },

  // Đăng ký
  register: async (data: RegisterRequest): Promise<User> => {
    const response = await axiosClient.post<User>('/auth/register', data);
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
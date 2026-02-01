// src/api/api/authApi.ts
import axiosClient from '../axiosClient';

// 1. Định nghĩa Type trả về từ Backend (Raw Data)
export interface UserRaw {
  id: number;
  username: string;
  fullname: string; // [QUAN TRỌNG] Backend trả về chữ thường
  email: string;
  phoneNumber?: string;
  role: 'ADMIN' | 'LANDLORD' | 'TENANT';
  kycStatus: string;
  // created_at?: string; // Nếu backend có trả về thì thêm vào
}

export interface LoginPayload {
  username: string; // Hoặc email tùy vào backend yêu cầu
  password: string;
}

export interface LoginResponse {
  accessToken: string;
  refreshToken: string;
  user: UserRaw; // Dùng UserRaw ở đây
}

// 2. API Functions
export const login = async (payload: LoginPayload): Promise<LoginResponse> => {
  const response = await axiosClient.post<LoginResponse>('/auth/login', payload);
  return response.data;
};

export const getCurrentUser = async (): Promise<UserRaw> => {
  const response = await axiosClient.get<UserRaw>('/auth/me');
  return response.data;
};

export const authApi = {
  login,
  getCurrentUser,
};
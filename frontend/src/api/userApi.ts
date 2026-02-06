import axiosClient from './axiosClient';
import type { User, UpdateProfileRequest } from '../types';

export const userApi = {
  // 1. Lấy thông tin người dùng hiện tại
  getMe: async (): Promise<User> => {
    const response = await axiosClient.get<User>('/users/me');
    return response.data;
  },

  // 2. Cập nhật thông tin cá nhân
  updateProfile: async (data: UpdateProfileRequest): Promise<User> => {
    const response = await axiosClient.put<User>('/users/profile', data);
    return response.data;
  },

  // 3. Upload Avatar
  uploadAvatar: async (file: File): Promise<string> => {
    const formData = new FormData();
    formData.append('file', file); 

    const response = await axiosClient.post<string>('/users/avatar', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data; 
  },

  // ✅ 4. (MỚI) Nộp hồ sơ KYC (Xác thực danh tính)
  submitKYC: async (cccdNumber: string, frontFile: File, backFile: File): Promise<string> => {
    const formData = new FormData();
    formData.append('cccdNumber', cccdNumber);
    formData.append('frontImage', frontFile); // Phải khớp với @RequestParam bên Java
    formData.append('backImage', backFile);   // Phải khớp với @RequestParam bên Java

    // Gọi API POST /api/users/kyc
    const response = await axiosClient.post<string>('/users/kyc', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data; // Trả về thông báo (VD: "Xác thực thành công!")
  }
};
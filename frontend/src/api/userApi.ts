import axiosClient from './axiosClient';
import type { User, UpdateProfileRequest,UserHistory } from '../types';

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
  },
  // 5. Lấy danh sách user theo role (dành cho Admin)
  getUsersByRole: async (role: 'ADMIN' | 'LANDLORD' | 'TENANT' | string): Promise<User[]> => {
    const response = await axiosClient.get<User[]>('/users/by-role', {
      params: { role },  
    });
    return response.data;
  },
  // 6. Khóa tài khoản tạm thời (chỉ Admin)
  lockUser: async (userId: number, durationDays: number, reason: string[]): Promise<string> => {
  const response = await axiosClient.post<string>(
    `/users/${userId}/lock`,
    null,
    {
      params: {
        durationDays,
        reason,
      },
      paramsSerializer: {
        indexes: null 
      }
    }
  );
  return response.data; 
},

  // 7. Mở khóa tài khoản thủ công (chỉ Admin)
  unlockUser: async (userId: number): Promise<string> => {
    const response = await axiosClient.post<string>(`/users/${userId}/unlock`);
    return response.data; // Ví dụ: "Đã mở khóa tài khoản ID 123"
  },

  // 8. Xem lịch sử thay đổi của một user (audit trail - chỉ Admin)
  getUserHistory: async (userId: number): Promise<UserHistory[]> => {
    const response = await axiosClient.get<UserHistory[]>(`/users/${userId}/history`);
    return response.data;
  },
  //9. Tìm kiếm user theo username
  findByUsername: async (username: string): Promise<User> => {
  const response = await axiosClient.get<User>('/users/username', {
    params: { username },
  });
  return response.data;
  },
};
import axiosClient from '../axiosClient';
import type { User, UpdateProfileRequest } from '../../types';

export const userApi = {
  getMe: async (): Promise<User> => {
    const response = await axiosClient.get<User>('/users/me');
    return response.data;
  },

  updateProfile: async (data: UpdateProfileRequest): Promise<User> => {
    const response = await axiosClient.put<User>('/users/profile', data);
    return response.data;
  }
};
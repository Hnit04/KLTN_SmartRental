// src/context/AuthContext.tsx
import { createContext, useState, useEffect, useContext } from 'react';
import type { ReactNode } from 'react';
import { authApi, type UserRaw, type LoginResponse } from '@/api/api/authApi';
import type { User } from '@/types'; // Import User chuẩn từ Global Types

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (data: LoginResponse) => void;
  logout: () => void;
  register: (data: any) => Promise<void>; // Thêm nếu cần dùng ở RegisterPage
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// [QUAN TRỌNG] Hàm chuyển đổi dữ liệu Backend -> Frontend
const mapUser = (raw: UserRaw): User => {
  return {
    id: raw.id,
    email: raw.email,
    username: raw.username,
    fullName: raw.fullname, // Map: fullname (API) -> fullName (App)
    phoneNumber: raw.phoneNumber,
    role: raw.role,
    kycStatus: raw.kycStatus as any, // Cast kiểu nếu string backend chưa chuẩn Enum
    createdAt: new Date().toISOString(), // Fake nếu backend thiếu
  };
};

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const initAuth = async () => {
      const token = localStorage.getItem('accessToken');
      if (token) {
        try {
          const rawUser = await authApi.getCurrentUser();
          const appUser = mapUser(rawUser); // Map dữ liệu trước khi set state
          setUser(appUser);
          setIsAuthenticated(true);
        } catch (err) {
          console.error('Init auth failed:', err);
          localStorage.removeItem('accessToken');
        }
      }
      setIsLoading(false);
    };
    initAuth();
  }, []);

  const login = (data: LoginResponse) => {
    localStorage.setItem('accessToken', data.accessToken);
    // Nếu có refresh token thì lưu luôn
    if (data.refreshToken) localStorage.setItem('refreshToken', data.refreshToken);
    
    const appUser = mapUser(data.user); // Map dữ liệu
    setUser(appUser);
    setIsAuthenticated(true);
  };

  const logout = () => {
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
    setUser(null);
    setIsAuthenticated(false);
  };

  // Hàm dummy register để fix lỗi bên RegisterPage
  const register = async (data: any) => {
     // Gọi API register thật ở đây
     console.log("Registering...", data);
     // Sau khi register xong thường sẽ auto login hoặc bắt login lại
  };

  return (
    <AuthContext.Provider value={{ user, isAuthenticated, isLoading, login, logout, register }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
};
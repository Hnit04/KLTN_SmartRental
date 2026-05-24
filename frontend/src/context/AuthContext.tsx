import React, { createContext, useContext, useState, useEffect } from 'react';
// 1. Import từ '../types' thay vì '../types/auth' để lấy đúng định nghĩa User mới
import type { User, AuthResponse, RegisterRequest } from '../types'; 
import { authApi } from '../api/authApi';
import { userApi } from '../api/userApi';

const SENSITIVE_FIELDS: (keyof User)[] = [
  'cccdFrontUrl', 'cccdBackUrl', 'bankAccountNumber', 
  'bankAccountHolder', 'bankQrUrl', 'cccdNumber'
];

const sanitizeUserForStorage = (user: User): User => {
  const safe = { ...user };
  SENSITIVE_FIELDS.forEach(f => {
    if (f in safe) {
      delete safe[f];
    }
  });
  return safe;
};

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (data: any) => Promise<void>; // Chấp nhận data login linh hoạt
  logout: () => void;
  // Thêm hàm update user để dùng khi cập nhật ví/profile mà không cần login lại
  updateUser: (user: User) => void; 
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // Load user từ localStorage khi F5 trang
  useEffect(() => {
    const initAuth = async () => {
      const storedUser = localStorage.getItem('user');
      const token = localStorage.getItem('accessToken');
      
      if (storedUser && token) {
        try {
          // Khôi phục tạm user từ localStorage để UI không bị trống
          setUser(JSON.parse(storedUser));
          
          // Lấy user đầy đủ từ server để có các trường nhạy cảm (bank, cccd...)
          try {
            const fullUser = await userApi.getMe();
            setUser(fullUser);
            // Vẫn chỉ lưu sanitize user vào storage
            localStorage.setItem('user', JSON.stringify(sanitizeUserForStorage(fullUser)));
          } catch (fetchError) {
            console.error("Không thể fetch thông tin user mới nhất", fetchError);
          }
        } catch (e) {
          console.error("Lỗi parse user từ storage", e);
          localStorage.removeItem('user');
          localStorage.removeItem('accessToken');
        }
      }
      setIsLoading(false);
    };

    initAuth();
  }, []);

  const login = async (credentials: any) => {
    try {
      // 2. Gọi API Login
      // Lưu ý: authApi.login cần trả về kiểu AuthResponse (đã định nghĩa ở step trước)
      // AuthResponse bao gồm: { accessToken, refreshToken, user: User }
      const response = await authApi.login(credentials);
      
      // Kiểm tra cấu trúc trả về để lấy data đúng chỗ
      // Một số axios setup trả data trực tiếp, một số trả trong response.data
      const data = (response as any).data || response; 

      const { accessToken, refreshToken, user: userData } = data as AuthResponse;

      // Lưu Token
      localStorage.setItem('accessToken', accessToken);
      if (refreshToken) {
        localStorage.setItem('refreshToken', refreshToken);
      }
      
      // 3. Lưu User (QUAN TRỌNG: userData từ API phải khớp với interface User)
      // Nếu API trả về thiếu trường (ví dụ thiếu createdAt), ta cần bổ sung để không lỗi TS
      const safeUser: User = {
        ...userData,
        // Fallback giá trị nếu API login chưa trả về đủ (phòng hờ)
        reputationScore: userData.reputationScore || 50,
        kycStatus: userData.kycStatus || 'PENDING',
        createdAt: userData.createdAt || new Date().toISOString(),
        updatedAt: userData.updatedAt || new Date().toISOString(),
      };

      localStorage.setItem('user', JSON.stringify(sanitizeUserForStorage(safeUser)));
      setUser(safeUser);

    } catch (error) {
      console.error("Login failed:", error);
      throw error;
    }
  };

  const logout = () => {
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
    localStorage.removeItem('user');
    setUser(null);
    // Có thể thêm điều hướng về trang chủ hoặc login tại đây nếu cần
    // window.location.href = '/login'; 
  };

  // Hàm cập nhật state user (ví dụ sau khi update ví thành công ở ProfilePage)
  const updateUser = (updatedUser: User) => {
    setUser(updatedUser);
    localStorage.setItem('user', JSON.stringify(sanitizeUserForStorage(updatedUser)));
  };

  return (
    <AuthContext.Provider value={{ user, isAuthenticated: !!user, isLoading, login, logout, updateUser }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within an AuthProvider');
  return context;
};
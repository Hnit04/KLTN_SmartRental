import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { authApi } from '@/api/authApi';
import { useAuth } from '@/context/AuthContext';

export const useLogin = () => {
  const { login: contextLogin } = useAuth();
  const navigate = useNavigate();

  // 1. State quản lý Form
  const [formData, setFormData] = useState({
    email: "",
    password: "",
  });
  const [showPassword, setShowPassword] = useState(false);

  // 2. State quản lý API
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // 3. Hàm xử lý thay đổi input
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData((prev) => ({
      ...prev,
      [e.target.name]: e.target.value,
    }));
    // Xóa lỗi khi người dùng bắt đầu gõ lại
    if (error) setError(null);
  };

  // 4. Hàm gọi API đăng nhập
  const loginUser = async () => {
    setIsLoading(true);
    setError(null);

    try {
      // [QUAN TRỌNG] Map email thành username để khớp với LoginPayload của API
      const payload = {
        username: formData.email, 
        password: formData.password
      };

      const response = await authApi.login(payload);
      contextLogin(response);

      // Redirect theo role
      const role = response.user.role;
      if (role === 'ADMIN') navigate('/admin/dashboard');
      else if (role === 'LANDLORD') navigate('/landlord/dashboard');
      else if (role === 'TENANT') navigate('/tenant/home'); // Hoặc '/'
      else navigate('/');
      
    } catch (err: any) {
      const message = err.response?.data?.message || 'Email hoặc mật khẩu không đúng';
      setError(message);
    } finally {
      setIsLoading(false);
    }
  };

  // 5. Hàm xử lý submit form
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate cơ bản
    if (!formData.email || !formData.password) {
      setError("Vui lòng điền đầy đủ thông tin");
      return;
    }

    await loginUser();
  };

  // 6. Trả về đúng object mà LoginForm đang cần
  return {
    formData,
    isLoading,
    error,
    showPassword,
    setShowPassword,
    handleChange,
    handleSubmit,
    loginUser,
  };
};
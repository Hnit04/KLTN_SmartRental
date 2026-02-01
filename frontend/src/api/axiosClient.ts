import axios from 'axios';
import type {
  AxiosError,
  AxiosInstance,
  InternalAxiosRequestConfig,
} from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

// Tạo instance axios
const axiosClient: AxiosInstance = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
    Accept: 'application/json',
  },
  timeout: 15000, // 15 giây timeout để tránh treo mãi
});

// Interceptor: Gắn token vào header trước khi gửi request
axiosClient.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    const token = localStorage.getItem('accessToken');

    if (token && config.headers) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    // Optional: Log request khi dev (dễ debug)
    if (import.meta.env.DEV) {
      console.log(`[API Request] ${config.method?.toUpperCase()} ${config.url}`);
    }

    return config;
  },
  (error) => Promise.reject(error)
);

// Interceptor: Xử lý response & lỗi chung
axiosClient.interceptors.response.use(
  (response) => {
    // Optional: Log response khi dev
    if (import.meta.env.DEV) {
      console.log(`[API Response] ${response.config.method?.toUpperCase()} ${response.config.url} → ${response.status}`);
    }
    return response;
  },
  async (error: AxiosError) => {
    const originalRequest = error.config as InternalAxiosRequestConfig & { _retry?: boolean };

    // Xử lý 401 Unauthorized → token hết hạn hoặc không hợp lệ
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true; // Tránh loop vô hạn

      try {
        // Nếu có cơ chế refresh token → implement ở đây
        // Ví dụ:
        // const refreshResponse = await refreshToken();
        // localStorage.setItem('accessToken', refreshResponse.data.accessToken);
        // originalRequest.headers.Authorization = `Bearer ${refreshResponse.data.accessToken}`;
        // return axiosClient(originalRequest); // retry request cũ

        // Hiện tại chưa có refresh → logout luôn
        handleLogout();
        return Promise.reject(error);
      } catch (refreshError) {
        handleLogout();
        return Promise.reject(refreshError);
      }
    }

    // Xử lý các lỗi khác (403, 500, network error...)
    if (error.response) {
      // Server trả về lỗi (4xx, 5xx)
      const message =
        (error.response.data as any)?.message ||
        (error.response.data as any)?.error ||
        `Lỗi ${error.response.status}: ${error.message}`;

      console.error(`API Error: ${message}`);
      // Có thể throw custom error hoặc dùng toast ở đây
    } else if (error.request) {
      // Không nhận được response (network error, CORS, timeout...)
      console.error('Network Error: Không kết nối được đến server');
    } else {
      console.error('Axios Error:', error.message);
    }

    return Promise.reject(error);
  }
);

// Hàm logout chung (xóa token + redirect nếu cần)
const handleLogout = () => {
  localStorage.removeItem('accessToken');
  // Nếu dùng AuthContext → gọi hàm logout từ context
  // Nếu có router → navigate('/login')
  window.location.href = '/login'; // Cách đơn giản nhất cho giai đoạn đầu
  // Sau này thay bằng useNavigate() hoặc context
};

export default axiosClient;
// src/lib/axiosClient.ts
import axios from "axios";
import type {
  AxiosError,
  AxiosInstance,
  InternalAxiosRequestConfig,
} from "axios";
import { toast } from "sonner";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

const axiosClient: AxiosInstance = axios.create({
  baseURL: API_BASE_URL,
  timeout: 60000,
  headers: {
    "Content-Type": "application/json",
    Accept: "application/json",
  },
});

/* ================= REQUEST ================= */
axiosClient.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    const token = localStorage.getItem("accessToken");

    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    return config;
  },
  (error) => Promise.reject(error)
);

/* ================= RESPONSE ================= */
axiosClient.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const status = error.response?.status;
    const data: any = error.response?.data;

    const message =
      data?.message ||
      data?.error ||
      error.message ||
      "Có lỗi xảy ra";

    /* ---- 401 ---- */
    if (status === 401) {
      toast.error("Phiên đăng nhập đã hết hạn");
      localStorage.removeItem("accessToken");
      setTimeout(() => {
        window.location.href = "/login";
      }, 1500);
      return Promise.reject(error);
    }

    /* ---- LỖI KHÁC ---- */
    toast.error(message);

    return Promise.reject(error);
  }
);

export default axiosClient;

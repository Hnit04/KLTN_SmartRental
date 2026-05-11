# SmartRental Frontend 🌐

Giao diện người dùng cho hệ thống Quản lý Thuê trọ Thông minh, được xây dựng bằng công nghệ hiện đại nhằm tối ưu trải nghiệm người dùng (UX) và hiệu năng.

## 🛠 Công nghệ sử dụng
- **Framework**: [React 19](https://react.dev/) + [Vite](https://vitejs.dev/)
- **Ngôn ngữ**: TypeScript
- **Quản lý trạng thái & Data Fetching**: [TanStack Query v5](https://tanstack.com/query/latest)
- **Styling**: [TailwindCSS](https://tailwindcss.com/) + [Framer Motion](https://www.framer.com/motion/) (Animation)
- **Thư viện UI**: [Lucide React](https://lucide.dev/) (Icons), [Shadcn UI](https://ui.shadcn.com/)
- **Bản đồ**: [Leaflet](https://leafletjs.com/)
- **Blockchain Interaction**: [Ethers.js v6](https://docs.ethers.org/v6/)
- **Xử lý Form**: React Hook Form + Zod

## 🚀 Khởi chạy dự án
### 1. Cài đặt dependencies
```bash
npm install
```

### 2. Cấu hình môi trường
Tạo file `.env` dựa trên `.env.example` và điền các tham số cần thiết (API URL, Google Client ID, v.v.)

### 3. Chạy ở chế độ Development
```bash
npm run dev
```

### 4. Build sản phẩm
```bash
npm run build
```

## 📂 Cấu trúc thư mục `src`
- `/assets`: Hình ảnh, font và các tài nguyên tĩnh.
- `/components`: Các component dùng chung (Button, Input, Layout...).
- `/features`: Các module tính năng (Auth, Contract, Property, AI...).
- `/hooks`: Các custom hooks.
- `/pages`: Các trang chính của ứng dụng.
- `/services`: Các hàm gọi API (Axios instances).
- `/types`: Định nghĩa các kiểu dữ liệu TypeScript.
- `/utils`: Các hàm tiện ích.

---
*Dự án thuộc Khóa luận tốt nghiệp của Trần Công Tính & Trần Ngọc Hưng.*

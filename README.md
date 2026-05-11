# SmartRental - Hệ thống Quản lý Thuê trọ Thông minh (Blockchain & AI)

Dự án Khóa luận tốt nghiệp xây dựng nền tảng kết nối chủ trọ và người thuê, tích hợp công nghệ Blockchain để minh bạch hóa hợp đồng và AI để phân tích dữ liệu.

---

## 👨‍🏫 Thông tin Đề tài
| Thành phần | Chi tiết |
| :--- | :--- |
| **Giảng viên hướng dẫn** | ThS. Đặng Thị Thu Hà |
| **Sinh viên thực hiện 1** | Trần Công Tính (22716181) |
| **Sinh viên thực hiện 2** | Trần Ngọc Hưng (22711231) |
| **Lớp** | DHKTPM18A |

---

## 🚀 Tính năng chính
- **Quản lý phòng trọ**: Đăng tin, tìm kiếm với bản đồ tương tác (Leaflet).
- **Hợp đồng điện tử**: Tích hợp Blockchain (Ethereum/Hardhat) để lưu trữ thông tin hợp đồng không thể thay đổi.
- **AI Analytics**: Phân tích thị trường và hỗ trợ người dùng bằng Gemini AI (LangChain4j).
- **Virtual Tour**: Xem phòng 360 độ với Pannellum.
- **Thông báo thời gian thực**: Sử dụng WebSocket (STOMP).
- **Crawler**: Tự động thu thập dữ liệu từ các trang web bất động sản lớn.

## 🛠 Tech Stack
### Backend
- **Core**: Java 21, Spring Boot 3.2.3
- **Database**: PostgreSQL, Hibernate Envers (Audit)
- **Security**: Spring Security, JWT, Google OAuth2
- **Blockchain**: Web3j, Hardhat, Solidity
- **AI**: LangChain4j (Gemini AI)
- **Crawler**: Jsoup

### Frontend
- **Framework**: React 19, Vite, TypeScript
- **Styling**: TailwindCSS, Framer Motion
- **State Management**: TanStack Query (React Query)
- **Map/360**: Leaflet, Pannellum

## 📂 Cấu trúc dự án
- `/backend`: Mã nguồn Spring Boot.
- `/frontend`: Mã nguồn React (Vite).
- `/contracts`: Các Smart Contracts (Solidity) và cấu hình Hardhat.

## 🛠 Cài đặt & Khởi chạy

### 1. Yêu cầu hệ thống
- Java 21
- Node.js (v18+)
- PostgreSQL

### 2. Chạy Backend
```bash
cd backend
mvn spring-boot:run
```

### 3. Chạy Frontend
```bash
cd frontend
npm install
npm run dev
```

### 4. Smart Contracts
```bash
npx hardhat node
npx hardhat run scripts/deploy.js --network localhost
```
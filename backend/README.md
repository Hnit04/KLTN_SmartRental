# SmartRental Backend ⚙️

Hệ thống xử lý nghiệp vụ (Core Logic) cho nền tảng SmartRental, cung cấp RESTful APIs, tích hợp Blockchain và các tác vụ AI.

## 🛠 Công nghệ sử dụng
- **Framework**: [Spring Boot 3.2.3](https://spring.io/projects/spring-boot)
- **Java Version**: 21
- **Quản lý dependencies**: Maven
- **Cơ sở dữ liệu**: PostgreSQL
- **Bảo mật**: Spring Security + JWT + Google OAuth2
- **Tích hợp Blockchain**: [Web3j](https://github.com/web3j/web3j)
- **AI Agent**: [LangChain4j](https://github.com/langchain4j/langchain4j) (Gemini AI)
- **Audit/Versioning**: Hibernate Envers
- **API Documentation**: [Swagger/OpenAPI 3](http://localhost:8080/swagger-ui/index.html)

## 🚀 Khởi chạy dự án
### 1. Yêu cầu
- JDK 21
- PostgreSQL (Cấu hình trong `application.yml` hoặc `.env`)

### 2. Cấu hình môi trường
Tạo file `.env` trong thư mục `backend/` và điền các thông tin:
- Database URL, Username, Password.
- Google Client ID (cho Login).
- Gemini API Key.
- Cloudinary Credentials (nếu có dùng upload ảnh).
- Private Key ví Blockchain.

### 3. Chạy ứng dụng
```bash
mvn spring-boot:run
```

## 📂 Cấu trúc Module (`src/main/java/iuh/se/kltn/backend/modules`)
- `ai`: Xử lý phân tích dữ liệu và chat bot hỗ trợ.
- `property`: Quản lý tin đăng, phòng trọ và crawler dữ liệu.
- `contract`: Quản lý hợp đồng điện tử và tương tác với Smart Contract.
- `interaction`: Các tính năng tương tác (Báo cáo, Hẹn lịch, Thông báo, Đánh giá).
- `user`: Quản lý tài khoản, phân quyền và hồ sơ người dùng.
- `subscription`: Hệ thống gói dịch vụ VIP.

---
*Dự án thuộc Khóa luận tốt nghiệp của Trần Công Tính & Trần Ngọc Hưng.*

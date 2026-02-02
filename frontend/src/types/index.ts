// User types
export type UserRole = "TENANT" | "LANDLORD" | "ADMIN";
export type KYCStatus = "PENDING" | "APPROVED" | "REJECTED";
export type RequestStatus = "PENDING" | "ACCEPTED" | "REJECTED";

export interface User {
  id: string | number; // Chấp nhận cả number (do backend trả number) và string
  email: string;
  username?: string;
  fullName: string;    // Frontend sẽ dùng chuẩn này
  phoneNumber?: string;
  dateOfBirth?: string;
  socialAddress?: string;
  currentAddress?: string;
  cccd?: string;
  avatar?: string;
  reputationScore?: number;
  role: UserRole;
  kycStatus: KYCStatus;
  createdAt?: string;  // [QUAN TRỌNG] Thêm ? vì API login có thể không trả về cái này
}

export interface Landlord extends User {
  businessLicenseUrl?: string;
}

export interface Tenant extends User {
  preference?: TenantPreference;
}

export interface TenantPreference {
  id: string;
  targetPriceMin?: number;
  targetPriceMax?: number;
  preferredLocation?: string;
  hasJob?: boolean;
  amenitiesRef?: string;
}

// Property types
export type RoomStatus = "AVAILABLE" | "RENTED" | "MAINTENANCE";

// src/types/property.ts

export interface Property {
  id: number;
  name: string;            // Map với Property.java: name
  address: string;         // Map với Property.java: address
  district: string;        // Map với Property.java: district
  city: string;            // Map với Property.java: city
  description: string;
  
  // Giá dịch vụ (Map với Property.java)
  elecPrice: number;       
  waterPrice: number;
  internetPrice: number;
  
  images: string[];        // Map với Property.java: images (List<String>)
  landlordName?: string;   
  
  // UI Fields (Backend chưa trả về, nhưng cần để hiển thị Card)
  minPrice?: number;       // Giá phòng thấp nhất trong khu
  maxPrice?: number;       // Giá phòng cao nhất trong khu
  totalRooms?: number;     // Tổng số phòng
  availableRooms?: number; // Số phòng còn trống
}

export interface Room {
  id: number;
  name: string;
  price: number;
  area: number;
  status: 'AVAILABLE' | 'RENTED' | 'MAINTENANCE';
  images: string[];
  amenities: string[];
}

// Contract types
export type ContractStatus = "PENDING_SIGNATURE" | "ACTIVE" | "EXPIRED" | "TERMINATED_EARLY";
export type DepositStatus = "UNPAID" | "DEPOSITED" | "REFUNDED";

export interface Contract {
  id: string;
  signDate?: string;
  startDate: string;
  actualEndDate?: string;
  depositAmount: number;
  content?: string;
  contractOwnerName: string;
  contractOwnerAddress: string;
  depositTrash?: string;
  depositStatus: DepositStatus;
  status: ContractStatus;
  roomId: string;
  members?: ContractMember[];
}

export interface ContractMember {
  id: string;
  fullName: string;
  cccdNumber: string;
  phoneNumber?: string;
  dateOfBirth?: string;
  contractDate: string;
  hometownPlace?: string;
  status: RequestStatus;
  leftDate?: string;
}

// Bill types
export type BillStatus = "UNPAID" | "PAID" | "LATE";

export interface Bill {
  id: string;
  oldElecIndex: number;
  newElecIndex: number;
  oldWaterIndex: number;
  newWaterIndex: number;
  totalAmount: number;
  extraChargeRate?: number;
  paymentTrash?: string;
  extraFee?: number;
  status: BillStatus;
  paidAt?: string;
  contractId: string;
}

// Appointment types
export type AppointmentStatus = "PENDING" | "CONFIRMED" | "CANCELLED";

export interface Appointment {
  id: string;
  name: string;
  address?: string;
  meetTime: string;
  role?: string;
  meetingLink?: string;
  status: AppointmentStatus;
  userId: string;
  propertyId: string;
}

// Notification types
export type NotificationType = "SYSTEM" | "PAYMENT_REMINDER" | "CONTRACT_UPDATE" | "NEW_REVIEW";

export interface Notification {
  id: string;
  title: string;
  message: string;
  type: NotificationType;
  referenceId?: string;
  isRead: boolean;
  createdAt: string;
}

// Review types
export interface Review {
  id: string;
  rating: number;
  content?: string;
  createdAt: string;
  userId: string;
  propertyId: string;
}

// API Response types
export interface ApiResponse<T> {
  data: T;
  message?: string;
  success: boolean;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}


export interface AuthResponse {
  accessToken: string;
  refreshToken?: string;          // optional nếu backend không luôn trả
  user: User;
}

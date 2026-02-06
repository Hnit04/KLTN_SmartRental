// src/types/index.ts

// ==========================================
// 1. USER & AUTH TYPES
// ==========================================

export type UserRole = "TENANT" | "LANDLORD" | "ADMIN";
export type KYCStatus = "PENDING" | "VERIFIED" | "REJECTED"; 

export interface User {
  id: number;
  username: string;
  email: string;
  fullName: string;
  role: UserRole;
  
  // Optional fields
  phoneNumber?: string;
  avatarUrl?: string;      
  walletAddress?: string;  
  cccdNumber?: string;     
  dateOfBirth?: string;    
  currentAddress?: string;
  
  // ✅ Giữ nguyên zaloPhone (Backend có)
  zaloPhone?: string;      
  
  // 🔥 BỔ SUNG 2 TRƯỜNG NÀY ĐỂ TRÁNH LỖI TS KHI UPDATE CONTEXT
  cccdFrontUrl?: string;   
  cccdBackUrl?: string;    
  
  // System fields
  reputationScore: number; 
  kycStatus: KYCStatus;
  createdAt: string;       
  updatedAt: string;       
}

export interface AuthResponse {
  accessToken: string;
  refreshToken?: string;
  user: User; 
}

// Interface cho API Login
export interface LoginRequest {
  username: string;
  password: string;
}

export interface RegisterRequest {
  username: string;
  password?: string;
  fullName: string;
  email: string;
  role: UserRole;
  walletAddress?: string;
}

// Khớp với UpdateProfileRequest.java
export interface UpdateProfileRequest {
  fullName?: string;
  phoneNumber?: string;
  zaloPhone?: string;     
  dateOfBirth?: string;   
  currentAddress?: string;
  cccdNumber?: string;
  avatarUrl?: string; 
}

// ==========================================
// 2. PROPERTY & ROOM TYPES
// ==========================================

export interface Property {
  id: number;
  name: string;
  address: string;
  district: string;
  city: string;
  description: string;
  elecPrice: number;
  waterPrice: number;
  internetPrice: number;
  images: string[];
  landlordId?: number;
  landlordName?: string;
  landlordPhone?: string;
  minPrice?: number;
  maxPrice?: number;
  totalRooms?: number;
  availableRooms?: number;
}

export type RoomStatus = "AVAILABLE" | "RENTED" | "MAINTENANCE";

export interface Room {
  id: number;
  name: string;
  price: number;
  area: number;
  status: RoomStatus;
  images: string[];
  amenities: string[]; 
  description?: string;
  propertyId: number;
}

// ==========================================
// 3. CONTRACT TYPES
// ==========================================

export type ContractStatus = "PENDING_SIGNATURE" | "ACTIVE" | "EXPIRED" | "TERMINATED_EARLY";
export type DepositStatus = "UNPAID" | "DEPOSITED" | "REFUNDED";

export interface Contract {
  id: number;
  code: string; 
  
  tenantId: number;
  landlordId: number;
  roomId: number;
  
  createdDate: string;
  startDate: string;
  endDate: string;
  actualEndDate?: string; 
  signDate?: string;      
  
  depositAmount: number;
  monthlyPrice: number;
  depositStatus: DepositStatus;
  
  status: ContractStatus;
  contentUrl?: string;    
}

// ==========================================
// 4. UTILITY TYPES (Bills, Notifications...)
// ==========================================

export type BillStatus = "UNPAID" | "PAID" | "OVERDUE";

export interface Bill {
  id: number;
  title: string;
  contractId: number; 
  oldElecIndex: number;
  newElecIndex: number;
  oldWaterIndex: number;
  newWaterIndex: number;
  totalAmount: number;
  serviceFee: number;
  status: BillStatus;
  deadline: string;
  paidAt?: string;
}

export type NotificationType = "SYSTEM" | "PAYMENT" | "CONTRACT";

export interface Notification {
  id: number;
  title: string;
  message: string;
  type: NotificationType;
  isRead: boolean;
  createdAt: string;
}

export interface ApiResponse<T> {
  success: boolean;
  message: string;
  data: T;
}

export interface PaginatedResponse<T> {
  content: T[];
  page: number;
  size: number;
  totalElements: number;
  totalPages: number;
  last: boolean;
}

export type LoginResponse = AuthResponse;

export interface TokenRefreshResponse {
  accessToken: string;
  refreshToken: string;
}
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
  
  // Zalo Phone
  zaloPhone?: string;      
  
  // KYC Images
  cccdFrontUrl?: string;   
  cccdBackUrl?: string;    
  
  // System fields
  reputationScore: number; 
  kycStatus: KYCStatus;
  createdAt: string;       
  updatedAt: string;       

  locked?: boolean;
  lockedAt?: string | null;
  lockUntil?: string | null;
  lockReason?: string | null;
}

export interface ResetPasswordRequest{
  email: string;
  code: string;
  newPassword: string;
}

export interface VerifyOtpRequest {
  email: string;
  code: string;
}

export interface UserHistory {
  id: number;
  fullName: string;
  email: string;
  phoneNumber: string;
  isLocked: boolean;
  lockUntil: string | null;     
  lockReason: string | null;
  modifiedBy: string;
  modifiedAt: string;    
  modifiedByFullName: string;       
  auditRemark: string | null;
}

export interface AuthResponse {
  accessToken: string;
  refreshToken?: string;
  user: User; 
}

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

export interface UpdateProfileRequest {
  fullName?: string;
  phoneNumber?: string;
  zaloPhone?: string;     
  dateOfBirth?: string;   
  currentAddress?: string;
  cccdNumber?: string;
  avatarUrl?: string; 
}

export interface TenantPreference {
  id: number;
  tenantId: number;
  targetPriceMin?: number;
  targetPriceMax?: number;
  preferredLocation?: string;
  hasPet?: boolean;
  amenitiesRef?: string;
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

  latitude?: number;
  longitude?: number;

  images: string[];
  landlordId?: number;
  landlordName?: string;
  landlordPhone?: string;
  minPrice?: number;
  maxPrice?: number;
  totalRooms?: number;
  availableRooms?: number;
}

export type RoomStatus = "AVAILABLE" | "RENTED" | "MAINTENANCE" | "RESERVED";

export type RoomType =
  | "STUDIO"
  | "ONE_BEDROOM"
  | "TWO_BEDROOM"
  | "SINGLE_ROOM"
  | "SHARED_ROOM"
  | "MEZZANINE_ROOM";

export interface Room {
  id: number;
  name: string;
  price: number;
  area: number;
  status: RoomStatus;

  // 🔥 Merge thêm
  type?: RoomType;
  hasMezzanine?: boolean;
  hasBalcony?: boolean;

  images: string[];
  amenities: string[]; 
  description?: string;
  propertyId: number;
  propertyName?: string;
  address?: string;      
  propertyAddress?: string;
  landlordName?: string; 
  elecPrice?: number;
  waterPrice?: number;
  internetPrice?: number;
  defaultTerms?: string;

  matchScore?: number;
  matchReason?: string;
}

// ==========================================
// 3. CONTRACT TYPES
// ==========================================

export type ContractStatus =
  | "PENDING_SIGNATURE"
  | "ACTIVE"
  | "EXPIRED"
  | "TERMINATED_EARLY";

export type DepositStatus = "UNPAID" | "DEPOSITED" | "REFUNDED";

export type ContractSignMethod = "TRADITIONAL" | "BLOCKCHAIN";

export interface Contract {
  id: number;
  code: string; 
  tenantId: number;
  landlordId: number;
  roomId: number;
  
  startDate: string;
  endDate: string;
  signDate?: string;
  
  actualPrice: number;
  depositAmount: number;
  additionalTerms?: string;

  // 🔥 Giữ version đầy đủ
  status: "PENDING_SIGNATURE" | "ACTIVE" | "EXPIRED" | "CANCELLED";

  signMethod: ContractSignMethod;
  
  // UI fields
  roomName?: string;
  propertyAddress?: string;
  tenantName?: string;
  landlordName?: string;
  isTenantSigned?: boolean;
  isLandlordSigned?: boolean;

  // Blockchain
  smartContractAddress?: string;
  deployTxHash?: string;
  contractHash?: string;
}

export interface CreateContractPayload {
  roomId: number | string;
  startDate: string;
  endDate: string;
  depositAmount?: number;
  additionalTerms?: string;
  tenantEmail?: string;
  signMethod?: string;
}

export interface SignContractPayload {
  signMethod: ContractSignMethod;
  signatureImage?: string;
}

// ==========================================
// 4. UTILITY TYPES
// ==========================================

export type NotificationType =
  | "SYSTEM"
  | "PAYMENT_REMINDER"
  | "CONTRACT_UPDATE"
  | "NEW_REVIEW";

export interface Notification {
  id: number;
  title: string;
  message: string;
  type: NotificationType;
  referenceId?: number;
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

// ==========================================
// 5. APPOINTMENT TYPES
// ==========================================

export type AppointmentStatus =
  | "PENDING"
  | "CONFIRMED"
  | "CANCELLED"
  | "COMPLETED";

export interface Appointment {
  id: number;
  tenantId: number;
  landlordId: number;
  roomId: number;
  roomName?: string;
  landlordName?: string;
  tenantName?: string;
  meetTime: string;      
  status: AppointmentStatus;
  note?: string;
  meetingLink?: string;
  createdAt: string;
}

export interface CreateAppointmentRequest {
  roomId: number;
  meetTime: string;
  meetingLink?: string;
  note?: string;
}

export interface UpdateAppointmentStatusRequest {
  status: AppointmentStatus;
}

export interface AppointmentResponse {
  id: number;
  roomId: number;
  roomName: string;
  landlordId: number;
  landlordFullName: string;
  tenantId: number;
  tenantFullName: string;
  tenantPhone: string;
  meetTime: string; 
  status: 'PENDING' | 'CONFIRMED' | 'APPROVED' | 'REJECTED' | 'CANCELLED' | 'COMPLETED';
  note: string;
  meetingLink?: string;
  createdAt: string;
}

// ==========================================
// 6. BILLING & FINANCE TYPES
// ==========================================

export type BillStatus = "UNBILLED" | "PENDING" | "PAID" | "LATE";

export interface ContractBilling {
  id: number;
  roomName: string;
  tenantName: string;
  actualPrice: number;
  elecPrice: number;
  waterPrice: number;
  internetPrice: number;
  billStatus: BillStatus; 
  oldElecIndex: number;
  oldWaterIndex: number;
  totalAmount?: number;
  deadline?: string;
  paymentMethod?: string;
  newElecIndex?: number;
  newWaterIndex?: number;
  additionalFee?: number;
  discountAmount?: number;
  note?: string;
}

export interface Bill {
  id: number;
  roomName: string;
  month: number;
  year: number;
  totalAmount: number;
  elecCost: number;
  waterCost: number;
  roomCost: number;
  status: BillStatus;
  deadline: string;
  paymentTxHash?: string;
}

export interface RevenueChartData {
  name: string; 
  total: number; 
}

// ==========================================
// 7. REVIEW & REQUEST
// ==========================================

export interface ReviewResponse {
  id: number;
  contractId: number;
  roomName: string;
  reviewerId: number;
  reviewerName: string;
  reviewerAvatar: string | null;
  rating: number;
  comment: string;
  createdAt: string;
}

export interface ReviewRequest {
  contractId: number;
  rating: number;
  comment: string;
}

export type RequestType =
  | "RENT_INCREASE"
  | "EXTENSION"
  | "TERMINATION"
  | "CHANGE_TERMS"
  | "CHANGE_SIGN_METHOD";

export type RequestStatus = "PENDING" | "ACCEPTED" | "REJECTED";

export interface ContractChangeRequest {
  id: number;
  contractId: number;
  type: RequestType;
  oldValue: string;
  newValue: string;
  reason: string;
  status: RequestStatus;
  requestDate: string;
  requestedByRole?: string;
}

export interface ChangeRequestDTO {
  type: RequestType;
  newValue: string;
  reason: string;
}
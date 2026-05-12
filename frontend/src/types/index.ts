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
  kycStatus: 'PENDING' | 'VERIFIED' | 'REJECTED' | 'NONE' | string;
  kycAttempts?: number;
  kycNote?: string;
  createdAt: string;
  updatedAt: string;

  locked?: boolean;
  lockedAt?: string | null;
  lockUntil?: string | null;
  lockReason?: string[] | null;
  // Bank info
  bankName?: string;
  bankAccountNumber?: string;
  bankAccountHolder?: string;
  bankQrUrl?: string;
}

export interface ResetPasswordRequest {
  email: string;
  code?: string;
  newPassword: string;
}
export interface GoogleLoginRequest {
  idToken: string;
  email?: string;
  name?: string;
  picture?: string;
  googleId?: string;
}

export interface ChangePasswordRequest {
  oldPassword: string;
  newPassword: string;
  confirmNewPassword: string;
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
  bankName?: string;
  bankAccountNumber?: string;
  bankAccountHolder?: string;
  bankQrUrl?: string;
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
  landlordAvatar?: string;
  landlordEmail?: string;
  landlordZalo?: string;
  landlordReputationScore?: number;
  minPrice?: number;
  maxPrice?: number;
  totalRooms?: number;
  availableRooms?: number;
  status?: "PENDING" | "APPROVED" | "REJECTED" | "HIDDEN";
  safetyScore?: number;
  moderationReason?: string;
}

export type RoomStatus = "AVAILABLE" | "RENTED" | "MAINTENANCE" | "RESERVED" | "HIDDEN";
export type RoomType = "STUDIO" | "ONE_BEDROOM" | "TWO_BEDROOM" | "SINGLE_ROOM" | "SHARED_ROOM" | "MEZZANINE_ROOM";

export interface Room {
  id: number;
  name: string;
  price: number;
  area: number;
  status: RoomStatus;
  type?: RoomType;
  hasMezzanine?: boolean;
  hasBalcony?: boolean;
  images: string[];
  panoramaImages?: string[];
  amenities: string[];
  description?: string;
  propertyId: number;
  propertyName?: string;
  address?: string;
  propertyAddress?: string;
  maxOccupants?: number | null;
  landlordName?: string;
  elecPrice?: number;
  waterPrice?: number;
  internetPrice?: number;
  defaultTerms?: string;
  matchScore?: number; // AI match score
  matchReason?: string; // Reason for AI match
  approvalStatus?: "PENDING" | "APPROVED" | "REJECTED";
  safetyScore?: number;
  moderationReason?: string;
  availableFromDate?: string;
}

// ==========================================
// 3. CONTRACT TYPES
// ==========================================

export type ContractStatus = "PENDING_SIGNATURE" | "ACTIVE" | "EXPIRED" | "TERMINATED_EARLY" | "CANCELLED" | "AWAITING_DEPOSIT";
export type DepositStatus = "UNPAID" | "DEPOSITED" | "REFUNDED" | "PENALIZED";

// ✅ 1. Thêm Enum phương thức ký
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

  actualPrice: number;   // Khớp với Backend Contract.java
  depositAmount: number;
  additionalTerms?: string;
  status: ContractStatus;
  depositStatus?: DepositStatus;
  signMethod: "TRADITIONAL" | "BLOCKCHAIN";

  // Các trường Flattened để hiển thị UI
  roomName?: string;
  propertyAddress?: string;
  tenantName?: string;
  landlordName?: string;
  isTenantSigned?: boolean;
  isLandlordSigned?: boolean;
  // Utility prices (from Property via ContractResponse)
  elecPrice?: number;
  waterPrice?: number;
  internetPrice?: number;
  maxOccupants?: number;
  // Blockchain fields
  smartContractAddress?: string;
  deployTxHash?: string;
  contractHash?: string;
  userRole?: string; // Vai trò của người xem: "CHỦ PHÒNG" hoặc "THÀNH VIÊN"
  tenantReputationScore?: number;
  tenantKycStatus?: string;
  cancelReason?: string;
  isCompromised?: boolean;

  // Blockchain Settlement Info
  currentDeductionAmount?: number;
  isEarlyTerminationProposal?: boolean;
  hasLandlordConsented?: boolean;
  hasTenantConsented?: boolean;
  isProposalActive?: boolean;
}

// Payload để tạo hợp đồng
export interface CreateContractPayload {
  roomId: number | string;
  startDate: string;
  endDate: string;           // Dùng endDate thay cho duration
  depositAmount?: number;    // Thêm tiền cọc
  additionalTerms?: string;  // Thêm điều khoản
  tenantEmail?: string;      // Thêm email khách
  signMethod?: string;       // Thêm phương thức ký
}

// ✅ 4. Payload để Ký hợp đồng
export interface SignContractPayload {
  signMethod: ContractSignMethod;
  signatureImage?: string; // Optional (cho truyền thống nếu cần sau này)
  signature?: string;      // Blockchain signature (Web3)
}

// ==========================================
// 4. UTILITY TYPES (Bills, Notifications...)
// ==========================================

export type NotificationType = "SYSTEM" | "PAYMENT_REMINDER" | "CONTRACT_UPDATE" | "NEW_REVIEW";
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
// 5. APPOINTMENT TYPES (Lịch hẹn xem phòng)
// ==========================================

export type AppointmentStatus = "PENDING" | "CONFIRMED" | "CANCELLED" | "COMPLETED";

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
  meetingLink?: string

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
  landlordFullName: string; // ✅ Đổi từ landlordName thành landlordFullName
  tenantId: number;
  tenantFullName: string;   // ✅ Đổi từ tenantName thành tenantFullName
  tenantPhone: string;
  meetTime: string;
  status: 'PENDING' | 'CONFIRMED' | 'APPROVED' | 'REJECTED' | 'CANCELLED' | 'COMPLETED'; // ✅ Thêm APPROVED
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
  billId?: number;
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
  elecMeterImageUrl?: string;
  waterMeterImageUrl?: string;
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
// --- REVIEW TYPES ---
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
export type RequestType = "RENT_INCREASE" | "EXTENSION" | "TERMINATION" | "CHANGE_TERMS" | "CHANGE_SIGN_METHOD";
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
  expiryDate?: string;
  requestedByRole?: string;
}

export interface ChangeRequestDTO {
  type: RequestType;
  newValue: string;
  reason: string;
}

// ✅ NEW: Roommate / Resident Types
export interface ResidentRequestResponse {
  id: number;
  contractId: number;
  status: "PENDING" | "ACCEPTED" | "APPROVED" | "REJECTED";
  type: "ADD" | "REMOVE";
  message?: string;
  createdAt: string;

  inviteeId: number;
  inviteeName: string;
  inviteeEmail: string;
  inviteePhone?: string;
  inviteeZaloPhone?: string;
  inviteeAvatar?: string;
  inviteeReputationScore: number;
  inviteeKycStatus?: string;
  inviteeCurrentAddress?: string;
  inviteeDateOfBirth?: string;

  requesterId: number;
  requesterName: string;
}

export interface ContractMemberResponse {
  id: number;
  userId: number;
  fullName: string;
  email: string;
  avatarUrl?: string;
  reputationScore: number;
  joinedDate: string;
}


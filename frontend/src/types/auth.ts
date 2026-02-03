// Enum cho Role
export type UserRole = 'ADMIN' | 'LANDLORD' | 'TENANT';

// Enum cho KYC Status
export type KYCStatus = 'PENDING' | 'VERIFIED' | 'REJECTED' | 'NOT_VERIFIED';

// 1. Register Request
export interface RegisterRequest {
  username: string;
  password: string;
  fullName?: string;
  email?: string;
  walletAddress?: string;
  role: UserRole;
}

// 2. Login Request
export interface LoginRequest {
  username: string;
  password: string;
}

// 3. Login Response
export interface LoginResponse {
  accessToken: string;
  refreshToken: string;
  id: number;
  username: string;
  email: string;
  role: UserRole;
  fullName: string;
}

// 4. Token Refresh Request
export interface TokenRefreshRequest {
  refreshToken: string;
}

// 5. Token Refresh Response
export interface TokenRefreshResponse {
  accessToken: string;
  refreshToken: string;
  tokenType: string;
}

// 6. User Model (Full info)
export interface User {
  id: number;
  username: string;
  fullName: string;
  email: string;
  phoneNumber?: string;
  walletAddress?: string;
  avatarUrl?: string;
  role: UserRole;
  kycStatus: KYCStatus;
  reputationScore: number;
  businessLicenseUrl?: string;
}
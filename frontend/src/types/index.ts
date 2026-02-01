export interface ContractResponse {
    id: number;
    roomName: string;
    tenantName: string;
    landlordName: string;
    startDate: string;
    endDate: string;
    price: number;
    status: 'PENDING_SIGNATURE' | 'ACTIVE' | 'EXPIRED';
    signMethod: 'BLOCKCHAIN' | 'TRADITIONAL';
}

export interface LoginResponse {
    accessToken: string;
    tokenType: string;
    role: 'LANDLORD' | 'TENANT' | 'ADMIN';
}